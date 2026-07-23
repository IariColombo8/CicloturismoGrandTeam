import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { REMERA_CONTENT_DEFAULTS } from "@/lib/remeraContent"

// GET /api/remera/settings
// Retorna alias/precio/talles para mostrar en el formulario público de pedido.
export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("content_settings")
    .select("data")
    .eq("id", "remera")
    .maybeSingle()

  if (error) {
    return NextResponse.json({
      aliasInfo: "",
      price: "",
      talles: REMERA_CONTENT_DEFAULTS.talles,
      sizeChartImageUrl: "",
    })
  }

  const contenido = (data?.data as Record<string, unknown>) ?? {}
  const aliasInfo = (contenido.aliasInfo as string) ?? ""
  const price = (contenido.price as string) ?? ""
  const sizeChartImageUrl = (contenido.sizeChartImageUrl as string) ?? ""
  const talles =
    Array.isArray(contenido.talles) && contenido.talles.length > 0
      ? (contenido.talles as string[])
      : REMERA_CONTENT_DEFAULTS.talles

  return NextResponse.json({ aliasInfo, price, talles, sizeChartImageUrl })
}
