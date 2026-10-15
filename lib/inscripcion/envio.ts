/**
 * Envío de la inscripción. La parte de "no se pierde nunca" vive en
 * lib/offline/cola.ts, que comparte con el pedido de remera.
 */

import { enviarConCola, guardarPendiente, vigilarPendientes, type ResultadoEnvio } from "@/lib/offline/cola"

export { guardarPendiente, listarPendientes, reintentarPendientes, vigilarPendientes } from "@/lib/offline/cola"
export type { PendienteOffline, ResultadoEnvio } from "@/lib/offline/cola"

const URL_SUBMIT = "/api/inscripcion/submit"

/**
 * Manda la inscripción. Si no hay internet o el servidor falla, queda guardada
 * en el teléfono y se reintenta sola: devuelve "en-cola" y nunca lanza.
 */
export async function enviarInscripcion(
  payload: Record<string, unknown>,
): Promise<{ resultado: ResultadoEnvio; respuesta: Record<string, unknown> }> {
  return enviarConCola({
    tipo: "inscripcion",
    url: URL_SUBMIT,
    payload,
    referencia: String(payload.dni || "sin-dni"),
  })
}

/** Para la red de seguridad de la página: deja la inscripción guardada igual. */
export async function guardarInscripcionPendiente(payload: Record<string, unknown>, motivo: string) {
  await guardarPendiente({
    id: `inscripcion-${payload.dni || "sin-dni"}-${Date.now()}`,
    tipo: "inscripcion",
    url: URL_SUBMIT,
    payload,
    creadaEn: Date.now(),
    intentos: 0,
    ultimoError: motivo,
  })
}

/** Alias con nombre de dominio, para leerlo mejor desde las páginas. */
export const vigilarInscripcionesPendientes = vigilarPendientes
