import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreLead } from "@/lib/ai/scoring";
import type { Interaction, Lead } from "@/lib/types";
import { daysSince } from "@/lib/revenue";

interface SnapshotLite {
  id: string;
  lead_id: string;
  overall_score: number | null;
  ground_truth: boolean | null;
  rep_feedback: string | null;
  created_at: string;
}

// POST /api/leads/:id/score — corre el scoring LLM y guarda snapshot.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single<Lead>();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const [{ data: interactions, error: intErr }, { data: prevSnaps }] =
    await Promise.all([
      supabase
        .from("interactions")
        .select("type, direction, summary, contact_name, contact_role, occurred_at")
        .eq("lead_id", id)
        .order("occurred_at", { ascending: false })
        .limit(10),
      supabase
        .from("score_snapshots")
        .select("id, lead_id, overall_score, ground_truth, rep_feedback, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  if (intErr) {
    return NextResponse.json({ error: intErr.message }, { status: 500 });
  }

  const interactionsList = (interactions ?? []) as Interaction[];
  const stakeholders = new Set(
    interactionsList.map((i) => i.contact_name?.trim()).filter(Boolean),
  );
  const lastInteraction = interactionsList[0]?.occurred_at ?? null;

  const prev = ((prevSnaps ?? [])[0] ?? null) as SnapshotLite | null;
  const prevOutcome = prev?.ground_truth == null
    ? null
    : prev.ground_truth ? "won" : "lost";

  const result = await scoreLead({
    name: lead.name,
    company: lead.company,
    segment: lead.company_segment,
    companySize: lead.company_size,
    dealValue: lead.deal_value_estimate,
    lastInteractionDate: lastInteraction,
    count: interactionsList.length,
    stakeholdersCount: stakeholders.size,
    daysInPipeline: daysSince(lead.created_at),
    previousOverallScore: prev?.overall_score ?? null,
    previousPredictionOutcome: prevOutcome,
    repFeedback: prev?.rep_feedback ?? null,
    interactions: interactionsList.map((i) => ({
      type: i.type,
      direction: i.direction,
      summary: i.summary,
      contactName: i.contact_name,
      contactRole: i.contact_role,
      occurredAt: i.occurred_at,
    })),
  });

  const { error: insertErr } = await supabase.from("score_snapshots").insert({
    lead_id: id,
    classification: result.classification,
    overall_score: result.overall_score,
    trajectory_trend: result.trajectory_trend,
    dimension_scores: result.dimension_scores,
    risk_penalty: result.risk_penalty,
    confidence: result.confidence,
    predicted_close_probability: result.predicted_close_probability,
    estimated_close_days: result.estimated_close_days,
    estimated_deal_value_signal: result.estimated_deal_value_signal,
    priority_level: result.priority_level,
    pre_call_briefing: result.pre_call_briefing,
    next_best_action: result.next_best_action,
    follow_up_days: result.follow_up_days,
    objection_risk: result.objection_risk,
    reasoning: result.reasoning,
    key_signals: result.key_signals,
    data_gaps: result.data_gaps,
    escalate_to_manager: result.escalate_to_manager,
    active_learning_note: result.active_learning_note,
    model: result.model,
    prompt_version: result.prompt_version,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Actualiza el status del lead (clasificación derivada del score),
  // salvo que ya esté cerrado (no se pisa una decisión ganada/perdida).
  await supabase
    .from("leads")
    .update({ status: result.classification })
    .eq("id", id)
    .in("status", ["hot", "warm", "cold", "unknown"]);

  return NextResponse.json(result, { status: 200 });
}

// Recupera el snapshot más reciente
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("score_snapshots")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json(null, { status: 200 });
  return NextResponse.json(data);
}

// PATCH /api/leads/:id/score — marca ground_truth o guarda rep_feedback
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {};
  if (typeof body.ground_truth === "boolean") patch.ground_truth = body.ground_truth;
  if (typeof body.rep_feedback === "string") patch.rep_feedback = body.rep_feedback;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada para actualizar" }, { status: 400 });
  }

  const { error } = await supabase
    .from("score_snapshots")
    .update(patch)
    .eq("id", body.snapshot_id)
    .eq("lead_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}