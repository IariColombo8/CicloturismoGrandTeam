/**
 * Envío del pedido de remera, con la misma red de seguridad que la
 * inscripción: si no hay internet o el servidor falla, el pedido queda
 * guardado en el teléfono y se reintenta solo.
 *
 * El pedido son dos pasos: el alta (POST a /api/remera/submit) y la dirección
 * de entrega detallada (una función de la base). La cola guarda los dos juntos,
 * así nunca queda un pedido sin saber a dónde enviarlo.
 */

import { enviarConCola, vigilarPendientes, type ResultadoEnvio } from "@/lib/offline/cola"

const URL_SUBMIT = "/api/remera/submit"
const RPC_ENTREGA = "guardar_entrega_remera_v2"

export async function enviarPedidoRemera(
  payload: Record<string, unknown>,
  argsEntrega: Record<string, unknown>,
): Promise<{ resultado: ResultadoEnvio; respuesta: Record<string, unknown> }> {
  return enviarConCola({
    tipo: "remera",
    url: URL_SUBMIT,
    payload,
    rpc: { nombre: RPC_ENTREGA, args: argsEntrega },
    referencia: String(payload.dni || "sin-dni"),
  })
}

export const vigilarPedidosPendientes = vigilarPendientes
