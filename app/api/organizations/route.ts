import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();

    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        base_currency,
        api_inbound_key,
        properties:properties(
          id,
          name,
          property_type,
          city,
          units:units(id, name, unit_type, capacity_people, base_price_default)
        ),
        experiences:experiences_catalog(id, name, base_price, description)
      `)
      .order("name", { ascending: true });

    if (orgErr) {
      console.error("Error fetching organizations:", orgErr);
      return NextResponse.json({ error: orgErr.message, data: [] }, { status: 200 });
    }

    return NextResponse.json(orgs ?? []);
  } catch (err: any) {
    console.error("Crash in organizations route:", err);
    return NextResponse.json([], { status: 200 });
  }
}
