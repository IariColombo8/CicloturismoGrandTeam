import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { variablesFaltantes } from "@/lib/google/oauth"
import { obtenerPerfil } from "@/lib/google/gmail"

export const dynamic = "force-dynamic"

/**
 * GET /api/email/estado
 * Diagnostico de la integracion con Gmail: que variables faltan y si el
 * refresh token todavia sirve. No devuelve ningun secreto.
 */
export async function GET(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error

  const faltantes = variablesFaltantes()

  if (faltantes.length > 0) {
    return NextResponse.json({
      configurado: false,
      faltantes,
      mensaje: `Faltan variables de entorno: ${faltantes.join(", ")}. Ver docs/gmail-setup.md`,
    })
  }

  try {
    const perfil = await obtenerPerfil()
    return NextResponse.json({
      configurado: true,
      faltantes: [],
      casilla: perfil.emailAddress,
      totalMensajes: perfil.messagesTotal,
      totalHilos: perfil.threadsTotal,
    })
  } catch (error) {
    return NextResponse.json({
      configurado: false,
      faltantes: [],
      mensaje: error instanceof Error ? error.message : "No se pudo conectar con Gmail",
    })
  }
}
