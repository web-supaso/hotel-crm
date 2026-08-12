import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysSince } from "@/lib/revenue";
import type { Lead, ScoreSnapshot } from "@/lib/types";

// GET /api/alerts — agrupa señales accionables para el vendedor.
export async function GET() {
  const supabase = createAdminClient();

  const [{ data: leads }, { data: snapshots }] = await Promise.all([
    supabase.from("leads").select("*").in("status", ["hot", "warm", "cold", "unknown"]),
    supabase
      .from("score_snapshots")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const latestByLead = new Map<string, ScoreSnapshot>();
  for (const s of (snapshots ?? []) as ScoreSnapshot[]) {
    if (!latestByLead.has(s.lead_id)) latestByLead.set(s.lead_id, s);
  }

  const alerts: {
    type: "urgent" | "follow_up" | "stuck" | "silent" | "gap";
    lead_id: string;
    lead_name: string;
    message: string;
    days: number;
  }[] = [];

  for (const lead of (leads ?? []) as Lead[]) {
    const snap = latestByLead.get(lead.id);

    // Escalación a manager
    if (snap?.escalate_to_manager) {
      alerts.push({
        type: "urgent",
        lead_id: lead.id,
        lead_name: lead.name,
        message: "Escalado por scoring: revisa pronto",
        days: 0,
      });
    }

    // Follow-up vencido
    if (snap?.follow_up_days) {
      const due = new Date(snap.created_at);
      due.setDate(due.getDate() + snap.follow_up_days);
      const overdue = Math.floor((Date.now() - due.getTime()) / 86_400_000);
      if (overdue > 0) {
        alerts.push({
          type: "follow_up",
          lead_id: lead.id,
          lead_name: lead.name,
          message: `Follow-up vencido hace ${overdue}d — ${snap.next_best_action ?? "contactar"}`,
          days: overdue,
        });
      }
    }

    // Silencio prolongado
    if (!snap) continue;
    if (snap.key_signals?.includes("45d_silence")) {
      const last = lead.updated_at;
      const sil = daysSince(last ?? null);
      if (sil >= 40) {
        alerts.push({
          type: "silent",
          lead_id: lead.id,
          lead_name: lead.name,
          message: `${sil}d sin movimiento — riesgo de enfriarse`,
          days: sil,
        });
      }
    }
  }

  const order: Record<string, number> = { urgent: 0, follow_up: 1, stuck: 2, silent: 3, gap: 4 };
  alerts.sort((a, b) => order[a.type] - order[b.type] || b.days - a.days);

  return NextResponse.json(alerts.slice(0, 20));
}