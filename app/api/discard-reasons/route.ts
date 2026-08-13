import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organization_id");

    let query = supabase
      .from("discard_reasons")
      .select("id, code, label, organization_id")
      .eq("is_active", true)
      .order("label", { ascending: true });

    if (orgId) query = query.eq("organization_id", orgId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
