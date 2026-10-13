import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { CURRENT_YEAR } from "@/lib/inscripcion-schema"
import { enviarEmail } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"
import { templateConfirmacion } from "@/lib/email/templates"
import { buscarEstadoRemera } from "@/lib/email/remera"
import { registrarEnvio } from "@/lib/email/registro"

export const dynamic = "force-dynamic"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Ventana y tope del rate limit. Es best-effort: en serverless cada instancia
// tiene su propio Map, pero alcanza para frenar el reenvio repetido desde una
// misma sesion, que es el caso real.
const VENTANA_MS = 10 * 60 * 1000
const MAX_INTENTOS = 3

const intentos = new Map<string, { cantidad: number; reinicioEn: number }>()

function superaLimite(clave: string): boolean {
  const ahora = Date.now()
  const registro = intentos.get(clave)

  if (!registro || registro.reinicioEn < ahora) {
    intentos.set(clave, { cantidad: 1, reinicioEn: ahora + VENTANA_MS })
    return false
  }

  registro.cantidad += 1
  return registro.cantidad > MAX_INTENTOS
}

/**
 * POST /api/mi-inscripcion/reenviar-confirmacion
 * Body: { dni, email }
 *
 * Reenvia el mail de confirmacion (con el QR) al participante que lo pide
 * desde /mi-qr.
 *
 * Es una ruta PUBLICA y el QR es la credencial de acreditacion, asi que solo
 * se envia a la direccion que ya figura en la inscripcion: no se puede usar
 * para mandar el QR de otra persona a un correo cualquiera. Para cambiar el
 * email hay que pedirselo al admin.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null

  const dni = String(body?.dni ?? "").replace(/\D/g, "").trim()
  const email = String(body?.email ?? "").trim()

  if (!/^\d{7,8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI invalido" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Escribi un email valido" }, { status: 400 })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip"
  if (superaLimite(`${dni}:${ip}`)) {
    return NextResponse.json(
      { error: "Ya pediste el reenvio varias veces. Esperá unos minutos o escribinos." },
      { status: 429 }
    )
  }

  const supabase = createAdminClient()

  type ParticipanteRow = {
    nombre: string
    apellido: string
    email: string | null
    estado: string
    numero_inscripcion: number | null
    token_qr: string | null
    anios: number[] | null
  }

  const { data, error } = (await supabase
    .from("participantes")
    .select("nombre, apellido, email, estado, numero_inscripcion, token_qr, anios")
    .eq("dni", dni)
    .maybeSingle()) as { data: ParticipanteRow | null; error: { message: string } | null }

  if (error) {
    console.error("Error buscando inscripcion para reenvio:", error)
    return NextResponse.json({ error: "No pudimos buscar tu inscripcion" }, { status: 500 })
  }

  const inscriptoEsteAnio = !!data && (data.anios ?? []).includes(CURRENT_YEAR)
  if (!inscriptoEsteAnio) {
    return NextResponse.json({ error: "No encontramos tu inscripcion" }, { status: 404 })
  }

  if (data!.estado !== "confirmada" && data!.estado !== "aprobado") {
    return NextResponse.json(
      { error: "Tu inscripcion todavia no esta confirmada, asi que no hay QR para enviarte." },
      { status: 409 }
    )
  }

  const emailRegistrado = (data!.email || "").trim()
  if (!emailRegistrado || emailRegistrado.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "Ese correo no coincide con el de tu inscripcion. Si te equivocaste al inscribirte, escribinos y lo corregimos.",
      },
      { status: 403 }
    )
  }

  const nombreCompleto = `${data!.nombre} ${data!.apellido}`.trim()
  const remera = await buscarEstadoRemera(dni)

  const render = templateConfirmacion({
    nombreCompleto,
    numeroInscripcion: data!.numero_inscripcion,
    tokenQR: data!.token_qr,
    ubicacion: "Concepcion del Uruguay, Entre Rios",
    remera,
  })

  try {
    const resultado = await enviarEmail({
      para: emailRegistrado,
      asunto: render.asunto,
      html: render.html,
      texto: render.texto,
    })

    await registrarEnvio({
      destinatarios: [emailRegistrado],
      asunto: render.asunto,
      plantilla: "confirmacion",
      enviadoPor: `autogestion:${dni}`,
      exito: true,
      detalle: resultado.id,
    })

    return NextResponse.json({
      success: true,
      mensaje: `Te reenviamos la confirmacion a ${emailRegistrado}. Revisá tambien el correo no deseado.`,
    })
  } catch (error) {
    await registrarEnvio({
      destinatarios: [emailRegistrado],
      asunto: render.asunto,
      plantilla: "confirmacion",
      enviadoPor: `autogestion:${dni}`,
      exito: false,
      detalle: error instanceof Error ? error.message : "Error desconocido",
    })

    return respuestaErrorGmail(error)
  }
}
