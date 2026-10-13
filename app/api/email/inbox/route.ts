import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { listarHilos } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"

export const dynamic = "force-dynamic"

/** Carpetas que puede pedir el panel, mapeadas a etiquetas/busquedas de Gmail. */
const CARPETAS: Record<string, { etiquetas?: string[]; q?: string }> = {
  recibidos: { etiquetas: ["INBOX"] },
  "no-leidos": { etiquetas: ["INBOX", "UNREAD"] },
  enviados: { etiquetas: ["SENT"] },
  archivados: { q: "-in:inbox -in:sent -in:trash -in:spam -in:draft" },
  papelera: { etiquetas: ["TRASH"] },
  todos: { q: "-in:trash -in:spam" },
}

/**
 * GET /api/email/inbox?carpeta=recibidos&q=texto&pageToken=...&max=25
 * Lista los hilos de la casilla configurada con los metadatos de la bandeja.
 */
export async function GET(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error

  const params = req.nextUrl.searchParams
  const carpeta = params.get("carpeta") || "recibidos"
  const busqueda = (params.get("q") || "").trim()
  const pageToken = params.get("pageToken") || undefined
  const max = Number(params.get("max") || 25)

  const config = CARPETAS[carpeta]
  if (!config) {
    return NextResponse.json(
      { error: `Carpeta invalida. Opciones: ${Object.keys(CARPETAS).join(", ")}` },
      { status: 400 }
    )
  }

  // La busqueda libre del usuario se combina con el filtro de la carpeta.
  const q = [config.q, busqueda].filter(Boolean).join(" ") || undefined

  try {
    const resultado = await listarHilos({
      q,
      etiquetas: config.etiquetas,
      maxResultados: Number.isFinite(max) ? max : 25,
      pageToken,
    })

    return NextResponse.json({ success: true, carpeta, ...resultado })
  } catch (error) {
    return respuestaErrorGmail(error)
  }
}
