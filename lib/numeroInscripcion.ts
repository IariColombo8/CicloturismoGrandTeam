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
