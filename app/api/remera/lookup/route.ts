import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// GET /api/remera/lookup?dni=XXXXXXXX
// Busca datos del participante y un pedido previo de remera por DNI.
export async function GET(req: NextRequest) {
  const dni = req.nextUrl.searchParams.get("dni")?.replace(/\D/g, "").trim()

  if (!dni || !/^\d{7,8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
  }

  const supabase = createAdminClient()

  type ParticipanteRow = {
    nombre: string
    apellido: string
    telefono: string | null
    email: string | null
  }

  const [participanteResult, remeraResult] = await Promise.all([
    supabase
      .from("participantes")
      .select("nombre, apellido, telefono, email")
      .eq("dni", dni)
      .maybeSingle(),
    supabase.from("remera").select("*").eq("dni", dni).maybeSingle(),
  ])

  if (participanteResult.error) {
    console.error("Error buscando participante para remera:", participanteResult.error)
  }
  if (remeraResult.error) {
    console.error("Error buscando pedido de remera:", remeraResult.error)
  }

  const participante = participanteResult.data as ParticipanteRow | null
  const remera = remeraResult.data

  return NextResponse.json({
    participante: participante
      ? {
          nombre: `${participante.nombre} ${participante.apellido}`.trim(),
          telefono: participante.telefono ?? "",
          email: participante.email ?? "",
          estaRegistrado: true,
        }
      : null,
    remera: remera ?? null,
  })
}
