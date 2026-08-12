import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/leads/:id — detalle con interacciones y score history
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: lead }, { data: interactions }, { data: scores }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase
        .from("interactions")
        .select("*")
        .eq("lead_id", id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("score_snapshots")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

  return NextResponse.json({
    lead,
    interactions: interactions ?? [],
    scores: scores ?? [],
  });
}

// PATCH /api/leads/:id — edita lead / marca como ganado o perdido
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  // cierre ganado/perdido
  if (body.close_reason) {
    const closed = body.close_reason === "won" ? "closed_won" : "closed_lost";
    const { error } = await supabase
      .from("leads")
      .update({ status: closed, notes: body.notes ?? null })
      .eq("id", id);

    if (body.snapshot_id != null) {
      // ground truth para el active learning
      await supabase
        .from("score_snapshots")
        .update({ ground_truth: closed === "closed_won" })
        .eq("id", body.snapshot_id)
        .eq("lead_id", id);
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  for (const k of [
    "name",
    "company",
    "company_segment",
    "company_size",
    "source",
    "deal_value_estimate",
    "notes",
  ]) {
    if (k in body) patch[k] = body[k];
  }

  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/leads/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}