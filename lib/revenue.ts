import type { Lead, LeadStatus, LeadWithStats, ScoreSnapshot } from "@/lib/types";

export function daysSince(date: string | null, from = new Date()): number {
  if (!date) return 0;
  const d = new Date(date);
  const diff = from.getTime() - d.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export const STATUS_COLOR: Record<LeadStatus, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-slate-100 text-slate-600",
  unknown: "bg-zinc-100 text-zinc-500",
  closed_won: "bg-emerald-100 text-emerald-700",
  closed_lost: "bg-rose-100 text-rose-700",
};

export const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-400 text-white",
  low: "bg-slate-400 text-white",
  nurture: "bg-teal-500 text-white",
};

// Clasificación de respaldo (determinista) si el LLM falla o no hay API key.
// Refleja las reglas del prompt, sin predicción.
export function fallbackClassification(snapshot: ScoreSnapshot | null): {
  classification: LeadStatus;
  overall_score: number;
} {
  if (!snapshot) return { classification: "unknown", overall_score: 0 };
  const s = snapshot.overall_score;
  const intent = snapshot.dimension_scores.intent;
  if (s >= 75 && intent >= 60) return { classification: "hot", overall_score: s };
  if (s >= 45) return { classification: "warm", overall_score: s };
  return { classification: "cold", overall_score: s };
}

export function weightedDealValue(lead: Lead, snapshot: ScoreSnapshot | null): number {
  if (!lead.deal_value_estimate) return 0;
  if (!snapshot) return 0;
  return lead.deal_value_estimate * ((snapshot.predicted_close_probability ?? 0) / 100);
}

export function enrichLead(
  lead: Lead,
  interactions: { contact_name: string | null; occurred_at: string }[],
  latestScore: ScoreSnapshot | null,
): LeadWithStats {
  const stakeholders = new Set(interactions.map((i) => i.contact_name?.trim()).filter(Boolean));
  const lastInteraction = interactions.length
    ? interactions.reduce((a, b) => (new Date(b.occurred_at) > new Date(a.occurred_at) ? b : a))
    : null;

  return {
    ...lead,
    interactions_count: interactions.length,
    unique_stakeholders: stakeholders.size,
    last_interaction_at: lastInteraction?.occurred_at ?? null,
    days_in_pipeline: daysSince(lead.created_at),
    latest_score: latestScore,
  };
}

export function pipelineSummary(leads: LeadWithStats[]) {
  const open = leads.filter((l) =>
    ["hot", "warm", "cold", "unknown"].includes(l.status),
  );

  const hot = open.filter((l) => l.status === "hot").length;
  const warm = open.filter((l) => l.status === "warm").length;
  const cold = open.filter((l) => l.status === "cold").length;

  const weightedRevenue = open.reduce(
    (acc, l) => acc + weightedDealValue(l, l.latest_score),
    0,
  );
  const totalPotential = open.reduce(
    (acc, l) => acc + (l.deal_value_estimate ?? 0),
    0,
  );

  const avgScore = open.length
    ? Math.round(
        open.reduce((a, l) => a + (l.latest_score?.overall_score ?? 0), 0) / open.length,
      )
    : 0;

  const silent = open.filter(
    (l) => !l.last_interaction_at || daysSince(l.last_interaction_at) > 45,
  ).length;

  const singleThreaded = open.filter(
    (l) => (l.latest_score?.dimension_scores?.committee ?? 100) < 50,
  ).length;

  const escalations = open.filter((l) => l.latest_score?.escalate_to_manager).length;

  return {
    openCount: open.length,
    hot,
    warm,
    cold,
    weightedRevenue,
    totalPotential,
    avgScore,
    silent,
    singleThreaded,
    escalations,
  };
}

export function forecastByMonth(leads: LeadWithStats[]) {
  const forecast: Record<string, { month: string; weighted: number; potential: number }> = {};

  for (const lead of leads) {
    const snap = lead.latest_score;
    if (!snap) continue;
    const days = snap.estimated_close_days ?? 30;
    const closeDate = new Date(Date.now() + days * 86_400_000);
    const key = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, "0")}`;
    const label = closeDate.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

    forecast[key] ??= { month: label, weighted: 0, potential: 0 };
    forecast[key].weighted += weightedDealValue(lead, snap);
    forecast[key].potential += lead.deal_value_estimate ?? 0;
  }

  return Object.entries(forecast)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function stuckDeals(leads: LeadWithStats[]) {
  return leads.filter((l) => {
    const snap = l.latest_score;
    if (!snap?.estimated_close_days) return false;
    return daysSince(snap.created_at) > snap.estimated_close_days;
  });
}

export type AutomationTrigger =
  | "notify_manager_single_threaded"
  | "suggest_exec_sponsor"
  | "trigger_rescue_playbook"
  | "move_to_high_value_nurture"
  | "follow_up_overdue"
  | "escalate_to_manager";

// Reglas determinísticas → el LLM NO dispara automatizaciones.
export function deriveAutomationTriggers(
  lead: LeadWithStats | null,
  snapshot: ScoreSnapshot | null,
): AutomationTrigger[] {
  if (!snapshot) return [];
  const triggers: AutomationTrigger[] = [];

  const committee = snapshot.dimension_scores?.committee ?? 0;
  const icp = snapshot.dimension_scores?.icp_fit ?? 0;
  const signals = snapshot.key_signals ?? [];

  if (committee > 0 && committee < 50) {
    triggers.push("notify_manager_single_threaded");
  }
  if (snapshot.objection_risk === "budget") {
    triggers.push("suggest_exec_sponsor");
  }
  if (signals.includes("45d_silence") || snapshot.objection_risk === "silence") {
    triggers.push("trigger_rescue_playbook");
  }
  if (
    snapshot.priority_level === "nurture" &&
    icp >= 80 &&
    (lead?.last_interaction_at == null || daysSince(lead.last_interaction_at) > 90)
  ) {
    triggers.push("move_to_high_value_nurture");
  }
  if (snapshot.follow_up_days != null && snapshot.created_at) {
    const due = new Date(snapshot.created_at);
    due.setDate(due.getDate() + snapshot.follow_up_days);
    if (due < new Date()) triggers.push("follow_up_overdue");
  }
  if (snapshot.escalate_to_manager) {
    triggers.push("escalate_to_manager");
  }

  return triggers;
}

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  notify_manager_single_threaded: "Notificar manager (single-threaded)",
  suggest_exec_sponsor: "Sugerir exec sponsor (riesgo de presupuesto)",
  trigger_rescue_playbook: "Disparar playbook de rescate (silencio)",
  move_to_high_value_nurture: "Mover a nurture de alto valor (ICP alto)",
  follow_up_overdue: "Follow-up vencido",
  escalate_to_manager: "Escalado a manager",
};