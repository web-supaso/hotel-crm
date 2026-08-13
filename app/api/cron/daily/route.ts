import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();

    // 1. Marcar automáticamente como checkout las reservas in_house cuya fecha de salida ya pasó
    const today = new Date().toISOString().split("T")[0];
    const { data: expiredInHouse, error: expErr } = await supabase
      .from("reservations")
      .update({ status: "checkout", updated_at: new Date().toISOString() })
      .eq("status", "in_house")
      .lt("check_out_date", today)
      .select("id, reservation_code");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkouts_processed: expiredInHouse?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}