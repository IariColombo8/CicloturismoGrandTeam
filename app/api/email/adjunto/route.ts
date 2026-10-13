import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { obtenerAdjunto } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"

export const dynamic = "force-dynamic"

/** Deja solo caracteres seguros para el header Content-Disposition. */
function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "adjunto"
}

/**
 * GET /api/email/adjunto?mensajeId=X&adjuntoId=Y&nombre=archivo.pdf
 * Descarga un adjunto de un email recibido. Pasa por el servidor porque el
 * cliente no tiene (ni debe tener) el token de Google.
 */
export async function GET(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error

  const params = req.nextUrl.searchParams
  const mensajeId = (params.get("mensajeId") || "").trim()
  const adjuntoId = (params.get("adjuntoId") || "").trim()
  const nombre = nombreSeguro(params.get("nombre") || "adjunto")
  const mimeType = params.get("mimeType") || "application/octet-stream"

  if (!mensajeId || !adjuntoId) {
    return NextResponse.json({ error: "Faltan mensajeId y/o adjuntoId" }, { status: 400 })
  }

  try {
    const contenido = await obtenerAdjunto(mensajeId, adjuntoId)

    return new NextResponse(new Uint8Array(contenido), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Content-Length": String(contenido.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return respuestaErrorGmail(error)
  }
}
