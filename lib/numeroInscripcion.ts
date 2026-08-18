// Formato del numero de inscripcion.
// El numero se asigna recien cuando el admin confirma la inscripcion
// (RPC assign_inscription_number), asi la numeracion queda correlativa
// 1, 2, 3... entre los confirmados. Mientras esta pendiente o rechazada
// vale null y no se muestra ningun numero.

export const SIN_NUMERO = "—"

/** "#007" para los confirmados, guion cuando todavia no tiene numero. */
export function formatNumeroInscripcion(numero: number | null | undefined): string {
  if (numero == null) return SIN_NUMERO
  return `#${String(numero).padStart(3, "0")}`
}

/** Solo las inscripciones confirmadas llevan numero. */
export function debeTenerNumero(estado: string): boolean {
  return estado === "confirmada"
}

/**
 * Prioridad de cada estado en el listado del panel: los pendientes van
 * arriba (son los que hay que revisar), despues los confirmados y al
 * final los rechazados. Replica la columna generada `orden_estado`.
 */
export function ordenEstado(estado: string): number {
  if (estado === "pendiente") return 0
  if (estado === "confirmada" || estado === "aprobado") return 1
  if (estado === "rechazada") return 2
  return 3
}

export type FilaListado = {
  estado: string
  numeroInscripcion: number | null
  fechaInscripcion?: string
}

/**
 * Orden del listado: pendientes primero, luego los confirmados del numero
 * mas grande al 1 (el #1 queda ultimo) y los rechazados al final. Dentro
 * de un mismo grupo sin numero, gana el mas reciente.
 *
 * En produccion este orden lo resuelve Postgres, porque la lista esta
 * paginada en el servidor. Se replica acá para poder testear la regla.
 */
export function compararParaListado(a: FilaListado, b: FilaListado): number {
  const porEstado = ordenEstado(a.estado) - ordenEstado(b.estado)
  if (porEstado !== 0) return porEstado

  // Numero descendente; los que no tienen numero van despues.
  if (a.numeroInscripcion != null && b.numeroInscripcion != null) {
    return b.numeroInscripcion - a.numeroInscripcion
  }
  if (a.numeroInscripcion != null) return -1
  if (b.numeroInscripcion != null) return 1

  return (b.fechaInscripcion ?? "").localeCompare(a.fechaInscripcion ?? "")
}

/**
 * Menor entero positivo que no esta en uso. Es la misma regla que aplica
 * la RPC assign_inscription_number en Postgres: si una inscripcion vuelve
 * a "pendiente", su numero se libera y lo toma el proximo confirmado, en
 * vez de dejar un hueco. Se replica acá para poder testear la regla.
 */
export function menorNumeroLibre(asignados: readonly (number | null | undefined)[]): number {
  const usados = new Set(asignados.filter((n): n is number => n != null))
  let candidato = 1
  while (usados.has(candidato)) candidato++
  return candidato
}
