import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reservationId } = await params;
    const supabase = getAdminClient();
    const body = await req.json();

    const { amount, payment_type, payment_method, transaction_reference, notes } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "El monto del pago debe ser mayor a 0" }, { status: 400 });
    }

    const { data: res, error: resErr } = await supabase
      .from("reservations")
      .select("organization_id, reservation_code, currency")
      .eq("id", reservationId)
      .single();

    if (resErr || !res) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        organization_id: res.organization_id,
        reservation_id: reservationId,
        amount: Number(amount),
        currency: res.currency,
        payment_type: payment_type || "balance_saldo",
        payment_method: payment_method || "bank_transfer",
        transaction_reference: transaction_reference || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (payErr) {
      return NextResponse.json({ error: "Error al registrar el pago", details: payErr.message }, { status: 500 });
    }

    // Auditoría en Timeline
    await supabase.from("interactions").insert({
      organization_id: res.organization_id,
      reservation_id: reservationId,
      type: "note",
      summary: `Pago registrado: $${amount} (${payment_type || 'saldo'} vía ${payment_method || 'transferencia'}).`,
    });

    // Consultar reserva con saldos actualizados por el trigger
    const { data: updatedRes } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    return NextResponse.json({
      success: true,
      payment,
      reservation: updatedRes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
