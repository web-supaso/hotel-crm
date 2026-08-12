import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INTERACTION_TYPES, INTERACTION_DIRECTIONS } from "@/lib/labels";

// POST /api/leads/:id/interactions
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  const type = body.type ?? "call";
  const direction = body.direction ?? "outbound";

  if (!INTERACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: "tipo de interacción inválido" }, { status: 400 });
  }
  if (!INTERACTION_DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: "dirección inválida" }, { status: 400 });
  }

  const occurred_at =
    body.occurred_at && !isNaN(new Date(body.occurred_at).getTime())
      ? new Date(body.occurred_at).toISOString()
      : new Date().toISOString();

  const { data: interaction, error } = await supabase
    .from("interactions")
    .insert({
      lead_id: id,
      type,
      direction,
      summary: body.summary ?? null,
      contact_name: body.contact_name ?? null,
      contact_role: body.contact_role ?? null,
      occurred_at,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(interaction, { status: 201 });
}

// DELETE /api/leads/:id/interactions?interaction_id=...
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const interactionId = url.searchParams.get("interaction_id");

  if (!interactionId) {
    return NextResponse.json({ error: "interaction_id requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("id", interactionId)
    .eq("lead_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}