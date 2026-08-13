import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Leads nuevos sin contactar (>24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: uncontactedLeads } = await supabase
      .from("leads")
      .select("id, guest_name, created_at, organization:organizations(name)")
      .eq("status", "nuevo")
      .lt("created_at", oneDayAgo)
      .limit(10);

    // 2. Reservas próximas a llegar con saldo pendiente
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const { data: upcomingWithBalance } = await supabase
      .from("reservations")
      .select("id, reservation_code, guest_name, check_in_date, balance_pending")
      .gte("check_in_date", today)
      .lte("check_in_date", nextWeek)
      .gt("balance_pending", 0)
      .limit(10);

    const alerts = [
      ...(uncontactedLeads || []).map((l: any) => ({
        id: `lead-uncontacted-${l.id}`,
        type: "lead_uncontacted",
        title: `Lead sin contactar: ${l.guest_name}`,
        subtitle: `Registrado hace más de 24 horas sin avance comercial.`,
        href: `/leads/${l.id}`,
        severity: "warning",
      })),
      ...(upcomingWithBalance || []).map((r: any) => ({
        id: `res-balance-${r.id}`,
        type: "upcoming_balance",
        title: `Saldo pendiente: ${r.guest_name} (${r.reservation_code})`,
        subtitle: `Llegada el ${r.check_in_date}. Saldo: $${r.balance_pending.toLocaleString("es-AR")}.`,
        href: `/reservations`,
        severity: "info",
      })),
    ];

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}