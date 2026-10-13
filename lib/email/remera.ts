// lib/email/remera.ts
// Averigua si un participante pidio la remera, para armar el bloque
// correspondiente del mail de confirmacion. Uso exclusivo en servidor.

import { createAdminClient } from "@/lib/supabase-admin"
import type { EstadoRemera } from "@/lib/email/templates"

/**
 * Busca el pedido de remera por DNI.
 *
 * Devuelve `{ pedida: false }` si la persona no pidio ninguna, y
 * `undefined` si no se pudo consultar (sin DNI o error de base): en ese caso
 * la plantilla omite el bloque en vez de afirmar algo incorrecto.
 */
export async function buscarEstadoRemera(dni: unknown): Promise<EstadoRemera | undefined> {
  const dniLimpio = String(dni ?? "").replace(/\D/g, "")
  if (!dniLimpio) return undefined

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("remera")
      .select("envio_tipo")
      .eq("dni", dniLimpio)
      .maybeSingle()

    if (error) {
      console.warn("[email] no se pudo leer el pedido de remera:", error.message)
      return undefined
    }

    if (!data) return { pedida: false }

    const envioTipo = (data as { envio_tipo: string | null }).envio_tipo
    return {
      pedida: true,
      // Cualquier valor que no sea "envio" se trata como entrega en el evento.
      envioTipo: envioTipo === "envio" ? "envio" : "retiro",
    }
  } catch (error) {
    console.warn(
      "[email] no se pudo leer el pedido de remera:",
      error instanceof Error ? error.message : error
    )
    return undefined
  }
}
