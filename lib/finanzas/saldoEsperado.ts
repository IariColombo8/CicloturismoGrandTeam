// lib/finanzas/saldoEsperado.ts
// Calcula cuanta plata "deberia" haber en la cuenta del BNA en este momento.
// Lo usa la notificacion de inscripcion nueva, para avisar en el mismo mensaje
// cuanto tendria que haber entrado si todos los inscriptos transfirieron.
//
// Replica el criterio de la calculadora de caja (/admin/gastos):
//   entra  = inscripciones cobradas + inscripciones pendientes (si transfirieron)
//            + ingresos ya cobrados
//   sale   = gastos aprobados y efectivamente pagados
//
// Uso exclusivo en servidor (usa el cliente admin de Supabase).

import { createAdminClient } from "@/lib/supabase-admin"

/** Edicion vigente del evento. */
const EDICION_ACTUAL = 2026
const PRECIO_FALLBACK = 25000

export interface SaldoEsperado {
  /** Plata que deberia haber en la cuenta. */
  total: number
  /** Cobrado por inscripciones ya confirmadas. */
  inscripcionesConfirmadas: number
  /** Lo que sumarian las pendientes si todas transfirieron. */
  inscripcionesPendientes: number
  ingresosCobrados: number
  gastosPagados: number
  /** Cantidad de inscriptos confirmados (los gastos por participante los usan). */
  confirmados: number
  pendientes: number
  precio: number
}

/**
 * Calcula el saldo esperado. Si algo falla devuelve null: la notificacion se
 * manda igual sin el monto, antes que no avisar la inscripcion nueva.
 */
export async function calcularSaldoEsperado(): Promise<SaldoEsperado | null> {
  try {
    const supabase = createAdminClient()

    const [settingsRes, participantesRes, ingresosRes, gastosRes] = await Promise.all([
      supabase.from("event_settings").select("precio").eq("id", "eventSettings").maybeSingle(),
      supabase
        .from("participantes")
        .select("estado, monto_pagado, pago_estado")
        .contains("anios", [EDICION_ACTUAL]),
      supabase.from("ingresos").select("monto, estado"),
      supabase.from("gastos").select("monto, estado, pagado, por_participante"),
    ])

    const precio =
      Number((settingsRes.data as { precio: string | number } | null)?.precio) || PRECIO_FALLBACK

    const participantes = (participantesRes.data || []) as {
      estado: string
      monto_pagado: number | null
      pago_estado: string | null
    }[]

    let inscripcionesConfirmadas = 0
    let inscripcionesPendientes = 0
    let confirmados = 0
    let pendientes = 0

    for (const p of participantes) {
      if (p.estado === "confirmada") {
        confirmados += 1
        // Una inscripcion confirmada pero marcada como impaga o gratis no
        // aporta plata a la cuenta.
        if (p.pago_estado === "gratis" || p.pago_estado === "pendiente") continue
        inscripcionesConfirmadas += p.monto_pagado != null ? Number(p.monto_pagado) : precio
      } else if (p.estado === "pendiente") {
        pendientes += 1
        // Se inscribieron y subieron comprobante: la plata deberia estar en la
        // cuenta aunque todavia no se haya verificado.
        inscripcionesPendientes += precio
      }
    }

    const ingresos = (ingresosRes.data || []) as { monto: number; estado: string }[]
    const ingresosCobrados = ingresos
      .filter((i) => i.estado === "cobrado")
      .reduce((suma, i) => suma + Number(i.monto || 0), 0)

    const gastos = (gastosRes.data || []) as {
      monto: number
      estado: string
      pagado: boolean | null
      por_participante: boolean | null
    }[]
    const gastosPagados = gastos
      .filter((g) => g.estado === "aprobado" && g.pagado)
      .reduce(
        (suma, g) => suma + Number(g.monto || 0) * (g.por_participante ? confirmados : 1),
        0
      )

    return {
      total:
        inscripcionesConfirmadas + inscripcionesPendientes + ingresosCobrados - gastosPagados,
      inscripcionesConfirmadas,
      inscripcionesPendientes,
      ingresosCobrados,
      gastosPagados,
      confirmados,
      pendientes,
      precio,
    }
  } catch (error) {
    console.warn(
      "[finanzas] no se pudo calcular el saldo esperado:",
      error instanceof Error ? error.message : error
    )
    return null
  }
}

/** Formatea un monto en pesos para mostrar en la notificacion. */
export function formatearPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`
}
