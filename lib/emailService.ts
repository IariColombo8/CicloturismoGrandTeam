// lib/emailService.ts
// Fachada de envio de emails para el panel admin (codigo cliente).
//
// Antes hablaba directo con EmailJS desde el navegador. Ahora delega en
// POST /api/email/send, que renderiza la plantilla del repo (lib/email/
// templates.ts) y envia por la Gmail API con la cuenta del evento. La firma
// publica se mantiene para no tocar las pantallas que ya lo usan.

import { supabase } from "@/lib/supabase"
import { construirUrlQr } from "@/lib/email/templates"

/** Resultado uniforme: nunca lanza, para no cortar el flujo del admin. */
export interface ResultadoEnvio {
  success: boolean
  id?: string
  error?: string
}

interface EmailParams {
  email: string
  nombreCompleto: string
  [key: string]: unknown
}

interface ConfirmationEmailParams extends EmailParams {
  numeroInscripcion?: string | number | null
  fechaEvento?: string
  ubicacion?: string
  qrCodeUrl?: string
  tokenQR?: string | null
}

interface RejectionEmailParams extends EmailParams {
  motivo?: string
}

/** Token de la sesion admin: la API route valida rol antes de enviar. */
async function obtenerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

interface CuerpoEnvio {
  para: string | string[]
  asunto?: string
  plantilla?: "confirmacion" | "rechazo" | "generico"
  datos?: Record<string, unknown>
  html?: string
  texto?: string
  individual?: boolean
}

async function postEnviar(cuerpo: CuerpoEnvio): Promise<ResultadoEnvio> {
  const token = await obtenerToken()
  if (!token) {
    return { success: false, error: "No hay sesion activa para enviar correos" }
  }

  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(cuerpo),
    })

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean
      id?: string
      error?: string
    }

    if (!res.ok || !data.success) {
      const error = data.error || `Error HTTP ${res.status}`
      console.error("Error enviando email:", error)
      return { success: false, error }
    }

    return { success: true, id: data.id }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error de red al enviar el email"
    console.error("Error enviando email:", mensaje)
    return { success: false, error: mensaje }
  }
}

export const emailService = {
  /** Email de confirmacion de inscripcion (incluye el QR de acreditacion). */
  async sendConfirmationEmail(params: ConfirmationEmailParams): Promise<ResultadoEnvio> {
    return postEnviar({
      para: params.email,
      plantilla: "confirmacion",
      datos: {
        nombreCompleto: params.nombreCompleto,
        numeroInscripcion: params.numeroInscripcion ?? null,
        fechaEvento: params.fechaEvento,
        ubicacion: params.ubicacion,
        tokenQR: params.tokenQR ?? null,
        qrCodeUrl: params.qrCodeUrl,
      },
    })
  },

  /** Email de inscripcion no aprobada, con el motivo. */
  async sendRejectionEmail(params: RejectionEmailParams): Promise<ResultadoEnvio> {
    return postEnviar({
      para: params.email,
      plantilla: "rechazo",
      datos: {
        nombreCompleto: params.nombreCompleto,
        motivo: params.motivo,
      },
    })
  },

  /** Email suelto con el diseño del evento (recordatorios, avisos). */
  async sendReminderEmail(
    params: EmailParams & { titulo?: string; mensaje?: string }
  ): Promise<ResultadoEnvio> {
    const titulo = params.titulo || "Recordatorio del evento"
    return postEnviar({
      para: params.email,
      asunto: titulo,
      plantilla: "generico",
      datos: {
        nombreCompleto: params.nombreCompleto,
        titulo,
        mensaje: params.mensaje || "",
      },
    })
  },

  /** Email con contenido propio (HTML o texto) sin pasar por una plantilla. */
  async sendCustomEmail(opciones: {
    para: string | string[]
    asunto: string
    html?: string
    texto?: string
    individual?: boolean
  }): Promise<ResultadoEnvio> {
    return postEnviar(opciones)
  },

  /**
   * Envia el mismo mensaje a varias personas, una copia individual por
   * destinatario (nadie ve las otras direcciones). El servidor serializa los
   * envios, asi que no hace falta delay del lado del cliente.
   */
  async sendBulkEmails(opciones: {
    destinatarios: string[]
    titulo: string
    mensaje: string
  }): Promise<ResultadoEnvio> {
    return postEnviar({
      para: opciones.destinatarios,
      asunto: opciones.titulo,
      plantilla: "generico",
      datos: { titulo: opciones.titulo, mensaje: opciones.mensaje },
      individual: true,
    })
  },
}

// Reexport para las pantallas que muestran el QR de un participante.
export { construirUrlQr }
