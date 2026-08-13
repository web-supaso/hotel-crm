import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();

    const { data: lead, error } = await supabase
      .from("leads")
      .select(`
        *,
        property:properties(id, name, property_type, city),
        discard_reason:discard_reasons(id, code, label),
        assigned_user:profiles(id, full_name, email)
      `)
      .eq("id", id)
      .single();

    if (error || !lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    const { data: interactions } = await supabase
      .from("interactions")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ...lead, interactions: interactions ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();
    const body = await req.json();

    const {
      status,
      discard_reason_id,
      discard_notes,
      property_id,
      requested_check_in,
      requested_check_out,
      guests_count,
      pets_count,
      dietary_notes,
      special_requests,
      estimated_budget,
    } = body;

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updatePayload.status = status;
    if (discard_reason_id !== undefined) updatePayload.discard_reason_id = discard_reason_id;
    if (discard_notes !== undefined) updatePayload.discard_notes = discard_notes;
    if (property_id !== undefined) updatePayload.property_id = property_id;
    if (requested_check_in !== undefined) updatePayload.requested_check_in = requested_check_in;
    if (requested_check_out !== undefined) updatePayload.requested_check_out = requested_check_out;
    if (guests_count !== undefined) updatePayload.guests_count = guests_count;
    if (pets_count !== undefined) updatePayload.pets_count = pets_count;
    if (dietary_notes !== undefined) updatePayload.dietary_notes = dietary_notes;
    if (special_requests !== undefined) updatePayload.special_requests = special_requests;
    if (estimated_budget !== undefined) updatePayload.estimated_budget = estimated_budget;

    const { data: updated, error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        property:properties(id, name, property_type, city),
        discard_reason:discard_reasons(id, code, label)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Registrar cambio en el timeline si cambió el estado
    if (status) {
      await supabase.from("interactions").insert({
        organization_id: updated.organization_id,
        lead_id: id,
        type: "status_change",
        summary: `Estado actualizado a "${status}"${discard_reason_id ? " con motivo de descarte." : "."}`,
        details: { new_status: status, discard_reason_id, discard_notes },
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}