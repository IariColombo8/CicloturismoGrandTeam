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

  type InscRow = { nombres: string; apellidos: string; telefono: string | null }

  const inscripcionResult = await supabase
    .from("inscripciones")
    .select("nombres, apellidos, telefono, cedula")
    .eq("cedula", dni)
    .maybeSingle() as { data: InscRow | null; error: unknown }

  const remeraResult = await supabase
    .from("remera")
    .select("*")
    .eq("dni", dni)
    .maybeSingle()

  const insc = inscripcionResult.data
  const remera = remeraResult.data

  return NextResponse.json({
    participante: insc
      ? {
          nombre: `${insc.nombres} ${insc.apellidos}`.trim(),
          telefono: insc.telefono ?? "",
          estaRegistrado: true,
        }
      : null,
    remera: remera ?? null,
  })
}
