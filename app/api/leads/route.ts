import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { analyzeHospitalityLead } from "@/lib/ai/scoring";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organization_id");
    const propertyId = searchParams.get("property_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("leads")
      .select(`
        *,
        property:properties(id, name, property_type, city),
        discard_reason:discard_reasons(id, code, label),
        assigned_user:profiles(id, full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (orgId) query = query.eq("organization_id", orgId);
    if (propertyId) query = query.eq("property_id", propertyId);
    if (status) query = query.eq("status", status);

    const { data: leads, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(leads ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await req.json();

    const {
      organization_id,
      property_id,
      guest_name,
      guest_phone,
      guest_email,
      requested_check_in,
      requested_check_out,
      guests_count,
      pets_count,
      experience_level,
      dietary_notes,
      special_requests,
      estimated_budget,
      source,
    } = body;

    if (!organization_id || !guest_name || !guest_phone) {
      return NextResponse.json(
        { error: "organization_id, guest_name y guest_phone son obligatorios" },
        { status: 400 }
      );
    }

    // Validación estricta de fechas
    if (requested_check_in && requested_check_out) {
      const dIn = new Date(requested_check_in + "T00:00:00");
      const dOut = new Date(requested_check_out + "T00:00:00");
      if (dOut <= dIn) {
        return NextResponse.json(
          { error: "La fecha de check-out debe ser posterior al check-in." },
          { status: 400 }
        );
      }
    }

    // Normalizar teléfono a formato internacional
    let cleanPhone = (guest_phone || "").replace(/\D/g, "");
    if (!cleanPhone.startsWith("+") && cleanPhone.length >= 10) {
      if (!cleanPhone.startsWith("54") && cleanPhone.length === 10) {
        cleanPhone = "549" + cleanPhone;
      }
      cleanPhone = "+" + cleanPhone;
    }
    if (!cleanPhone) cleanPhone = guest_phone;

    // Obtener nombre de la propiedad si está asignada
    let propertyName: string | undefined = undefined;
    if (property_id) {
      const { data: prop } = await supabase
        .from("properties")
        .select("name")
        .eq("id", property_id)
        .maybeSingle();
      if (prop) propertyName = prop.name;
    }

    // Ejecutar análisis rápido de IA con Gemini
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeHospitalityLead({
        guestName: guest_name.trim(),
        propertyName,
        requestedCheckIn: requested_check_in,
        requestedCheckOut: requested_check_out,
        guestsCount: Number(guests_count) || 2,
        petsCount: Number(pets_count) || 0,
        experienceLevel: experience_level || undefined,
        dietaryNotes: dietary_notes || undefined,
        specialRequests: special_requests || undefined,
        estimatedBudget: estimated_budget ? Number(estimated_budget) : undefined,
        status: "nuevo",
        source: source || "manual",
        daysSinceCreation: 0,
        interactions: [],
      });
    } catch (e) {
      console.warn("AI analysis fallback on manual lead:", e);
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        organization_id,
        property_id: property_id ?? null,
        guest_name: guest_name.trim(),
        guest_phone: cleanPhone,
        guest_email: guest_email?.trim() || null,
        requested_check_in: requested_check_in || null,
        requested_check_out: requested_check_out || null,
        guests_count: Number(guests_count) || 2,
        pets_count: Number(pets_count) || 0,
        experience_level: experience_level || null,
        dietary_notes: dietary_notes || null,
        special_requests: special_requests || null,
        estimated_budget: estimated_budget ? Number(estimated_budget) : null,
        source: source || "manual",
        status: "nuevo",
        ai_intent_score: aiAnalysis?.intent_score ?? null,
        ai_urgency: aiAnalysis?.urgency ?? null,
        ai_summary: aiAnalysis?.summary ?? null,
        ai_suggested_reply: aiAnalysis?.suggested_whatsapp_reply ?? null,
        ai_evaluated_at: aiAnalysis ? new Date().toISOString() : null,
      })
      .select(`
        *,
        property:properties(id, name, property_type, city)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Timeline
    await supabase.from("interactions").insert({
      organization_id,
      lead_id: lead.id,
      type: "note",
      summary: `Lead creado manualmente para ${lead.guest_name} (${lead.guests_count} huéspedes).`,
      details: {
        ai_analysis: aiAnalysis,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}