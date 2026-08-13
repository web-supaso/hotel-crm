import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("property_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "property_id, start_date y end_date son requeridos" },
        { status: 400 }
      );
    }

    // 1. Obtener todas las unidades activas de la propiedad
    const { data: units, error: unitsErr } = await supabase
      .from("units")
      .select("id, name, unit_type, capacity_people, base_price_default, currency")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (unitsErr) return NextResponse.json({ error: unitsErr.message }, { status: 500 });

    const unitIds = (units || []).map((u) => u.id);
    if (!unitIds.length) {
      return NextResponse.json({ property_id: propertyId, units: [], bookings: [] });
    }

    // 2. Obtener items de reservas activas que se solapan con el rango (con lte y gte para incluir los límites)
    const { data: resItems, error: itemsErr } = await supabase
      .from("reservation_items")
      .select(`
        id,
        unit_id,
        start_date,
        end_date,
        reservation:reservations(id, reservation_code, guest_name, status, check_in_date, check_out_date)
      `)
      .in("unit_id", unitIds)
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    // Filtrar solo reservas activas (senada, confirmada, in_house, pendiente_pago)
    const activeBookings = (resItems || []).filter(
      (item: any) =>
        item.reservation &&
        ["senada", "confirmada", "in_house", "pendiente_pago"].includes(item.reservation.status)
    );

    return NextResponse.json({
      property_id: propertyId,
      start_date: startDate,
      end_date: endDate,
      units: units || [],
      bookings: activeBookings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
