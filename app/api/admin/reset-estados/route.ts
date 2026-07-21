import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST() {
  try {
    const supabase = createAdminClient()

    // Resetear participantes a pendiente
    const { error: errPart } = await supabase
      .from("participantes")
      .update({ estado: "pendiente" })
      .neq("estado", "pendiente")

    if (errPart) {
      return NextResponse.json({ error: errPart.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Todos los estados reseteados a pendiente" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
