import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getAdminClient();

    // Consulta ligera a la base de datos para registrar actividad y mantener la instancia despierta
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase keep-alive ping exitoso",
      timestamp: new Date().toISOString(),
      active: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Error al conectar con Supabase",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
