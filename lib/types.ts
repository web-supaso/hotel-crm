// ============================================================================
// TIPOS DE DOMINIO - HOSPITALITY & EXPERIENCIAS CRM
// ============================================================================

export type OrgRole = "owner" | "manager" | "sales" | "reception";
export type PropertyType = "hotel" | "glamping_refugio" | "villa" | "otro";
export type UnitType = "room" | "tent" | "cabin" | "dome" | "suite" | "other";

export type LeadStatus =
  | "nuevo"
  | "contactado"
  | "propuesta_enviada"
  | "negociacion"
  | "convertido"
  | "descartado";

export type ReservationStatus =
  | "pendiente_pago"
  | "senada"
  | "confirmada"
  | "in_house"
  | "checkout"
  | "completada"
  | "cancelada";

export type ItemType = "unit" | "experience" | "addon";
export type PaymentType = "deposit_sena" | "balance_saldo" | "extra_service" | "refund_reembolso";
export type PaymentMethod = "cash" | "bank_transfer" | "credit_card" | "mercadopago" | "stripe" | "other";
export type InteractionType = "whatsapp_out" | "call" | "email" | "note" | "status_change" | "ai_analysis";

// --- Entidades Base ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  api_inbound_key: string;
  created_at: string;
  updated_at: string;
  properties?: Property[];
  experiences?: Experience[];
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: Profile;
}

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  property_type: PropertyType;
  city: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  property_id: string;
  name: string;
  unit_type: UnitType;
  capacity_people: number;
  base_price_default: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Experience {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  base_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface DiscardReason {
  id: string;
  organization_id: string;
  code: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  property_id: string | null;
  assigned_user_id: string | null;
  
  guest_name: string;
  guest_email: string | null;
  guest_phone: string;
  guest_country: string | null;
  
  requested_check_in: string | null;
  requested_check_out: string | null;
  guests_count: number;
  adults_count?: number;
  children_count?: number;
  babies_count?: number;
  pets_count: number;
  experience_level: string | null;
  dietary_notes: string | null;
  special_requests: string | null;
  
  status: LeadStatus;
  source: string;
  estimated_budget: number | null;
  
  discard_reason_id: string | null;
  discard_notes: string | null;
  
  ai_intent_score: number | null;
  ai_urgency: string | null;
  ai_summary: string | null;
  ai_suggested_reply: string | null;
  ai_evaluated_at: string | null;
  
  created_at: string;
  updated_at: string;
  
  property?: Property;
  discard_reason?: DiscardReason;
  assigned_user?: Profile;
}

export interface Reservation {
  id: string;
  organization_id: string;
  property_id: string;
  lead_id: string | null;
  created_by_user_id: string | null;
  
  reservation_code: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string;
  dietary_notes: string | null;
  special_requests: string | null;
  pets_count: number;
  adults_count?: number;
  children_count?: number;
  babies_count?: number;
  
  check_in_date: string;
  check_out_date: string;
  status: ReservationStatus;
  
  total_price: number;
  deposit_required: number;
  deposit_paid: number;
  total_paid: number;
  balance_pending: number;
  currency: string;
  
  created_at: string;
  updated_at: string;
  
  property?: Property;
  items?: ReservationItem[];
  payments?: Payment[];
}

export interface ReservationItem {
  id: string;
  reservation_id: string;
  item_type: ItemType;
  unit_id: string | null;
  experience_id: string | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: Unit;
  experience?: Experience;
}

export interface Payment {
  id: string;
  organization_id: string;
  reservation_id: string;
  registered_by_user_id: string | null;
  amount: number;
  currency: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  transaction_reference: string | null;
  proof_receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Interaction {
  id: string;
  organization_id: string;
  lead_id: string | null;
  reservation_id: string | null;
  user_id: string | null;
  type: InteractionType;
  summary: string;
  details?: Record<string, any> | null;
  created_at: string;
}