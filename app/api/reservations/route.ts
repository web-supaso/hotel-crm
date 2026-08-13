import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organization_id");
    const propertyId = searchParams.get("property_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("reservations")
      .select(`
        *,
        property:properties(id, name, property_type, city),
        items:reservation_items(id, item_type, unit_id, experience_id, name, quantity, unit_price, total_price),
        payments:payments(id, amount, payment_type, payment_method, transaction_reference, created_at)
      `)
      .order("check_in_date", { ascending: true });

    if (orgId) query = query.eq("organization_id", orgId);
    if (propertyId) query = query.eq("property_id", propertyId);
    if (status) query = query.eq("status", status);

    const { data: reservations, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(reservations ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
