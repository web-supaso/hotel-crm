export type LeadStatus =
  | "hot"
  | "warm"
  | "cold"
  | "unknown"
  | "closed_won"
  | "closed_lost";

export type InteractionType =
  | "call"
  | "email"
  | "meeting"
  | "site_visit"
  | "rfp"
  | "proposal"
  | "contract"
  | "other";

export type InteractionDirection = "inbound" | "outbound";

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  company_segment: string | null;
  company_size: string | null;
  source: string | null;
  deal_value_estimate: number | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: InteractionType;
  direction: InteractionDirection;
  summary: string | null;
  contact_name: string | null;
  contact_role: string | null;
  occurred_at: string;
  created_at: string;
}

export interface DimensionScores {
  intent: number;
  engagement: number;
  icp_fit: number;
  committee: number;
}

export interface ScoreSnapshot {
  id: string;
  lead_id: string;
  classification: LeadStatus;
  overall_score: number;
  dimension_scores: DimensionScores;
  risk_penalty: number;
  confidence: number | null;
  predicted_close_probability: number | null;
  estimated_close_days: number | null;
  estimated_deal_value_signal: string | null;
  priority_level: string | null;
  next_best_action: string | null;
  follow_up_days: number | null;
  reasoning: string | null;
  key_signals: string[];
  data_gaps: string[];
  escalate_to_manager: boolean;
  ground_truth: boolean | null;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
}

export interface LeadWithStats extends Lead {
  interactions_count: number;
  unique_stakeholders: number;
  last_interaction_at: string | null;
  days_in_pipeline: number;
  latest_score: ScoreSnapshot | null;
}