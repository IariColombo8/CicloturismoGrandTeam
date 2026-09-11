// Fecha limite unica para los pedidos de remera.
// Se puede pedir durante todo el 10/10/2026; a partir del 11/10/2026 a las 00:00
// (hora de Argentina, UTC-3) los pedidos quedan cerrados.
export const REMERA_DEADLINE_LABEL = "10/10/2026"

// 11/10/2026 00:00 en Argentina (UTC-3) == 11/10/2026 03:00 UTC.
export const REMERA_DEADLINE_MS = Date.UTC(2026, 9, 11, 3, 0, 0)

export const REMERA_DEADLINE_AVISO = `Podes pedir tu remera hasta el ${REMERA_DEADLINE_LABEL}. Despues de esa fecha no se aceptan mas pedidos.`

export const REMERA_CERRADA_MENSAJE = `Los pedidos de remera cerraron el ${REMERA_DEADLINE_LABEL}. Ya no se aceptan nuevos pedidos.`

export function isRemeraCerrada(ahora: number = Date.now()): boolean {
  return ahora >= REMERA_DEADLINE_MS
}
