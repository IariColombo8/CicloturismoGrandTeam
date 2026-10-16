// Sorteos sin internet.
//
// El dia del evento no hay wifi y la señal del celular en las Ruinas no es
// confiable. El sorteo no puede depender de eso: se precarga todo con conexion
// (sorteos, premios, inscriptos) y despues el bolillero funciona entero en el
// telefono. Lo que se va sorteando se guarda local y se sube solo cuando vuelve
// la conexion.
//
// Dos piezas:
//  1. SNAPSHOT: copia de lo necesario para sortear (lo que se "precarga").
//  2. COLA: los cambios hechos sin conexion, listos para subir.
//
// Todo es idempotente: cada tirada se crea con su UUID en el telefono, asi
// subirla dos veces (o desde dos dispositivos) no duplica nada.

import type { EstadoResultado, EstadoSorteo, FilaParticipante, Premio, Resultado, Sorteo } from "./sorteos"

const CLAVE_SNAPSHOT = "gtb-sorteos-datos"
const CLAVE_COLA = "gtb-sorteos-cola"

export interface SnapshotSorteos {
  guardadoEn: number
  sorteos: Sorteo[]
  premios: Premio[]
  resultados: Resultado[]
  participantes: FilaParticipante[]
}

/** Fila de sorteo_resultados tal como se guarda (sin columnas de la base). */
export interface FilaResultado {
  id: string
  sorteo_id: string
  premio_id: string | null
  premio_nombre: string | null
  orden: number
  slot: number
  ronda: number
  vuelta: number
  participante_id: string | null
  nombre: string
  localidad: string | null
  grupo: string | null
  estado: EstadoResultado
  resuelto_en: string | null
}

export interface ColaSorteos {
  /** Tiradas a subir (o re-subir), por id. La fila va completa: un upsert alcanza. */
  resultados: Record<string, FilaResultado>
  /** Tiradas borradas estando sin conexion. */
  borrados: string[]
  /** Estado de cada tanda (en_curso / finalizado), por id de sorteo. */
  estados: Record<string, EstadoSorteo>
}

export const COLA_VACIA: ColaSorteos = { resultados: {}, borrados: [], estados: {} }

function leer<T>(clave: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const crudo = window.localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : null
  } catch {
    return null
  }
}

function escribir(clave: string, valor: unknown): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin espacio: el sorteo sigue andando en memoria. Avisar seria peor que
    // interrumpir el acto con un cartel.
  }
}

// ── Snapshot ──────────────────────────────────────────────────

export function guardarSnapshot(datos: Omit<SnapshotSorteos, "guardadoEn">): SnapshotSorteos {
  const snapshot: SnapshotSorteos = { ...datos, guardadoEn: Date.now() }
  escribir(CLAVE_SNAPSHOT, snapshot)
  return snapshot
}

export function leerSnapshot(): SnapshotSorteos | null {
  const snapshot = leer<SnapshotSorteos>(CLAVE_SNAPSHOT)
  if (!snapshot || !Array.isArray(snapshot.sorteos)) return null
  return {
    guardadoEn: snapshot.guardadoEn ?? 0,
    sorteos: snapshot.sorteos ?? [],
    premios: snapshot.premios ?? [],
    resultados: snapshot.resultados ?? [],
    participantes: snapshot.participantes ?? [],
  }
}

export function borrarSnapshot(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(CLAVE_SNAPSHOT)
  } catch {}
}

// ── Cola de cambios ───────────────────────────────────────────

export function leerCola(): ColaSorteos {
  const cola = leer<ColaSorteos>(CLAVE_COLA)
  if (!cola) return { ...COLA_VACIA, resultados: {}, borrados: [], estados: {} }
  return {
    resultados: cola.resultados ?? {},
    borrados: cola.borrados ?? [],
    estados: cola.estados ?? {},
  }
}

export function guardarCola(cola: ColaSorteos): void {
  escribir(CLAVE_COLA, cola)
}

export function vaciarCola(): void {
  guardarCola({ resultados: {}, borrados: [], estados: {} })
}

export function encolarResultado(fila: FilaResultado): ColaSorteos {
  const cola = leerCola()
  cola.resultados[fila.id] = fila
  cola.borrados = cola.borrados.filter((id) => id !== fila.id)
  guardarCola(cola)
  return cola
}

export function encolarBorrado(id: string): ColaSorteos {
  const cola = leerCola()
  delete cola.resultados[id]
  if (!cola.borrados.includes(id)) cola.borrados.push(id)
  guardarCola(cola)
  return cola
}

export function encolarEstadoSorteo(sorteoId: string, estado: EstadoSorteo): ColaSorteos {
  const cola = leerCola()
  cola.estados[sorteoId] = estado
  guardarCola(cola)
  return cola
}

export function cambiosPendientes(cola: ColaSorteos): number {
  return Object.keys(cola.resultados).length + cola.borrados.length + Object.keys(cola.estados).length
}

/**
 * Mezcla lo que vino de la base con lo que todavia no se subio.
 *
 * Lo local gana: si el telefono tiene una tirada que el servidor no conoce (o
 * un "reclamo" que no llego), eso es lo que paso en el escenario.
 */
export function mezclarResultados(deLaBase: Resultado[], cola: ColaSorteos): Resultado[] {
  const porId = new Map<string, Resultado>()
  for (const fila of deLaBase) porId.set(fila.id, fila)

  for (const id of cola.borrados) porId.delete(id)

  for (const fila of Object.values(cola.resultados)) {
    const anterior = porId.get(fila.id)
    porId.set(fila.id, {
      ...fila,
      created_at: anterior?.created_at ?? new Date(fila.resuelto_en ?? Date.now()).toISOString(),
    })
  }

  return [...porId.values()].sort((a, b) => a.vuelta - b.vuelta || a.orden - b.orden)
}

/** Fecha del snapshot en texto corto, para el cartel de "datos precargados". */
export function fechaSnapshot(guardadoEn: number): string {
  if (!guardadoEn) return ""
  return new Date(guardadoEn).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** UUID para las tiradas creadas en el telefono. */
export function nuevoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Navegadores viejos: alcanza con que no se repita.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random()
    .toString(16)
    .slice(2, 10)}`
}
