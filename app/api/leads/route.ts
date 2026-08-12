import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichLead } from "@/lib/revenue";
import type { ScoreSnapshot } from "@/lib/types";

// GET /api/leads — lista con estadísticas + último score
export async function GET(req: Request) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (leads ?? []).map((l) => l.id);

  const { data: interactions } = ids.length
    ? await supabase
        .from("interactions")
        .select("lead_id, contact_name, occurred_at")
        .in("lead_id", ids)
    : { data: [] };

  const { data: scores } = ids.length
    ? await supabase
        .from("score_snapshots")
        .select("*")
        .in("lead_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };

  const interactionRows = (interactions ?? []) as {
    lead_id: string;
    contact_name: string | null;
    occurred_at: string;
  }[];
  const angleRows = (scores ?? []) as (ScoreSnapshot & Record<string, unknown>)[];
  const latestByLead = new Map<string, ScoreSnapshot>();
  for (const s of angleRows) {
    const snap = s as ScoreSnapshot;
    if (!latestByLead.has(snap.lead_id)) latestByLead.set(snap.lead_id, snap);
  }

  const byLead = (leads ?? []).map((lead) =>
    enrichLead(
      lead,
      interactionRows.filter((i: (typeof interactionRows)[number]) => i.lead_id === lead.id),
      latestByLead.get(lead.id) ?? null,
    ),
  );

  return NextResponse.json(byLead);
}

// POST /api/leads — crea lead y opcionalmente corre scoring
export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  const { name, company, company_segment, company_size, source, deal_value_estimate, notes } =
    body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name es obligatorio" }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      name: name.trim(),
      company: company ?? null,
      company_segment: company_segment ?? null,
      company_size: company_size ?? null,
      source: source ?? null,
      deal_value_estimate: deal_value_estimate ?? null,
      notes: notes ?? null,
      status: "unknown",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(lead, { status: 201 });
}