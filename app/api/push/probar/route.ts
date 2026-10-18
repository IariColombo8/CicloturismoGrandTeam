import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { enviarPushATodos } from "@/lib/push/enviar"
import { calcularSaldoEsperado, formatearPesos } from "@/lib/finanzas/saldoEsperado"
import { CUENTA } from "@/lib/finanzas/cuenta"

export const dynamic = "force-dynamic"

/**
 * POST /api/push/probar
 * Manda una notificacion de prueba a todos los dispositivos registrados, con
 * el mismo formato que la de una inscripcion real.
 */
export async function POST(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error

  const saldo = await calcularSaldoEsperado()

  const resultado = await enviarPushATodos({
    titulo: "Prueba: nueva inscripcion",
    cuerpo: saldo
      ? `Juan Perez (prueba)\nEn ${CUENTA} deberia haber ${formatearPesos(
          saldo.verificado + saldo.precio
        )} con esta`
      : "Juan Perez (prueba)",
    url: "/admin/registro-inscripciones",
    tag: "prueba",
  })

  return NextResponse.json({
    success: resultado.enviadas > 0,
    ...resultado,
    saldo: saldo ? saldo.verificado + saldo.precio : null,
  })
}
