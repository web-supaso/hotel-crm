import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { analyzeHospitalityLead } from "@/lib/ai/scoring";

export async function POST(req: NextRequest) {
  try {
    const rawApiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("apikey") ||
      req.headers.get("authorization")?.replace("Bearer ", "").trim() ||
      req.nextUrl.searchParams.get("api_key") ||
      req.nextUrl.searchParams.get("key");

    // En desarrollo/fallback usa por defecto la key de Experiencias si no se envía una
    const apiKey = rawApiKey || "key_experiencias_2026_sec";

    const supabase = getAdminClient();

    // 1. Validar Organización por api_inbound_key
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, base_currency")
      .eq("api_inbound_key", apiKey)
      .single();

    if (orgErr || !org) {
      return NextResponse.json({ error: "API key inválida o no autorizada" }, { status: 403 });
    }

    const rawBody = await req.json();

    // Extraer campos tolerando variaciones del formulario web
    const firstName = rawBody.first_name || rawBody.nombres || "";
    const lastName = rawBody.last_name || rawBody.apellidos || "";
    const guestName = rawBody.guest_name || `${firstName} ${lastName}`.trim() || "Huésped sin nombre";

    const rawPhone = rawBody.phone || rawBody.telefono || rawBody.guest_phone || "";
    const email = rawBody.email || rawBody.guest_email || rawBody.correo || null;

    const checkIn = rawBody.check_in || rawBody.requested_check_in || rawBody.entrada || null;
    const checkOut = rawBody.check_out || rawBody.requested_check_out || rawBody.salida || null;

    const adults = Number(rawBody.adults || rawBody.adultos || 0);
    const children = Number(rawBody.children || rawBody.ninos || 0);
    const babies = Number(rawBody.babies || rawBody.bebes || 0);
    const guestsCount = (adults + children + babies) > 0 
      ? (adults + children + babies) 
      : Number(rawBody.guests_count || 2);

    const hasPet = rawBody.has_pet === true || rawBody.has_pet === "true" || rawBody.mascota === true || rawBody.mascota === "Sí";
    const petsCount = hasPet ? Math.max(1, Number(rawBody.pets_count || 1)) : Number(rawBody.pets_count || 0);

    const isVegetarian = rawBody.is_vegetarian === true || rawBody.is_vegetarian === "true" || rawBody.vegetariano === true || rawBody.vegetariano === "Sí";
    let dietaryNotes = rawBody.dietary_notes || "";
    if (isVegetarian && !dietaryNotes.includes("Vegetariana")) {
      dietaryNotes = dietaryNotes ? `Opción Vegetariana | ${dietaryNotes}` : "Opción Vegetariana";
    }

    const specialOccasion = rawBody.special_occasion || rawBody.ocasion_especial || "";
    const message = rawBody.message || rawBody.mensaje || rawBody.additional_message || rawBody.special_requests || "";

    // Armar desglose enriquecido en special_requests
    const adCount = adults || guestsCount;
    const guestsBreakdown = `${adCount} Adulto${adCount > 1 ? "s" : ""}${children > 0 ? ` · ${children} Niño${children > 1 ? "s" : ""}` : ""}${babies > 0 ? ` · ${babies} Bebé${babies > 1 ? "s" : ""}` : ""}`;
    const parts: string[] = [];
    parts.push(`Desglose: ${guestsBreakdown}`);
    if (specialOccasion) parts.push(`Ocasión: ${specialOccasion}`);
    if (message) parts.push(`Mensaje: ${message}`);
    const specialRequests = parts.join(" | ");

    let targetPropertyId = rawBody.property_id ?? null;
    const propertyName = rawBody.property_name || rawBody.destino || rawBody.refugio || "";

    // Si viene property_name y no property_id, buscar por coincidencia en la organización
    if (!targetPropertyId && propertyName) {
      const { data: prop } = await supabase
        .from("properties")
        .select("id")
        .eq("organization_id", org.id)
        .ilike("name", `%${propertyName}%`)
        .limit(1)
        .maybeSingle();
      if (prop) {
        targetPropertyId = prop.id;
      }
    }

    // Normalizar teléfono a formato internacional si es necesario
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("+") && cleanPhone.length >= 10) {
      if (!cleanPhone.startsWith("54") && cleanPhone.length === 10) {
        cleanPhone = "549" + cleanPhone;
      }
      cleanPhone = "+" + cleanPhone;
    }
    if (!cleanPhone) cleanPhone = rawPhone;

    // 2. Ejecutar análisis rápido de IA con Gemini
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeHospitalityLead({
        guestName,
        propertyName: propertyName || undefined,
        requestedCheckIn: checkIn,
        requestedCheckOut: checkOut,
        guestsCount,
        petsCount,
        experienceLevel: specialOccasion || undefined,
        dietaryNotes: dietaryNotes || undefined,
        specialRequests: specialRequests || undefined,
        estimatedBudget: rawBody.estimated_budget,
        status: "nuevo",
        source: rawBody.source || "web_form",
        daysSinceCreation: 0,
        interactions: [],
      });
    } catch (e) {
      console.warn("AI scoring fallback:", e);
    }

    // 3. Insertar el Lead en Postgres
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        organization_id: org.id,
        property_id: targetPropertyId,
        guest_name: guestName,
        guest_phone: cleanPhone,
        guest_email: email,
        requested_check_in: checkIn,
        requested_check_out: checkOut,
        guests_count: guestsCount,
        pets_count: petsCount,
        experience_level: specialOccasion || null,
        dietary_notes: dietaryNotes || null,
        special_requests: specialRequests || null,
        estimated_budget: rawBody.estimated_budget ?? null,
        status: "nuevo",
        source: rawBody.source || "web_form",
        ai_intent_score: aiAnalysis?.intent_score ?? null,
        ai_urgency: aiAnalysis?.urgency ?? null,
        ai_summary: aiAnalysis?.summary ?? null,
        ai_suggested_reply: aiAnalysis?.suggested_whatsapp_reply ?? null,
        ai_evaluated_at: aiAnalysis ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (leadErr) {
      return NextResponse.json({ error: "Error al registrar el lead", details: leadErr.message }, { status: 500 });
    }

    // 4. Registrar interacción inicial en el timeline
    await supabase.from("interactions").insert({
      organization_id: org.id,
      lead_id: lead.id,
      type: "note",
      summary: `Consulta web recibida: ${guestName} (${guestsCount} huéspedes${hasPet ? ', con mascota' : ''}${isVegetarian ? ', menú vegetariano' : ''}).`,
      details: {
        ai_analysis: aiAnalysis,
        raw_payload: rawBody,
      },
    });

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      organization: org.name,
      ai_summary: aiAnalysis?.summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor", message: err.message }, { status: 500 });
  }
}
