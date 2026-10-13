// lib/email/registro.ts
// Log de emails enviados en la tabla public.emails_enviados.
// Es best-effort: si la tabla todavia no existe (migracion sin aplicar) o la
// escritura falla, no se corta el envio. Uso exclusivo en servidor.

import { createAdminClient } from "@/lib/supabase-admin"

export interface EnvioRegistrado {
  destinatarios: string[]
  asunto: string
  plantilla: string | null
  /** Email del admin que disparo el envio. */
  enviadoPor: string
  exito: boolean
  /** Id del mensaje de Gmail o mensaje de error. */
  detalle?: string
}

export async function registrarEnvio(envio: EnvioRegistrado): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("emails_enviados").insert({
      destinatarios: envio.destinatarios,
      asunto: envio.asunto,
      plantilla: envio.plantilla,
      enviado_por: envio.enviadoPor,
      exito: envio.exito,
      detalle: envio.detalle ?? null,
    })

    if (error) {
      console.warn("[email] no se pudo registrar el envio:", error.message)
    }
  } catch (error) {
    console.warn(
      "[email] no se pudo registrar el envio:",
      error instanceof Error ? error.message : error
    )
  }
}
