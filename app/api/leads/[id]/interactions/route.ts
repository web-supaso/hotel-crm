import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leadId } = await params;
    const supabase = getAdminClient();
    const body = await req.json();

    const { type = "note", summary } = body;

    if (!summary?.trim()) {
      return NextResponse.json({ error: "El resumen de la nota es obligatorio" }, { status: 400 });
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("organization_id")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    const { data: interaction, error } = await supabase
      .from("interactions")
      .insert({
        organization_id: lead.organization_id,
        lead_id: leadId,
        type: type,
        summary: summary.trim(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(interaction, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}