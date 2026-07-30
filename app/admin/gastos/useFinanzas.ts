"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Gasto, Ingreso, InscripcionPago, Movimiento } from "./tipos"
import { formatARS, montoEfectivo, totalGasto } from "./tipos"

const ESTADO_CONFIRMADA = "confirmada"
const ESTADO_PENDIENTE = "pendiente"

// "participantes" es historico y acumula todas las ediciones en el array anios[].
// Las finanzas son de la edicion actual, asi que siempre filtramos por anio.
const EDICION_ACTUAL = 2026

interface UseFinanzasResult {
  gastos: Gasto[]
  ingresos: Ingreso[]
  inscripciones: InscripcionPago[]
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  resumen: ResumenFinanciero
  /** Gastos, ingresos e inscripciones unificados para la vista "Todo". */
  movimientos: Movimiento[]
}

export interface ResumenFinanciero {
  /** Inscripciones con estado "confirmada". */
  confirmados: number
  /** Confirmadas + pendientes (proyeccion si todos confirman). */
  inscriptosTotales: number
  /** Ingresos por inscripciones confirmadas. */
  ingresoInscripciones: number
  /** Ingresos por inscripciones si tambien confirmaran las pendientes. */
  ingresoInscripcionesProyectado: number
  /** Ingresos manuales ya cobrados (sponsors, donaciones, etc). */
  ingresosCobrados: number
  /** Ingresos manuales comprometidos pero aun no cobrados. */
  ingresosPorCobrar: number
  /** Plata realmente ingresada: inscripciones confirmadas + ingresos cobrados. */
  totalIngresos: number
  /** Proyeccion optimista: suma pendientes de inscripcion y de cobro. */
  totalIngresosProyectado: number
  /** Gastos aprobados calculados sobre confirmados. */
  gastosAprobados: number
  /** Gastos aprobados calculados sobre confirmados + pendientes. */
  gastosAprobadosProyectado: number
  /** Gastos propuestos aun sin aprobar (deuda potencial). */
  gastosPendientes: number
  /** totalIngresos - gastosAprobados. */
  balance: number
  /** Balance considerando proyecciones y gastos pendientes. */
  balanceProyectado: number
  /** Inscriptos confirmados que pagaron distinto al precio base. */
  pagosDiferentes: InscripcionPago[]
  /** Diferencia total contra lo que se deberia haber cobrado. */
  diferenciaPagos: number
}

function mapGasto(g: any): Gasto {
  return {
    id: g.id,
    descripcion: g.descripcion,
    monto: Number(g.monto) || 0,
    porParticipante: Boolean(g.por_participante),
    categoria: g.categoria,
    estado: g.estado,
    fecha: g.fecha,
    comprobante: g.comprobante,
    creadoPor: g.creado_por,
    rolCreador: g.rol_creador,
    aprobadoPor: g.aprobado_por,
    fechaAprobacion: g.fecha_aprobacion,
    motivoRechazo: g.motivo_rechazo,
  }
}

function mapIngreso(i: any): Ingreso {
  return {
    id: i.id,
    descripcion: i.descripcion,
    monto: Number(i.monto) || 0,
    categoria: i.categoria,
    estado: i.estado,
    fecha: i.fecha,
    comprobante: i.comprobante,
    creadoPor: i.creado_por,
    notas: i.notas,
  }
}

function mapInscripcion(i: any): InscripcionPago {
  return {
    id: i.id,
    nombre: i.nombre || "",
    apellido: i.apellido || "",
    dni: i.dni,
    estado: i.estado || ESTADO_PENDIENTE,
    montoPagado: i.monto_pagado === null || i.monto_pagado === undefined ? null : Number(i.monto_pagado),
  }
}

/**
 * Carga gastos, ingresos e inscripciones y calcula el resumen financiero.
 * Se resuscribe a cambios en tiempo real de gastos e ingresos.
 */
export function useFinanzas(precioBase: number, habilitado: boolean): UseFinanzasResult {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [inscripciones, setInscripciones] = useState<InscripcionPago[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const [resGastos, resIngresos, resInscripciones] = await Promise.all([
        supabase.from("gastos").select("*").order("fecha", { ascending: false }),
        supabase.from("ingresos").select("*").order("fecha", { ascending: false }),
        supabase
          .from("participantes")
          .select("id, nombre, apellido, dni, estado, monto_pagado")
          .contains("anios", [EDICION_ACTUAL])
          .in("estado", [ESTADO_CONFIRMADA, ESTADO_PENDIENTE]),
      ])

      if (resGastos.error) throw resGastos.error
      if (resInscripciones.error) throw resInscripciones.error

      setGastos((resGastos.data || []).map(mapGasto))
      // La tabla ingresos puede no existir todavia si falta correr la migracion.
      setIngresos(resIngresos.error ? [] : (resIngresos.data || []).map(mapIngreso))
      setInscripciones((resInscripciones.data || []).map(mapInscripcion))
      setError(null)
    } catch (err: unknown) {
      console.error("Error cargando finanzas:", err)
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos financieros")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (!habilitado) return
    recargar()

    const canal = supabase
      .channel("finanzas-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gastos" }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "ingresos" }, () => recargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [habilitado, recargar])

  const resumen = useMemo<ResumenFinanciero>(() => {
    const confirmadas = inscripciones.filter((i) => i.estado === ESTADO_CONFIRMADA)
    const confirmados = confirmadas.length
    const inscriptosTotales = inscripciones.length

    const ingresoInscripciones = confirmadas.reduce((sum, i) => sum + montoEfectivo(i, precioBase), 0)
    const ingresoInscripcionesProyectado = inscripciones.reduce(
      (sum, i) => sum + montoEfectivo(i, precioBase),
      0,
    )

    const ingresosCobrados = ingresos
      .filter((i) => i.estado === "cobrado")
      .reduce((sum, i) => sum + i.monto, 0)
    const ingresosPorCobrar = ingresos
      .filter((i) => i.estado === "por_cobrar")
      .reduce((sum, i) => sum + i.monto, 0)

    const aprobados = gastos.filter((g) => g.estado === "aprobado")
    const pendientes = gastos.filter((g) => g.estado === "pendiente")

    const gastosAprobados = aprobados.reduce((sum, g) => sum + totalGasto(g, confirmados), 0)
    const gastosAprobadosProyectado = aprobados.reduce(
      (sum, g) => sum + totalGasto(g, inscriptosTotales),
      0,
    )
    const gastosPendientes = pendientes.reduce((sum, g) => sum + totalGasto(g, confirmados), 0)

    const totalIngresos = ingresoInscripciones + ingresosCobrados
    const totalIngresosProyectado = ingresoInscripcionesProyectado + ingresosCobrados + ingresosPorCobrar

    const pagosDiferentes = confirmadas.filter(
      (i) => i.montoPagado !== null && i.montoPagado !== precioBase,
    )
    const diferenciaPagos = pagosDiferentes.reduce((sum, i) => sum + ((i.montoPagado ?? 0) - precioBase), 0)

    return {
      confirmados,
      inscriptosTotales,
      ingresoInscripciones,
      ingresoInscripcionesProyectado,
      ingresosCobrados,
      ingresosPorCobrar,
      totalIngresos,
      totalIngresosProyectado,
      gastosAprobados,
      gastosAprobadosProyectado,
      gastosPendientes,
      balance: totalIngresos - gastosAprobados,
      balanceProyectado: totalIngresosProyectado - gastosAprobadosProyectado - gastosPendientes,
      pagosDiferentes,
      diferenciaPagos,
    }
  }, [gastos, ingresos, inscripciones, precioBase])

  const movimientos = useMemo<Movimiento[]>(() => {
    const deGastos: Movimiento[] = gastos.map((g) => ({
      id: g.id,
      tipo: "gasto",
      descripcion: g.descripcion,
      detalle: g.porParticipante
        ? `${formatARS(g.monto)} por persona × ${resumen.confirmados} confirmados`
        : null,
      categoria: g.categoria,
      monto: -totalGasto(g, resumen.confirmados),
      estado: g.estado,
      fecha: g.fecha,
      origen: g,
    }))

    const deIngresos: Movimiento[] = ingresos.map((i) => ({
      id: i.id,
      tipo: "ingreso",
      descripcion: i.descripcion,
      detalle: i.notas,
      categoria: i.categoria,
      monto: i.monto,
      estado: i.estado,
      fecha: i.fecha,
      origen: null,
    }))

    // Fila calculada: las inscripciones confirmadas agrupadas como un ingreso.
    const deInscripciones: Movimiento[] =
      resumen.confirmados > 0
        ? [
            {
              id: "inscripciones-confirmadas",
              tipo: "ingreso",
              descripcion: "Inscripciones confirmadas",
              detalle: `${resumen.confirmados} inscriptos a ${formatARS(precioBase)} base`,
              categoria: "inscripciones",
              monto: resumen.ingresoInscripciones,
              estado: "cobrado",
              fecha: null,
              origen: null,
            },
          ]
        : []

    return [...deInscripciones, ...deIngresos, ...deGastos].sort((a, b) => {
      // La fila calculada no tiene fecha: va primero.
      if (!a.fecha) return -1
      if (!b.fecha) return 1
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
  }, [gastos, ingresos, resumen.confirmados, resumen.ingresoInscripciones, precioBase])

  return { gastos, ingresos, inscripciones, cargando, error, recargar, resumen, movimientos }
}
