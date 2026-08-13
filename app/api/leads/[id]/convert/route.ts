import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const supabase = getAdminClient();
    const body = await req.json();

    const {
      property_id,
      unit_ids, // array de string (UUIDs)
      experiences, // array de { id: string, quantity: number, unit_price: number }
      check_in_date,
      check_out_date,
      total_price,
      deposit_required,
      deposit_amount, // monto pagado en este momento (seña)
      payment_method,
      transaction_reference,
    } = body;

    if (!property_id || !unit_ids?.length || !check_in_date || !check_out_date || !total_price) {
      return NextResponse.json(
        { error: "property_id, unit_ids, check_in_date, check_out_date y total_price son requeridos" },
        { status: 400 }
      );
    }

    // 1. Obtener datos del Lead original
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    // 2. Obtener datos de la Propiedad para el código de reserva
    const { data: prop } = await supabase
      .from("properties")
      .select("name, organization_id")
      .eq("id", property_id)
      .single();

    const propPrefix = prop?.name
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 6)
      .toUpperCase() || "RES";

    // 3. Validar disponibilidad de cada unidad (Anti-solapamiento)
    for (const unitId of unit_ids) {
      const { data: isAvail, error: availErr } = await supabase.rpc("check_unit_available", {
        p_unit_id: unitId,
        p_start_date: check_in_date,
        p_end_date: check_out_date,
      });

      if (availErr) {
        return NextResponse.json({ error: "Error al verificar disponibilidad", details: availErr.message }, { status: 500 });
      }

      if (!isAvail) {
        const { data: u } = await supabase.from("units").select("name").eq("id", unitId).single();
        return NextResponse.json(
          { error: `La unidad "${u?.name || unitId}" ya está reservada para las fechas seleccionadas.` },
          { status: 409 }
        );
      }
    }

    // 4. Generar código de reserva único
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reservationCode = `${propPrefix}-${new Date().getFullYear()}-${randomSuffix}`;

    // 5. Crear la Reserva (Snapshot de datos)
    const { data: reservation, error: resErr } = await supabase
      .from("reservations")
      .insert({
        organization_id: lead.organization_id,
        property_id,
        lead_id: lead.id,
        reservation_code: reservationCode,
        guest_name: lead.guest_name,
        guest_phone: lead.guest_phone,
        guest_email: lead.guest_email ?? null,
        dietary_notes: lead.dietary_notes ?? null,
        special_requests: lead.special_requests ?? null,
        pets_count: lead.pets_count || 0,
        check_in_date,
        check_out_date,
        status: "pendiente_pago",
        total_price: Number(total_price),
        deposit_required: Number(deposit_required || 0),
        deposit_paid: 0,
        total_paid: 0,
        balance_pending: Number(total_price),
      })
      .select()
      .single();

    if (resErr) {
      return NextResponse.json({ error: "Error al crear reserva", details: resErr.message }, { status: 500 });
    }

    // 6. Insertar items de reserva (Unidades)
    const { data: unitsData } = await supabase.from("units").select("id, name, base_price_default").in("id", unit_ids);
    const itemsToInsert = (unitsData || []).map((u) => ({
      reservation_id: reservation.id,
      item_type: "unit" as const,
      unit_id: u.id,
      name: u.name,
      start_date: check_in_date,
      end_date: check_out_date,
      quantity: 1,
      unit_price: u.base_price_default,
      total_price: u.base_price_default,
    }));

    // Items de Experiencias si existen
    if (Array.isArray(experiences) && experiences.length > 0) {
      for (const exp of experiences) {
        itemsToInsert.push({
          reservation_id: reservation.id,
          item_type: "experience" as const,
          unit_id: null as any,
          experience_id: exp.id,
          name: exp.name || "Experiencia",
          start_date: check_in_date,
          end_date: check_out_date,
          quantity: exp.quantity || 1,
          unit_price: exp.unit_price || 0,
          total_price: (exp.quantity || 1) * (exp.unit_price || 0),
        } as any);
      }
    }

    await supabase.from("reservation_items").insert(itemsToInsert);

    // 7. Si se recibió seña/pago inicial, registrar transacción
    if (Number(deposit_amount) > 0) {
      await supabase.from("payments").insert({
        organization_id: lead.organization_id,
        reservation_id: reservation.id,
        amount: Number(deposit_amount),
        payment_type: "deposit_sena",
        payment_method: payment_method || "bank_transfer",
        transaction_reference: transaction_reference || null,
        notes: "Seña inicial registrada en la conversión",
      });
    }

    // 8. Actualizar Lead como CONVERTIDO
    await supabase
      .from("leads")
      .update({
        status: "convertido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    // 9. Registrar interacción en Timeline
    await supabase.from("interactions").insert({
      organization_id: lead.organization_id,
      lead_id: lead.id,
      reservation_id: reservation.id,
      type: "status_change",
      summary: `Lead convertido a Reserva con código ${reservationCode}. Seña: $${deposit_amount || 0}.`,
    });

    return NextResponse.json({
      success: true,
      reservation_id: reservation.id,
      reservation_code: reservationCode,
      status: Number(deposit_amount) > 0 ? "senada" : "pendiente_pago",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
