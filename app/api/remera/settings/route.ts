import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// GET /api/remera/settings
// Retorna el texto de alias/datos de pago para mostrar en el formulario público.
export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("content_settings")
    .select("data")
    .eq("id", "remera")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ aliasInfo: "" })
  }

  const aliasInfo = (data?.data as Record<string, unknown>)?.aliasInfo ?? ""

  return NextResponse.json({ aliasInfo })
}
