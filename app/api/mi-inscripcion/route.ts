import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { CURRENT_YEAR } from "@/lib/inscripcion-schema"

// GET /api/mi-inscripcion?dni=XXXXXXXX
// Alimenta la pagina publica /mi-qr: estado de la inscripcion, QR de
// acreditacion y pedido de remera asociado.
//
// Devuelve solo los campos que la pagina muestra. Nunca expone comprobantes
// de pago, direcciones completas ni datos de contacto de terceros.

export async function GET(req: NextRequest) {
  const dni = req.nextUrl.searchParams.get("dni")?.replace(/\D/g, "").trim()

  if (!dni || !/^\d{7,8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
  }

  const supabase = createAdminClient()

  type ParticipanteRow = {
    nombre: string
    apellido: string
    estado: string
    numero_inscripcion: number | null
    token_qr: string | null
    anios: number[] | null
  }

  const { data, error } = (await supabase
    .from("participantes")
    .select("nombre, apellido, estado, numero_inscripcion, token_qr, anios")
    .eq("dni", dni)
    .maybeSingle()) as { data: ParticipanteRow | null; error: { message: string } | null }

  if (error) {
    console.error("Error buscando inscripción para /mi-qr:", error)
    return NextResponse.json({ error: "No pudimos buscar tu inscripción" }, { status: 500 })
  }

  // Solo cuenta si esta inscripto en la edicion actual, que es lo que ve el
  // admin en /admin/registro-inscripciones.
  const inscriptoEsteAnio = !!data && (data.anios ?? []).includes(CURRENT_YEAR)
  if (!inscriptoEsteAnio) {
    return NextResponse.json({ encontrada: false })
  }

  type RemeraRow = {
    items: unknown
    envio_tipo: string | null
    estado: string | null
    entregado: boolean | null
    ciudad: string | null
  }

  const { data: remera } = (await supabase
    .from("remera")
    .select("items, envio_tipo, estado, entregado, ciudad")
    .eq("dni", dni)
    .maybeSingle()) as { data: RemeraRow | null }

  return NextResponse.json({
    encontrada: true,
    inscripcion: {
      nombre: data!.nombre,
      apellido: data!.apellido,
      estado: data!.estado,
      numeroInscripcion: data!.numero_inscripcion,
      // El QR solo viaja si la inscripcion esta confirmada: es la credencial
      // de acreditacion y no tiene sentido antes de aprobar el pago.
      tokenQR: data!.estado === "confirmada" ? data!.token_qr : null,
    },
    remera: remera
      ? {
          items: Array.isArray(remera.items) ? remera.items : [],
          envioTipo: remera.envio_tipo,
          estado: remera.estado,
          entregado: !!remera.entregado,
          ciudad: remera.ciudad,
        }
      : null,
  })
}
