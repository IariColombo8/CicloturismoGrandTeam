import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { modificarEtiquetasHilo, obtenerHilo } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"

export const dynamic = "force-dynamic"

/**
 * GET /api/email/thread?id=<threadId>&marcarLeido=1
 * Devuelve el hilo completo con el cuerpo de cada mensaje ya parseado y
 * saneado. Por defecto marca el hilo como leido (igual que abrirlo en Gmail).
 */
export async function GET(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error

  const id = (req.nextUrl.searchParams.get("id") || "").trim()
  if (!id) {
    return NextResponse.json({ error: "Falta el id del hilo" }, { status: 400 })
  }

  const marcarLeido = req.nextUrl.searchParams.get("marcarLeido") !== "0"

  try {
    const hilo = await obtenerHilo(id)

    if (marcarLeido && hilo.mensajes.some((m) => m.noLeido)) {
      // Si falla el marcado no tiene sentido romper la lectura del hilo.
      await modificarEtiquetasHilo(id, { quitar: ["UNREAD"] }).catch(() => undefined)
    }

    return NextResponse.json({ success: true, hilo })
  } catch (error) {
    return respuestaErrorGmail(error)
  }
}
