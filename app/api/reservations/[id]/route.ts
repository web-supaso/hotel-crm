import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();
    const body = await req.json();

    const { status, dietary_notes, special_requests } = body;

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updatePayload.status = status;
    if (dietary_notes !== undefined) updatePayload.dietary_notes = dietary_notes;
    if (special_requests !== undefined) updatePayload.special_requests = special_requests;

    const { data: updated, error } = await supabase
      .from("reservations")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auditoría en Timeline
    await supabase.from("interactions").insert({
      organization_id: updated.organization_id,
      reservation_id: id,
      type: "status_change",
      summary: `Estado de la reserva actualizado a "${status}".`,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
