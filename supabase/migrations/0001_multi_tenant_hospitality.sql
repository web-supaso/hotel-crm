-- ============================================================================
-- HOTEL & EXPERIENCIAS CRM - MIGRACIÓN DEFINITIVA MULTI-TENANT
-- Schema: 0001_multi_tenant_hospitality.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- Otorgar permisos globales al esquema público
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;

-- ============================================================================
-- 0. LIMPIEZA AUTOMÁTICA DE TABLAS Y TIPOS ANTERIORES (RESET SEGURO)
-- ============================================================================

-- Eliminar tablas anteriores si existen (en orden de dependencias)
drop table if exists public.payments cascade;
drop table if exists public.reservation_items cascade;
drop table if exists public.reservations cascade;
drop table if exists public.interactions cascade;
drop table if exists public.score_snapshots cascade;
drop table if exists public.leads cascade;
drop table if exists public.pricing_rules cascade;
drop table if exists public.discard_reasons cascade;
drop table if exists public.experiences_catalog cascade;
drop table if exists public.units cascade;
drop table if exists public.properties cascade;
drop table if exists public.organization_members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.organizations cascade;
drop table if exists public.config cascade;

-- Eliminar tipos ENUM anteriores
drop type if exists public.org_role cascade;
drop type if exists public.property_type cascade;
drop type if exists public.unit_type cascade;
drop type if exists public.lead_status cascade;
drop type if exists public.reservation_status cascade;
drop type if exists public.item_type cascade;
drop type if exists public.payment_type cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.interaction_type cascade;
drop type if exists public.interaction_direction cascade;

-- ============================================================================
-- 1. TIPOS ENUM DEFINITIVOS
-- ============================================================================
create type public.org_role as enum ('owner', 'manager', 'sales', 'reception');
create type public.property_type as enum ('hotel', 'glamping_refugio', 'villa', 'otro');
create type public.unit_type as enum ('room', 'tent', 'cabin', 'dome', 'suite', 'other');
create type public.lead_status as enum ('nuevo', 'contactado', 'propuesta_enviada', 'negociacion', 'convertido', 'descartado');
create type public.reservation_status as enum ('pendiente_pago', 'senada', 'confirmada', 'in_house', 'checkout', 'completada', 'cancelada');
create type public.item_type as enum ('unit', 'experience', 'addon');
create type public.payment_type as enum ('deposit_sena', 'balance_saldo', 'extra_service', 'refund_reembolso');
create type public.payment_method as enum ('cash', 'bank_transfer', 'credit_card', 'mercadopago', 'stripe', 'other');
create type public.interaction_type as enum ('whatsapp_out', 'call', 'email', 'note', 'status_change', 'ai_analysis');

-- ============================================================================
-- 2. CAPA MULTI-TENANCY & USUARIOS
-- ============================================================================

-- Organizaciones (Tenants)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  base_currency text not null default 'ARS',
  api_inbound_key text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfiles de Usuario (se sincroniza con auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membresías en Organizaciones (RBAC)
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'sales',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_org_members_user on public.organization_members (user_id);
create index idx_org_members_org on public.organization_members (organization_id);

-- Trigger para auto-crear Profile al registrarse en Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, is_superadmin)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Usuario Admin'), new.email, true)
  on conflict (id) do update set email = excluded.email;

  -- Asociar automáticamente a las organizaciones iniciales como owner
  insert into public.organization_members (organization_id, user_id, role)
  select id, new.id, 'owner'::public.org_role from public.organizations
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. CAPA DE INVENTARIO Y PROPIEDADES
-- ============================================================================

-- Propiedades / Sedes Físicas
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  property_type public.property_type not null default 'hotel',
  city text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_org on public.properties (organization_id);

-- Unidades de Alojamiento (Habitaciones, Carpas, Cabañas)
create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  unit_type public.unit_type not null default 'room',
  capacity_people integer not null default 2,
  base_price_default numeric(12, 2) not null default 0,
  currency text not null default 'ARS',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_units_property on public.units (property_id);

-- Catálogo de Experiencias y Paquetes
create table public.experiences_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  base_price numeric(12, 2) not null default 0,
  currency text not null default 'ARS',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_exp_org on public.experiences_catalog (organization_id);

-- Tarifas Dinámicas y Temporadas
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  unit_id uuid references public.units (id) on delete cascade,
  experience_id uuid references public.experiences_catalog (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  days_of_week integer[] default null, -- [5, 6] para viernes/sábado
  price_per_night numeric(12, 2) not null,
  currency text not null default 'ARS',
  min_stay_nights integer default 1,
  created_at timestamptz not null default now()
);

create index idx_pricing_lookup on public.pricing_rules (organization_id, property_id, unit_id, start_date, end_date);

-- ============================================================================
-- 4. CAPA DE DESCARTE Y ANALÍTICA (14 MOTIVOS)
-- ============================================================================

create table public.discard_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index idx_discard_org on public.discard_reasons (organization_id);

-- ============================================================================
-- 5. CAPA COMERCIAL (LEADS)
-- ============================================================================

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  
  -- Datos de contacto
  guest_name text not null,
  guest_email text,
  guest_phone text not null,
  guest_country text default 'AR',
  
  -- Requerimientos de estancia
  requested_check_in date,
  requested_check_out date,
  guests_count integer default 2,
  pets_count integer default 0,
  experience_level text, -- 'Esencia', 'Conexión'
  dietary_notes text,
  special_requests text,
  
  -- Estado y clasificación
  status public.lead_status not null default 'nuevo',
  source text default 'web_form', -- 'web_form', 'whatsapp_inbound', 'referral', 'ota', 'manual'
  estimated_budget numeric(12, 2),
  
  -- Descarte
  discard_reason_id uuid references public.discard_reasons (id) on delete set null,
  discard_notes text,
  
  -- IA Insights (Gemini)
  ai_intent_score integer,
  ai_urgency text,
  ai_summary text,
  ai_suggested_reply text,
  ai_evaluated_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_org_status on public.leads (organization_id, status, created_at desc);
create index idx_leads_phone on public.leads (guest_phone);

-- ============================================================================
-- 6. CAPA OPERATIVA (RESERVAS & PAGOS)
-- ============================================================================

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete restrict,
  lead_id uuid references public.leads (id) on delete set null,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  
  reservation_code text unique not null,
  
  -- Snapshot de datos del huésped
  guest_name text not null,
  guest_email text,
  guest_phone text not null,
  dietary_notes text,
  special_requests text,
  pets_count integer default 0,
  
  -- Fechas de estancia
  check_in_date date not null,
  check_out_date date not null,
  
  -- Estado operativo
  status public.reservation_status not null default 'pendiente_pago',
  
  -- Montos financieros
  total_price numeric(12, 2) not null default 0,
  deposit_required numeric(12, 2) not null default 0,
  deposit_paid numeric(12, 2) not null default 0,
  total_paid numeric(12, 2) not null default 0,
  balance_pending numeric(12, 2) not null default 0,
  currency text not null default 'ARS',
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint chk_reservation_dates check (check_out_date > check_in_date)
);

create index idx_reservations_org_prop on public.reservations (organization_id, property_id, check_in_date, check_out_date);
create index idx_reservations_status on public.reservations (status);

-- Items de Reserva (Asignación de Unidades y Experiencias)
create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  item_type public.item_type not null default 'unit',
  unit_id uuid references public.units (id) on delete restrict,
  experience_id uuid references public.experiences_catalog (id) on delete restrict,
  name text not null,
  start_date date,
  end_date date,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0
);

create index idx_res_items_unit_dates on public.reservation_items (unit_id, start_date, end_date);
create index idx_res_items_res on public.reservation_items (reservation_id);

-- Transacciones de Pago
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  registered_by_user_id uuid references public.profiles (id) on delete set null,
  
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  payment_type public.payment_type not null default 'deposit_sena',
  payment_method public.payment_method not null default 'bank_transfer',
  transaction_reference text,
  proof_receipt_url text,
  notes text,
  
  created_at timestamptz not null default now()
);

create index idx_payments_res on public.payments (reservation_id);

-- ============================================================================
-- 7. AUDITORÍA & TIMELINE DE INTERACCIONES
-- ============================================================================

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  type public.interaction_type not null default 'note',
  summary text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_interactions_lead on public.interactions (lead_id, created_at desc);
create index idx_interactions_res on public.interactions (reservation_id, created_at desc);

-- ============================================================================
-- 8. FUNCIONES Y TRIGGERS DE NEGOCIO
-- ============================================================================

-- A. Función para validar disponibilidad anti-solapamiento
create or replace function public.check_unit_available(
  p_unit_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_reservation_id uuid default null
) returns boolean as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.reservation_items ri
  join public.reservations r on r.id = ri.reservation_id
  where ri.unit_id = p_unit_id
    and r.status in ('senada', 'confirmada', 'in_house')
    and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id)
    and (
      (ri.start_date < p_end_date and ri.end_date > p_start_date)
    );
  
  return (v_count = 0);
end;
$$ language plpgsql;

-- B. Trigger de Pagos: Recalcula saldos y actualiza estado de reserva automáticamente
create or replace function public.sync_reservation_financials() returns trigger as $$
declare
  v_res_id uuid;
  v_total_paid numeric(12,2);
  v_deposit_paid numeric(12,2);
  v_total_price numeric(12,2);
  v_deposit_required numeric(12,2);
  v_current_status public.reservation_status;
  v_new_status public.reservation_status;
begin
  if tg_op = 'DELETE' then
    v_res_id := old.reservation_id;
  else
    v_res_id := new.reservation_id;
  end if;

  select 
    coalesce(sum(case when payment_type <> 'refund_reembolso' then amount else -amount end), 0),
    coalesce(sum(case when payment_type = 'deposit_sena' then amount else 0 end), 0)
  into v_total_paid, v_deposit_paid
  from public.payments
  where reservation_id = v_res_id;

  select total_price, deposit_required, status 
  into v_total_price, v_deposit_required, v_current_status
  from public.reservations
  where id = v_res_id;

  v_new_status := v_current_status;
  if v_current_status = 'pendiente_pago' and v_total_paid > 0 then
    v_new_status := 'senada';
  end if;

  update public.reservations
  set 
    total_paid = v_total_paid,
    deposit_paid = v_deposit_paid,
    balance_pending = (v_total_price - v_total_paid),
    status = v_new_status,
    updated_at = now()
  where id = v_res_id;

  return null;
end;
$$ language plpgsql;

create trigger trg_sync_payments
  after insert or update or delete on public.payments
  for each row execute function public.sync_reservation_financials();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) MULTI-TENANT & PRIVILEGIOS
-- ============================================================================

-- Otorgar permisos globales a roles de Supabase
grant all on all tables in schema public to postgres, service_role, authenticated, anon;
grant all on all sequences in schema public to postgres, service_role, authenticated, anon;
grant all on all routines in schema public to postgres, service_role, authenticated, anon;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.experiences_catalog enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.discard_reasons enable row level security;
alter table public.leads enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.payments enable row level security;
alter table public.interactions enable row level security;

-- Helper: verifica si el usuario autenticado pertenece a la organización o es superadmin
create or replace function public.is_member_or_superadmin(p_org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.profiles
    where id = auth.uid() and is_superadmin = true
  );
end;
$$ language plpgsql security definer;

-- Políticas de Seguridad
create policy "org_access" on public.organizations
  for all to authenticated
  using (public.is_member_or_superadmin(id));

create policy "profile_access" on public.profiles
  for all to authenticated
  using (id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_superadmin = true));

create policy "members_access" on public.organization_members
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "properties_access" on public.properties
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "units_access" on public.units
  for all to authenticated
  using (exists (
    select 1 from public.properties p 
    where p.id = units.property_id and public.is_member_or_superadmin(p.organization_id)
  ));

create policy "experiences_access" on public.experiences_catalog
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "pricing_access" on public.pricing_rules
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "discard_access" on public.discard_reasons
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "leads_access" on public.leads
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "reservations_access" on public.reservations
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "reservation_items_access" on public.reservation_items
  for all to authenticated
  using (exists (
    select 1 from public.reservations r 
    where r.id = reservation_items.reservation_id and public.is_member_or_superadmin(r.organization_id)
  ));

create policy "payments_access" on public.payments
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

create policy "interactions_access" on public.interactions
  for all to authenticated
  using (public.is_member_or_superadmin(organization_id));

-- ============================================================================
-- 10. SEED DATA INICIAL
-- ============================================================================

-- Organizaciones
insert into public.organizations (id, name, slug, base_currency, api_inbound_key) values
  ('11111111-0000-0000-0000-000000000001', 'Hoteles Piazza & Montecarlo', 'piazza-montecarlo', 'ARS', 'key_piazza_monte_2026_sec'),
  ('22222222-0000-0000-0000-000000000002', 'Experiencias con Estilo', 'experiencias-con-estilo', 'ARS', 'key_experiencias_2026_sec');

-- 14 Motivos de Descarte Estandarizados para cada Organización
insert into public.discard_reasons (organization_id, code, label) values
  -- Org 1 (Piazza & Montecarlo)
  ('11111111-0000-0000-0000-000000000001', 'spam', 'Bot / Spam'),
  ('11111111-0000-0000-0000-000000000001', 'cambio_destino', 'Cambio de destino'),
  ('11111111-0000-0000-0000-000000000001', 'cancelacion_viaje', 'Cancelación de viaje'),
  ('11111111-0000-0000-0000-000000000001', 'competidor', 'Compró en otro lado'),
  ('11111111-0000-0000-0000-000000000001', 'sin_disponibilidad', 'Disponibilidad / Sin cupo'),
  ('11111111-0000-0000-0000-000000000001', 'estadia_minima', 'Estadía mínima no cumplida'),
  ('11111111-0000-0000-0000-000000000001', 'fecha_expirada', 'Fecha expirada'),
  ('11111111-0000-0000-0000-000000000001', 'mal_atendido', 'Mal atendido / Demora'),
  ('11111111-0000-0000-0000-000000000001', 'motivos_personales', 'Motivos personales'),
  ('11111111-0000-0000-0000-000000000001', 'no_acepta_mascotas', 'No acepta mascotas'),
  ('11111111-0000-0000-0000-000000000001', 'numero_erroneo', 'Número erróneo'),
  ('11111111-0000-0000-0000-000000000001', 'precio', 'Precio / Fuera de presupuesto'),
  ('11111111-0000-0000-0000-000000000001', 'sin_respuesta', 'Sin respuesta / Ghosting'),
  ('11111111-0000-0000-0000-000000000001', 'otro', 'Otro'),
  -- Org 2 (Experiencias con Estilo)
  ('22222222-0000-0000-0000-000000000002', 'spam', 'Bot / Spam'),
  ('22222222-0000-0000-0000-000000000002', 'cambio_destino', 'Cambio de destino'),
  ('22222222-0000-0000-0000-000000000002', 'cancelacion_viaje', 'Cancelación de viaje'),
  ('22222222-0000-0000-0000-000000000002', 'competidor', 'Compró en otro lado'),
  ('22222222-0000-0000-0000-000000000002', 'sin_disponibilidad', 'Disponibilidad / Sin cupo'),
  ('22222222-0000-0000-0000-000000000002', 'estadia_minima', 'Estadía mínima no cumplida'),
  ('22222222-0000-0000-0000-000000000002', 'fecha_expirada', 'Fecha expirada'),
  ('22222222-0000-0000-0000-000000000002', 'mal_atendido', 'Mal atendido / Demora'),
  ('22222222-0000-0000-0000-000000000002', 'motivos_personales', 'Motivos personales'),
  ('22222222-0000-0000-0000-000000000002', 'no_acepta_mascotas', 'No acepta mascotas'),
  ('22222222-0000-0000-0000-000000000002', 'numero_erroneo', 'Número erróneo'),
  ('22222222-0000-0000-0000-000000000002', 'precio', 'Precio / Fuera de presupuesto'),
  ('22222222-0000-0000-0000-000000000002', 'sin_respuesta', 'Sin respuesta / Ghosting'),
  ('22222222-0000-0000-0000-000000000002', 'otro', 'Otro');

-- Propiedades
insert into public.properties (id, organization_id, name, property_type, city) values
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Hotel Piazza', 'hotel', 'Villa Carlos Paz'),
  ('aaaa0002-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Hotel Montecarlo', 'hotel', 'Villa Carlos Paz'),
  ('bbbb0001-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Refugio Canigó', 'glamping_refugio', 'Cuesta Blanca'),
  ('bbbb0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Refugio Gibraltar', 'glamping_refugio', 'Tanti');

-- Unidades
insert into public.units (property_id, name, unit_type, capacity_people, base_price_default) values
  ('aaaa0001-0000-0000-0000-000000000001', 'Habitación 101 (Standard)', 'room', 2, 75000),
  ('aaaa0001-0000-0000-0000-000000000001', 'Habitación 102 (Superior)', 'room', 3, 95000),
  ('aaaa0002-0000-0000-0000-000000000002', 'Habitación 201 (Doble)', 'room', 2, 80000),
  ('bbbb0001-0000-0000-0000-000000000001', 'Carpa Cascada 1 (Glamping VIP)', 'tent', 2, 140000),
  ('bbbb0001-0000-0000-0000-000000000001', 'Carpa Cascada 2 (Glamping VIP)', 'tent', 2, 140000),
  ('bbbb0001-0000-0000-0000-000000000001', 'Cabaña Bosque A', 'cabin', 4, 190000),
  ('bbbb0002-0000-0000-0000-000000000002', 'Cabaña Gibraltar 1', 'cabin', 4, 180000);

-- Catálogo de Experiencias
insert into public.experiences_catalog (organization_id, name, description, base_price) values
  ('22222222-0000-0000-0000-000000000002', 'Eclipse 2026 Retreat', 'Pase especial con astrónomo y cena a la luz de las velas', 65000),
  ('22222222-0000-0000-0000-000000000002', 'Spa Day & Conexión', 'Circuito de aguas y masajes en la naturaleza', 45000),
  ('11111111-0000-0000-0000-000000000001', 'Media Pensión Gastronómica', 'Desayuno buffet y cena de 3 pasos', 22000);

-- Sincronizar usuarios existentes en auth.users a profiles
insert into public.profiles (id, full_name, email, is_superadmin)
select id, coalesce(raw_user_meta_data->>'full_name', 'Hugo Admin'), email, true
from auth.users
on conflict (id) do update set email = excluded.email;

-- Asociar usuarios existentes como owner
insert into public.organization_members (organization_id, user_id, role)
select o.id, u.id, 'owner'::public.org_role
from public.organizations o
cross join auth.users u
on conflict do nothing;
