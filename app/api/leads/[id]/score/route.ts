import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { analyzeHospitalityLead } from "@/lib/ai/scoring";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const supabase = getAdminClient();

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*, property:properties(name)")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    const { data: interactions } = await supabase
      .from("interactions")
      .select("type, summary, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    const aiResult = await analyzeHospitalityLead({
      guestName: lead.guest_name,
      propertyName: lead.property?.name,
      requestedCheckIn: lead.requested_check_in,
      requestedCheckOut: lead.requested_check_out,
      guestsCount: lead.guests_count || 2,
      petsCount: lead.pets_count || 0,
      experienceLevel: lead.experience_level,
      dietaryNotes: lead.dietary_notes,
      specialRequests: lead.special_requests,
      estimatedBudget: lead.estimated_budget,
      status: lead.status,
      source: lead.source,
      daysSinceCreation: Math.ceil((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      interactions: (interactions || []).map((i) => ({
        type: i.type,
        summary: i.summary,
        occurredAt: i.created_at,
      })),
    });

    // Guardar resultados en el lead
    await supabase
      .from("leads")
      .update({
        ai_intent_score: aiResult.intent_score,
        ai_urgency: aiResult.urgency,
        ai_summary: aiResult.summary,
        ai_suggested_reply: aiResult.suggested_whatsapp_reply,
        ai_evaluated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Auditoría
    await supabase.from("interactions").insert({
      organization_id: lead.organization_id,
      lead_id: leadId,
      type: "ai_analysis",
      summary: `Análisis IA actualizado: Score ${aiResult.intent_score}/100, Urgencia ${aiResult.urgency}.`,
      details: { ai_analysis: aiResult },
    });

    return NextResponse.json(aiResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}