import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { responderHilo } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"
import { escaparHtml, templateGenerico } from "@/lib/email/templates"
import { registrarEnvio } from "@/lib/email/registro"

export const dynamic = "force-dynamic"

/**
 * POST /api/email/reply
 * Body: { threadId, texto, conPlantilla?: boolean, cc? }
 *
 * Responde al hilo manteniendo el enhebrado en Gmail. Por defecto manda la
 * respuesta como texto con un HTML simple; con `conPlantilla: true` usa el
 * marco visual del evento.
 */
export async function POST(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error
  const { email: enviadoPor } = auth.ok

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const threadId = String(body?.threadId || "").trim()
  const texto = String(body?.texto || "").trim()

  if (!threadId) {
    return NextResponse.json({ error: "Falta el threadId" }, { status: 400 })
  }
  if (!texto) {
    return NextResponse.json({ error: "La respuesta esta vacia" }, { status: 400 })
  }

  const cc = typeof body?.cc === "string" ? body.cc : undefined

  // Respuesta simple: HTML minimo que respeta los saltos de linea. La
  // plantilla completa se reserva para comunicaciones formales.
  const html =
    body?.conPlantilla === true
      ? templateGenerico({ titulo: "Grand Team Bike", mensaje: texto }).html
      : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;">${escaparHtml(
          texto
        ).replace(/\n/g, "<br>")}</div>`

  try {
    const resultado = await responderHilo({ threadId, texto, html, cc })

    await registrarEnvio({
      destinatarios: [`hilo:${threadId}`],
      asunto: "(respuesta en hilo)",
      plantilla: null,
      enviadoPor,
      exito: true,
      detalle: resultado.id,
    })

    return NextResponse.json({ success: true, id: resultado.id, threadId: resultado.threadId })
  } catch (error) {
    return respuestaErrorGmail(error)
  }
}
