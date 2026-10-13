import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { enviarEmail } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"
import { htmlATexto } from "@/lib/google/mime"
import { renderizarPlantilla, NOMBRES_PLANTILLA } from "@/lib/email/templates"
import { registrarEnvio } from "@/lib/email/registro"

export const dynamic = "force-dynamic"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_DESTINATARIOS = 50

/** Normaliza y valida una lista de destinatarios. */
function normalizarDestinatarios(valor: unknown): { emails: string[]; invalidos: string[] } {
  const crudos = Array.isArray(valor)
    ? valor.map(String)
    : String(valor ?? "").split(/[,;]/)

  const emails: string[] = []
  const invalidos: string[] = []

  for (const item of crudos) {
    const email = item.trim()
    if (!email) continue
    if (EMAIL_REGEX.test(email)) emails.push(email)
    else invalidos.push(email)
  }

  return { emails: Array.from(new Set(emails)), invalidos }
}

/**
 * POST /api/email/send
 *
 * Body (una plantilla del repo):
 *   { para, plantilla: "confirmacion" | "rechazo" | "generico", datos: {...} }
 *
 * Body (contenido propio):
 *   { para, asunto, html?, texto?, cc?, bcc? }
 *
 * Con `individual: true` y varios destinatarios, manda un email por persona
 * (nadie ve el resto de las direcciones). Sin esa bandera va un solo email con
 * todos en el "To".
 */
export async function POST(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error
  const { email: remitenteUsuario } = auth.ok

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 })
  }

  const { emails: para, invalidos } = normalizarDestinatarios(body.para ?? body.to ?? body.email)

  if (para.length === 0) {
    return NextResponse.json(
      {
        error: invalidos.length
          ? `Ningun destinatario valido. Revisa: ${invalidos.join(", ")}`
          : "Falta el destinatario (para)",
      },
      { status: 400 }
    )
  }

  if (para.length > MAX_DESTINATARIOS) {
    return NextResponse.json(
      { error: `Demasiados destinatarios (${para.length}). El maximo por envio es ${MAX_DESTINATARIOS}.` },
      { status: 400 }
    )
  }

  // --- Contenido: plantilla del repo o HTML/texto propio -------------------
  let asunto = String(body.asunto ?? body.subject ?? "").trim()
  let html = typeof body.html === "string" ? body.html : undefined
  let texto = typeof body.texto === "string" ? body.texto : undefined
  const plantilla = typeof body.plantilla === "string" ? body.plantilla : ""

  if (plantilla) {
    if (!NOMBRES_PLANTILLA.includes(plantilla as never)) {
      return NextResponse.json(
        { error: `Plantilla desconocida "${plantilla}". Opciones: ${NOMBRES_PLANTILLA.join(", ")}` },
        { status: 400 }
      )
    }

    try {
      const datos = (body.datos as Record<string, unknown>) || {}
      const render = renderizarPlantilla(plantilla, datos)
      html = render.html
      texto = render.texto
      // Un asunto explicito en el body gana sobre el de la plantilla.
      asunto = asunto || render.asunto
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No se pudo renderizar la plantilla" },
        { status: 400 }
      )
    }
  }

  if (!asunto) {
    return NextResponse.json({ error: "Falta el asunto" }, { status: 400 })
  }

  if (!html && !texto) {
    return NextResponse.json({ error: "El email no tiene contenido" }, { status: 400 })
  }

  if (!texto && html) texto = htmlATexto(html)

  const cc = body.cc ? normalizarDestinatarios(body.cc).emails : undefined
  const bcc = body.bcc ? normalizarDestinatarios(body.bcc).emails : undefined
  const individual = body.individual === true && para.length > 1

  try {
    if (individual) {
      const resultados: { email: string; ok: boolean; error?: string }[] = []

      // Secuencial a proposito: Gmail limita la tasa de envio y asi un fallo
      // puntual no arrastra al resto.
      for (const destinatario of para) {
        try {
          await enviarEmail({ para: destinatario, asunto, html, texto, cc, bcc })
          resultados.push({ email: destinatario, ok: true })
        } catch (error) {
          resultados.push({
            email: destinatario,
            ok: false,
            error: error instanceof Error ? error.message : "Error desconocido",
          })
        }
      }

      const enviados = resultados.filter((r) => r.ok).length

      await registrarEnvio({
        destinatarios: para,
        asunto,
        plantilla: plantilla || null,
        enviadoPor: remitenteUsuario,
        exito: enviados > 0,
        detalle: `${enviados}/${para.length} enviados`,
      })

      return NextResponse.json({
        success: enviados > 0,
        enviados,
        total: para.length,
        resultados,
        invalidos,
      })
    }

    const resultado = await enviarEmail({ para, asunto, html, texto, cc, bcc })

    await registrarEnvio({
      destinatarios: para,
      asunto,
      plantilla: plantilla || null,
      enviadoPor: remitenteUsuario,
      exito: true,
      detalle: resultado.id,
    })

    return NextResponse.json({
      success: true,
      id: resultado.id,
      threadId: resultado.threadId,
      enviados: para.length,
      invalidos,
    })
  } catch (error) {
    await registrarEnvio({
      destinatarios: para,
      asunto,
      plantilla: plantilla || null,
      enviadoPor: remitenteUsuario,
      exito: false,
      detalle: error instanceof Error ? error.message : "Error desconocido",
    })

    return respuestaErrorGmail(error)
  }
}
