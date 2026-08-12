import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreLead } from "@/lib/ai/scoring";
import { daysSince } from "@/lib/revenue";
import type { Interaction, Lead } from "@/lib/types";

export const maxDuration = 300;

interface SnapRow {
  lead_id: string;
  created_at: string;
  estimated_close_days: number | null;
  overall_score: number;
}

// POST /api/cron/daily — llamado por Vercel Cron (o un cron externo).
// 1) Puntúa leads sin score o con interacciones posteriores al último score.
// 2) Detecta deals bloqueados (estimated_close_days vencido).
export async function POST() {
  const supabase = createAdminClient();
  const results = { scored: 0, errors: 0, stuck: [] as string[] };

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .in("status", ["hot", "warm", "cold", "unknown"]);

  const ids = (leads ?? []).map((l: Lead) => l.id);
  if (!ids.length) {
    return NextResponse.json(results);
  }

  const [{ data: interactions }, { data: snapshots }] = await Promise.all([
    supabase
      .from("interactions")
      .select("lead_id, type, direction, summary, contact_name, contact_role, occurred_at")
      .in("lead_id", ids),
    supabase
      .from("score_snapshots")
      .select("lead_id, created_at, estimated_close_days, overall_score")
      .in("lead_id", ids),
  ]);

  const latestSnap = new Map<string, SnapRow>();
  for (const s of (snapshots ?? []) as SnapRow[]) {
    const prev = latestSnap.get(s.lead_id);
    if (!prev || new Date(s.created_at) > new Date(prev.created_at)) {
      latestSnap.set(s.lead_id, s);
    }
  }

  const interactionRows = (interactions ?? []) as Interaction[];

  for (const lead of leads as Lead[]) {
    const leadInteractions = interactionRows.filter((i) => i.lead_id === lead.id);

    const latest = latestSnap.get(lead.id);
    const needsRescore =
      !latest ||
      leadInteractions.some((i: Interaction) => new Date(i.occurred_at) > new Date(latest.created_at));

    if (needsRescore) {
      try {
        const list = leadInteractions
          .sort((a: Interaction, b: Interaction) =>
            new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
          )
          .slice(0, 10);

        const stakeholders = new Set(
          list.map((i: Interaction) => i.contact_name?.trim()).filter(Boolean),
        );

        const result = await scoreLead({
          name: lead.name,
          company: lead.company,
          segment: lead.company_segment,
          companySize: lead.company_size,
          lastInteractionDate: list[0]?.occurred_at ?? null,
          count: list.length,
          stakeholdersCount: stakeholders.size,
          daysInPipeline: daysSince(lead.created_at),
          interactions: list.map((i: Interaction) => ({
            type: i.type,
            direction: i.direction,
            summary: i.summary,
            contactName: i.contact_name,
            contactRole: i.contact_role,
            occurredAt: i.occurred_at,
          })),
        });

        await supabase.from("score_snapshots").insert({
          lead_id: lead.id,
          classification: result.classification,
          overall_score: result.overall_score,
          dimension_scores: result.dimension_scores,
          risk_penalty: result.risk_penalty,
          confidence: result.confidence,
          predicted_close_probability: result.predicted_close_probability,
          estimated_close_days: result.estimated_close_days,
          estimated_deal_value_signal: result.estimated_deal_value_signal,
          priority_level: result.priority_level,
          next_best_action: result.next_best_action,
          follow_up_days: result.follow_up_days,
          reasoning: result.reasoning,
          key_signals: result.key_signals,
          data_gaps: result.data_gaps,
          escalate_to_manager: result.escalate_to_manager,
          model: result.model,
          prompt_version: result.prompt_version,
        });

        await supabase
          .from("leads")
          .update({ status: result.classification })
          .eq("id", lead.id)
          .in("status", ["hot", "warm", "cold", "unknown"]);

        results.scored++;
      } catch (e) {
        results.errors++;
        console.error(`Scoring falló para lead ${lead.id}:`, e);
      }
    }

    // Deals bloqueados: fecha estimada ya vencida
    const snap = latestSnap.get(lead.id);
    if (snap?.estimated_close_days) {
      const due = new Date(snap.created_at);
      due.setDate(due.getDate() + snap.estimated_close_days);
      if (due < new Date()) {
        results.stuck.push(lead.name);
      }
    }
  }

  return NextResponse.json(results);
}