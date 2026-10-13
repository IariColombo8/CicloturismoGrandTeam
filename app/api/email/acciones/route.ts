import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { modificarEtiquetasHilo, moverHiloAPapelera } from "@/lib/google/gmail"
import { respuestaErrorGmail } from "@/lib/google/errores"

export const dynamic = "force-dynamic"

type Accion = "leido" | "no-leido" | "archivar" | "a-recibidos" | "destacar" | "no-destacar" | "papelera"

const ACCIONES: Record<Exclude<Accion, "papelera">, { agregar?: string[]; quitar?: string[] }> = {
  leido: { quitar: ["UNREAD"] },
  "no-leido": { agregar: ["UNREAD"] },
  archivar: { quitar: ["INBOX"] },
  "a-recibidos": { agregar: ["INBOX"] },
  destacar: { agregar: ["STARRED"] },
  "no-destacar": { quitar: ["STARRED"] },
}

/**
 * POST /api/email/acciones
 * Body: { threadIds: string[], accion }
 * Acciones: leido, no-leido, archivar, a-recibidos, destacar, no-destacar, papelera.
 */
export async function POST(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null

  const threadIds = Array.isArray(body?.threadIds)
    ? body.threadIds.map(String).filter(Boolean)
    : [String(body?.threadId || "")].filter(Boolean)

  const accion = String(body?.accion || "") as Accion

  if (threadIds.length === 0) {
    return NextResponse.json({ error: "Falta threadId(s)" }, { status: 400 })
  }

  if (accion !== "papelera" && !ACCIONES[accion as Exclude<Accion, "papelera">]) {
    return NextResponse.json(
      { error: `Accion invalida. Opciones: ${[...Object.keys(ACCIONES), "papelera"].join(", ")}` },
      { status: 400 }
    )
  }

  try {
    for (const id of threadIds) {
      if (accion === "papelera") {
        await moverHiloAPapelera(id)
      } else {
        await modificarEtiquetasHilo(id, ACCIONES[accion as Exclude<Accion, "papelera">])
      }
    }

    return NextResponse.json({ success: true, afectados: threadIds.length })
  } catch (error) {
    return respuestaErrorGmail(error)
  }
}
