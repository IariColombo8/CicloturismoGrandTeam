// lib/finanzas/comisiones.ts
// Comisiones que paga Naranja X por la plata del evento.
//
// Naranja X acredita comision cada tanto, de a montos chicos y en fechas
// distintas. Cargar un ingreso por cada acreditacion ensuciaba la lista de
// finanzas (veinte filas de $300 tapando los sponsors), asi que es **un solo
// ingreso** con muchos items adentro: la fila dice el total acumulado y los
// dias viven en `ingresos.items` (JSONB).
//
// Logica pura, sin Supabase: la cubre e2e/unit/comisiones.spec.ts.

import { CUENTA } from "./cuenta"

/** Categoria del ingreso que acumula las comisiones. */
export const CATEGORIA_COMISION = "comision"

/** Descripcion con la que se crea el ingreso acumulador. */
export const DESCRIPCION_COMISIONES = `Comisiones de ${CUENTA}`

/** Una acreditacion suelta: el dia y lo que entro. */
export interface ItemComision {
  /** Id propio del item, para poder borrar uno sin tocar los demas. */
  id: string
  /** Fecha de la acreditacion en ISO corto (aaaa-mm-dd). */
  fecha: string
  monto: number
  /** Aclaracion opcional ("rendimiento de la semana"). */
  nota: string | null
}

export interface ResumenComisiones {
  /** Suma de todas las acreditaciones. */
  total: number
  /** Fecha de la acreditacion mas vieja (aaaa-mm-dd), o null si no hay ninguna. */
  desde: string | null
  /** Cuantas acreditaciones se cargaron. */
  cantidad: number
}

/** aaaa-mm-dd de hoy, en la hora local (no en UTC, que adelanta un dia). */
export function hoyISO(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, "0")
  const dia = String(ahora.getDate()).padStart(2, "0")
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

/**
 * Normaliza una fecha a aaaa-mm-dd. Acepta el ISO largo que podria venir de la
 * base y descarta cualquier otra cosa (devuelve "" para que el item se ignore).
 */
function normalizarFecha(valor: unknown): string {
  if (typeof valor !== "string") return ""
  const corta = valor.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(corta) ? corta : ""
}

/** Id para un item nuevo. `randomUUID` no existe en WebViews viejos. */
function nuevoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Arma un item nuevo listo para guardar. */
export function nuevoItemComision(fecha: string, monto: number, nota?: string | null): ItemComision {
  return {
    id: nuevoId(),
    fecha: normalizarFecha(fecha) || hoyISO(),
    monto,
    nota: nota?.trim() ? nota.trim() : null,
  }
}

/**
 * Lee el JSONB de la base. Nunca lanza: una fila con basura adentro no puede
 * romper la pantalla de finanzas, asi que lo que no se entiende se descarta.
 */
export function parsearItemsComision(raw: unknown): ItemComision[] {
  if (!Array.isArray(raw)) return []
  const items: ItemComision[] = []
  for (const crudo of raw) {
    if (!crudo || typeof crudo !== "object") continue
    const fila = crudo as Record<string, unknown>
    const fecha = normalizarFecha(fila.fecha)
    const monto = Number(fila.monto)
    if (!fecha || !Number.isFinite(monto)) continue
    items.push({
      id: typeof fila.id === "string" && fila.id ? fila.id : nuevoId(),
      fecha,
      monto,
      nota: typeof fila.nota === "string" && fila.nota.trim() ? fila.nota.trim() : null,
    })
  }
  return items
}

/** Lo mas nuevo arriba, que es lo que se acaba de cargar. */
export function ordenarComisiones(items: ItemComision[]): ItemComision[] {
  return [...items].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export function totalComisiones(items: ItemComision[]): number {
  return items.reduce((suma, i) => suma + i.monto, 0)
}

/** Fecha de la primera comision: desde cuando la plata esta en Naranja X. */
export function desdeCuando(items: ItemComision[]): string | null {
  if (items.length === 0) return null
  return items.reduce((vieja, i) => (i.fecha < vieja ? i.fecha : vieja), items[0].fecha)
}

export function resumenComisiones(items: ItemComision[]): ResumenComisiones {
  return {
    total: totalComisiones(items),
    desde: desdeCuando(items),
    cantidad: items.length,
  }
}

/**
 * dd/mm/aaaa a partir del ISO corto, sin pasar por `new Date`: el Date de
 * "2026-10-18" es medianoche UTC y en Argentina (UTC-3) mostraba el 17.
 */
export function fechaCorta(iso: string | null): string {
  const corta = normalizarFecha(iso)
  if (!corta) return "-"
  const [anio, mes, dia] = corta.split("-")
  return `${dia}/${mes}/${anio}`
}

/** true si este ingreso es el acumulador de comisiones. */
export function esIngresoComision(ingreso: { categoria: string; items?: ItemComision[] }): boolean {
  return ingreso.categoria === CATEGORIA_COMISION || (ingreso.items?.length ?? 0) > 0
}

/**
 * Como se nombra la fila en el PDF y en el Excel: el total y desde cuando,
 * sin los dias uno por uno (que es exactamente lo que no hay que imprimir).
 */
export function descripcionComisiones(base: string, items: ItemComision[]): string {
  const { desde, cantidad } = resumenComisiones(items)
  if (!desde) return base
  const veces = `${cantidad} acreditaci${cantidad === 1 ? "ón" : "ones"}`
  return `${base} (desde el ${fechaCorta(desde)}, ${veces})`
}
