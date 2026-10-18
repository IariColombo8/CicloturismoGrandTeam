"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { DesglosePagos, EstadoPago, Gasto, Ingreso, InscripcionPago, Movimiento } from "./tipos"
import { formatARS, montoCobrado, montoEsperado, totalGasto } from "./tipos"
import { mapNotaCaja, type NotaCaja } from "@/lib/notasCaja"
import {
  desdeCuando,
  fechaCorta,
  parsearItemsComision,
  totalComisiones,
} from "@/lib/finanzas/comisiones"

const ESTADO_CONFIRMADA = "confirmada"
const ESTADO_PENDIENTE = "pendiente"

// "participantes" es historico y acumula todas las ediciones en el array anios[].
// Las finanzas son de la edicion actual, asi que siempre filtramos por anio.
const EDICION_ACTUAL = 2026

interface UseFinanzasResult {
  gastos: Gasto[]
  ingresos: Ingreso[]
  inscripciones: InscripcionPago[]
  /** Observaciones de caja cargadas desde el registro de inscripciones. */
  notas: NotaCaja[]
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
  /** Ingresos por inscripciones si tambien pagaran las pendientes. */
  ingresoInscripcionesProyectado: number
  /** Como se compone ese total: quien pago el precio, quien otro monto, quien no pago. */
  desglosePagos: DesglosePagos
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
  /** De los gastos aprobados, los que ya se abonaron. */
  gastosAprobadosPagados: number
  /** De los gastos aprobados, los que todavia no se abonaron (se pagan a ultimo momento). */
  gastosAprobadosSinPagar: number
  /** totalIngresos - gastosAprobados. */
  balance: number
  /** Balance considerando proyecciones y gastos pendientes. */
  balanceProyectado: number
  /** Plata real disponible ahora: ingresos ya cobrados menos gastos ya pagados. */
  plataEnBanco: number
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
    pagado: g.pagado === false ? false : true,
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
  // Si el ingreso acumula acreditaciones (comisiones de Naranja X), el total
  // sale de los items y no de la columna: aunque se guarden siempre iguales,
  // asi un monto desincronizado no puede mentir en ninguna cuenta.
  const items = parsearItemsComision(i.items)
  return {
    id: i.id,
    descripcion: i.descripcion,
    monto: items.length > 0 ? totalComisiones(items) : Number(i.monto) || 0,
    categoria: i.categoria,
    estado: i.estado,
    fecha: i.fecha,
    comprobante: i.comprobante,
    creadoPor: i.creado_por,
    notas: i.notas,
    items,
  }
}

function mapInscripcion(i: any): InscripcionPago {
  const pagoEstado: EstadoPago =
    i.pago_estado === "pagado" || i.pago_estado === "gratis" || i.pago_estado === "otro"
      ? i.pago_estado
      : ESTADO_PENDIENTE
  return {
    id: i.id,
    nombre: i.nombre || "",
    apellido: i.apellido || "",
    dni: i.dni,
    estado: i.estado || ESTADO_PENDIENTE,
    montoPagado: i.monto_pagado === null || i.monto_pagado === undefined ? null : Number(i.monto_pagado),
    pagoEstado,
    pagoNota: i.pago_nota ?? null,
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
  const [notas, setNotas] = useState<NotaCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const [resGastos, resIngresos, resInscripciones, resNotas] = await Promise.all([
        supabase.from("gastos").select("*").order("fecha", { ascending: false }),
        supabase.from("ingresos").select("*").order("fecha", { ascending: false }),
        supabase
          .from("participantes")
          .select("id, nombre, apellido, dni, estado, monto_pagado, pago_estado, pago_nota")
          .contains("anios", [EDICION_ACTUAL])
          .in("estado", [ESTADO_CONFIRMADA, ESTADO_PENDIENTE]),
        supabase
          .from("notas_caja")
          .select("*")
          .order("resuelta", { ascending: true })
          .order("creada_en", { ascending: false }),
      ])

      if (resGastos.error) throw resGastos.error
      if (resInscripciones.error) throw resInscripciones.error

      setGastos((resGastos.data || []).map(mapGasto))
      // La tabla ingresos puede no existir todavia si falta correr la migracion.
      setIngresos(resIngresos.error ? [] : (resIngresos.data || []).map(mapIngreso))
      setInscripciones((resInscripciones.data || []).map(mapInscripcion))
      // La tabla puede no existir si falta correr la migracion: no es critica.
      setNotas(resNotas.error ? [] : (resNotas.data || []).map(mapNotaCaja))
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

    // Lo cobrado de verdad: las confirmadas que ademas estan marcadas pagadas.
    const ingresoInscripciones = confirmadas.reduce((sum, i) => sum + montoCobrado(i, precioBase), 0)
    // Proyeccion: lo que entraria si pagaran todos (confirmados impagos incluidos).
    const ingresoInscripcionesProyectado = inscripciones.reduce(
      (sum, i) => sum + montoEsperado(i, precioBase),
      0,
    )

    // Desglose de los confirmados, para que ningun total parezca "confirmados x precio".
    const desglosePagos: DesglosePagos = {
      precioLista: { cantidad: 0, total: 0 },
      otroMonto: { cantidad: 0, total: 0, items: [] },
      sinPagar: { cantidad: 0, total: 0, items: [] },
      otraForma: { cantidad: 0, total: 0, items: [] },
      gratis: { cantidad: 0, items: [] },
    }

    for (const insc of confirmadas) {
      if (insc.pagoEstado === "gratis") {
        desglosePagos.gratis.cantidad += 1
        desglosePagos.gratis.items.push(insc)
        continue
      }
      // Pago que no entro a la caja: el inscripto ya pago, asi que no es un
      // deudor, pero la plata todavia no esta y no puede sumar.
      if (insc.pagoEstado === "otro") {
        desglosePagos.otraForma.cantidad += 1
        desglosePagos.otraForma.total += precioBase
        desglosePagos.otraForma.items.push(insc)
        continue
      }
      if (insc.pagoEstado === "pendiente") {
        desglosePagos.sinPagar.cantidad += 1
        desglosePagos.sinPagar.total += precioBase
        desglosePagos.sinPagar.items.push(insc)
        continue
      }

      const pagado = montoCobrado(insc, precioBase)
      if (pagado === precioBase) {
        desglosePagos.precioLista.cantidad += 1
        desglosePagos.precioLista.total += pagado
      } else {
        desglosePagos.otroMonto.cantidad += 1
        desglosePagos.otroMonto.total += pagado
        desglosePagos.otroMonto.items.push(insc)
      }
    }

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
    const gastosAprobadosPagados = aprobados
      .filter((g) => g.pagado)
      .reduce((sum, g) => sum + totalGasto(g, confirmados), 0)
    const gastosAprobadosSinPagar = gastosAprobados - gastosAprobadosPagados

    const totalIngresos = ingresoInscripciones + ingresosCobrados
    const totalIngresosProyectado = ingresoInscripcionesProyectado + ingresosCobrados + ingresosPorCobrar

    // Pagaron distinto al precio base (los sin pagar y los gratis van aparte,
    // en el desglose: no son "un pago distinto" sino otra situacion).
    const pagosDiferentes = desglosePagos.otroMonto.items
    const diferenciaPagos = pagosDiferentes.reduce((sum, i) => sum + ((i.montoPagado ?? 0) - precioBase), 0)

    return {
      confirmados,
      inscriptosTotales,
      ingresoInscripciones,
      ingresoInscripcionesProyectado,
      desglosePagos,
      ingresosCobrados,
      ingresosPorCobrar,
      totalIngresos,
      totalIngresosProyectado,
      gastosAprobados,
      gastosAprobadosProyectado,
      gastosPendientes,
      gastosAprobadosPagados,
      gastosAprobadosSinPagar,
      balance: totalIngresos - gastosAprobados,
      balanceProyectado: totalIngresosProyectado - gastosAprobadosProyectado - gastosPendientes,
      plataEnBanco: totalIngresos - gastosAprobadosPagados,
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
      // Si es un acumulador (comisiones de Naranja X), lo que ubica el monto es
      // desde cuando se viene sumando, no la nota.
      detalle:
        i.items.length > 0
          ? `${i.items.length} acreditación${i.items.length === 1 ? "" : "es"} desde el ${fechaCorta(desdeCuando(i.items))}`
          : i.notas,
      categoria: i.categoria,
      monto: i.monto,
      estado: i.estado,
      fecha: i.fecha,
      origen: null,
    }))

    // Filas calculadas de inscripciones, separadas por situacion de pago. Antes
    // era una sola fila "confirmados x precio", que daba a entender que habian
    // pagado todos los confirmados.
    const d = resumen.desglosePagos
    const deInscripciones: Movimiento[] = []

    if (d.precioLista.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-precio-lista",
        tipo: "ingreso",
        descripcion: `Inscripciones que pagaron ${formatARS(precioBase)}`,
        detalle: `${d.precioLista.cantidad} inscriptos × ${formatARS(precioBase)}`,
        categoria: "inscripciones",
        monto: d.precioLista.total,
        estado: "cobrado",
        fecha: null,
        origen: null,
      })
    }

    if (d.otroMonto.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-otro-monto",
        tipo: "ingreso",
        descripcion: "Inscripciones que pagaron otro monto",
        detalle: `${d.otroMonto.cantidad} inscriptos`,
        categoria: "inscripciones",
        monto: d.otroMonto.total,
        estado: "cobrado",
        fecha: null,
        origen: null,
        listado: {
          titulo: "Pagaron otro monto",
          items: d.otroMonto.items.map(
            (i) => `${i.nombre} ${i.apellido} — ${formatARS(i.montoPagado ?? 0)}`,
          ),
        },
      })
    }

    if (d.sinPagar.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-sin-pagar",
        tipo: "ingreso",
        descripcion: "Confirmados que todavía no pagaron",
        detalle: `${d.sinPagar.cantidad} inscriptos`,
        categoria: "inscripciones",
        monto: d.sinPagar.total,
        estado: "por_cobrar",
        fecha: null,
        origen: null,
        listado: {
          titulo: "Confirmados que todavía no pagaron",
          items: d.sinPagar.items.map((i) => `${i.nombre} ${i.apellido}`),
        },
      })
    }

    if (d.otraForma.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-otra-forma",
        tipo: "ingreso",
        descripcion: "Pagaron de otra forma (no entró a la caja)",
        detalle: `${d.otraForma.cantidad} inscriptos`,
        categoria: "inscripciones",
        monto: d.otraForma.total,
        estado: "por_cobrar",
        fecha: null,
        origen: null,
        listado: {
          titulo: "Pagaron de otra forma",
          items: d.otraForma.items.map(
            (i) => `${i.nombre} ${i.apellido}${i.pagoNota ? ` — ${i.pagoNota}` : ""}`,
          ),
        },
      })
    }

    if (d.gratis.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-gratis",
        tipo: "ingreso",
        descripcion: "Inscripciones sin cargo",
        detalle: `${d.gratis.cantidad} inscriptos`,
        categoria: "inscripciones",
        monto: 0,
        estado: "cobrado",
        fecha: null,
        origen: null,
        listado: {
          titulo: "Inscripciones sin cargo",
          items: d.gratis.items.map((i) => `${i.nombre} ${i.apellido}`),
        },
      })
    }

    return [...deInscripciones, ...deIngresos, ...deGastos].sort((a, b) => {
      // La fila calculada no tiene fecha: va primero.
      if (!a.fecha) return -1
      if (!b.fecha) return 1
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
  }, [gastos, ingresos, resumen.confirmados, resumen.desglosePagos, precioBase])

  return { gastos, ingresos, inscripciones, notas, cargando, error, recargar, resumen, movimientos }
}
