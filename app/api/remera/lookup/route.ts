import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// GET /api/remera/lookup?dni=XXXXXXXX
// Busca datos del participante (inscripto o no) y pedido previo de remera por DNI.
export async function GET(req: NextRequest) {
  const dni = req.nextUrl.searchParams.get("dni")?.trim()

  if (!dni || dni.length < 7) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
  }

  const supabase = createAdminClient()

  type ParticipanteRow = { nombre: string; apellido: string; telefono: string | null }

  const participanteResult = (await supabase
    .from("participantes")
    .select("nombre, apellido, telefono")
    .eq("dni", dni)
    .maybeSingle()) as { data: ParticipanteRow | null; error: unknown }

  const remeraResult = await supabase
    .from("remera")
    .select("*")
    .eq("dni", dni)
    .maybeSingle()

  const participante = participanteResult.data
  const remera = remeraResult.data

  return NextResponse.json({
    participante: participante
      ? {
          nombre: `${participante.nombre} ${participante.apellido}`.trim(),
          telefono: participante.telefono ?? "",
          estaRegistrado: true,
        }
      : null,
    remera: remera ?? null,
  })
}
