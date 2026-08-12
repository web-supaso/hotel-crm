-- Hotel CRM - Schema inicial
-- Necesario: Supabase dashboard > SQL Editor > ejecutar este archivo (o `supabase db push`).

create extension if not exists "pgcrypto";

-- Tipos
create type public.lead_status as enum ('hot', 'warm', 'cold', 'unknown', 'closed_won', 'closed_lost');
create type public.interaction_type as enum ('call', 'email', 'meeting', 'site_visit', 'rfp', 'proposal', 'contract', 'other');
create type public.interaction_direction as enum ('inbound', 'outbound');

-- =============================
-- LEADS
-- =============================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  company_segment text,
  company_size text,
  source text,                       -- referral, website, events, inbound, etc.
  deal_value_estimate numeric(12,2),
  status public.lead_status default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_created_at_idx on public.leads (created_at desc);

-- =============================
-- INTERACTIONS
-- =============================
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type public.interaction_type not null default 'call',
  direction public.interaction_direction not null default 'outbound',
  summary text,
  contact_name text,                 -- stakeholder engaged
  contact_role text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index interactions_lead_idx on public.interactions (lead_id, occurred_at desc);

-- =============================
-- SCORE SNAPSHOTS (salida del LLM)
-- =============================
create table public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  classification public.lead_status not null,
  overall_score integer not null check (overall_score between 0 and 100),
  dimension_scores jsonb not null,          -- {intent, engagement, icp_fit, committee}
  risk_penalty integer not null default 0,
  confidence integer check (confidence between 0 and 100),
  predicted_close_probability integer check (predicted_close_probability between 0 and 100),
  estimated_close_days integer,
  estimated_deal_value_signal text,
  priority_level text,
  next_best_action text,
  follow_up_days integer,
  reasoning text,
  key_signals text[] default '{}',
  data_gaps text[] default '{}',
  escalate_to_manager boolean not null default false,
  ground_truth boolean,               -- true=cerrado ganado, false=perdido (lo marca el vendedor)
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);

create index score_snapshots_lead_idx on public.score_snapshots (lead_id, created_at desc);
create index score_snapshots_truth_idx on public.score_snapshots (ground_truth) where ground_truth is not null;

-- =============================
-- CONFIG (key-value)
-- =============================
create table public.config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- =============================
-- TRIGGERS
-- =============================
create function public.touch_lead() returns trigger as $$
begin
  update public.leads set updated_at = now() where id = new.lead_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_lead
  after insert on public.interactions
  for each row execute function public.touch_lead();

create trigger trg_touch_lead_snap
  after insert on public.score_snapshots
  for each row execute function public.touch_lead();

-- =============================
-- RLS: single-admin por defecto.
-- Se habilita autenticación anónima NO; todo pasa por service role (server) o el propio admin.
-- =============================
alter table public.leads enable row level security;
alter table public.interactions enable row level security;
alter table public.score_snapshots enable row level security;
alter table public.config enable row level security;

-- El admin autenticado (rol 'authenticated') ve y edita todo.
create policy "authenticated all" on public.leads for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.interactions for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.score_snapshots for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.config for all to authenticated using (true) with check (true);

grant all on public.leads to authenticated;
grant all on public.interactions to authenticated;
grant all on public.score_snapshots to authenticated;
grant all on public.config to authenticated;

-- =============================
-- SEED: leads de ejemplo demostrativos
-- =============================
insert into public.leads (id, name, company, company_segment, company_size, source, status, deal_value_estimate, notes) values
  ('11111111-1111-1111-1111-111111111111', 'María González', 'Grupo Costa Azul', 'Corporate events', '250-500 employees', 'referral', 'warm', 18500, 'Referida por VP Sales. Quiere evento corporativo para Q3.'),
  ('22222222-2222-2222-2222-222222222222', 'John Miller', 'Pacific Boardwalks LLC', 'Corporate events', '50-250 employees', 'website', 'cold', 8200, 'Solicitó brochure vía web. Sin actividad en 45+ días.'),
  ('33333333-3333-3333-3333-333333333333', 'Dra. Ana Torres', 'MediSummit', 'Medical conference', '500+ employees', 'events', 'hot', 42000, 'RFP enviada, fechas confirmadas, decisora principal.'),
  ('44444444-4444-4444-4444-444444444444', 'Pierre Dubois', 'Bordeaux Travel Group', 'Tour operator', '10-50 employees', 'inbound', 'unknown', null, 'Ficha incompleta, solo 1 contacto inicial.');

insert into public.interactions (lead_id, type, direction, summary, contact_name, contact_role, occurred_at) values
  ('11111111-1111-1111-1111-111111111111', 'call', 'outbound', 'Revisaron fechas disponibles para evento grupal en septiembre. Sin presupuesto aún.', 'María González', 'Event Coordinator', now() - interval '12 days'),
  ('11111111-1111-1111-1111-111111111111', 'email', 'inbound', 'Pidió lista de capacidades y opciones de F&B.', 'María González', 'Event Coordinator', now() - interval '9 days'),
  ('11111111-1111-1111-1111-111111111111', 'site_visit', 'inbound', 'Visita guiada por salones. Mencionó comparar con otro venue.', 'María González', 'Event Coordinator', now() - interval '5 days'),
  ('22222222-2222-2222-2222-222222222222', 'email', 'inbound', 'Solicitud de brochure.', 'John Miller', 'Operations Manager', now() - interval '48 days'),
  ('33333333-3333-3333-3333-333333333333', 'rfp', 'inbound', 'RFP formal para congreso médico de 600 asistentes.', 'Dra. Ana Torres', 'Director', now() - interval '20 days'),
  ('33333333-3333-3333-3333-333333333333', 'meeting', 'inbound', 'Reunión con comité de compras (3 personas). Presupuesto confirmado.', 'Dra. Ana Torres', 'Director', now() - interval '7 days'),
  ('33333333-3333-3333-3333-333333333333', 'contract', 'inbound', 'Solicitó borrador de contrato.', 'Dra. Ana Torres', 'Director', now() - interval '3 days'),
  ('44444444-4444-4444-4444-444444444444', 'other', 'inbound', 'Mensaje inicial de contacto vía formulario web.', 'Pierre Dubois', 'Founder', now() - interval '2 days');

insert into public.config (key, value) values
  ('prompt_version', '{"version": "v1.0.0", "note": "Prompt de lead scoring, ver lib/ai/prompt.ts"}'),
  ('scoring_enabled', '{"enabled": true}'),
  ('hotel_profile', '{"name": "Tu Hotel", "segment_ioc": "corporate events, weddings, medical conferences, leisure", "typical_deal_range_usd": "5k-50k"}');