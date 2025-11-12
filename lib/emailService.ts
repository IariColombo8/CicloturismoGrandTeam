// lib/emailService.ts
import emailjs from "@emailjs/browser"

// Inicializar EmailJS con tu Public Key
const EMAILJS_PUBLIC_KEY 
const SERVICE_ID 

// IDs de templates - actualiza estos con tus propios template IDs
const TEMPLATE_IDS = {
  CONFIRMATION: "template_2fg4bhx", // Template de confirmación
  REJECTION: "template_rejection",   // Crea este template en EmailJS
  REMINDER: "template_reminder"      // Crea este template en EmailJS
}

// Inicializar EmailJS
if (typeof window !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY)
}

interface EmailParams {
  email: string
  nombreCompleto: string
  [key: string]: any
}

interface ConfirmationEmailParams extends EmailParams {
  numeroInscripcion?: string
  fechaEvento?: string
  ubicacion?: string
  talleRemera?: string
}

interface RejectionEmailParams extends EmailParams {
  motivo?: string
}

export const emailService = {
  /**
   * Envía email de confirmación de inscripción
   */
  async sendConfirmationEmail(params: ConfirmationEmailParams) {
    try {
      const templateParams = {
        to_email: params.email,
        to_name: params.nombreCompleto,
        nombre: params.nombreCompleto.split(" ")[0], // Primer nombre
        apellido: params.nombreCompleto.split(" ").slice(1).join(" "), // Apellidos
        numero_inscripcion: params.numeroInscripcion || "Pendiente",
        fecha_evento: params.fechaEvento || "Por confirmar",
        ubicacion: params.ubicacion || "Concepción del Uruguay, Entre Ríos",
        talle_remera: params.talleRemera || "No especificado",
        ...params
      }

      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_IDS.CONFIRMATION,
        templateParams
      )

      console.log("✅ Email de confirmación enviado:", response)
      return { success: true, response }
    } catch (error) {
      console.error("❌ Error enviando email de confirmación:", error)
      return { success: false, error }
    }
  },

  /**
   * Envía email de rechazo de inscripción
   */
  async sendRejectionEmail(params: RejectionEmailParams) {
    try {
      const templateParams = {
        to_email: params.email,
        to_name: params.nombreCompleto,
        nombre: params.nombreCompleto.split(" ")[0],
        motivo: params.motivo || "No se especificó un motivo",
        ...params
      }

      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_IDS.REJECTION,
        templateParams
      )

      console.log("✅ Email de rechazo enviado:", response)
      return { success: true, response }
    } catch (error) {
      console.error("❌ Error enviando email de rechazo:", error)
      return { success: false, error }
    }
  },

  /**
   * Envía email recordatorio genérico
   */
  async sendReminderEmail(params: EmailParams) {
    try {
      const templateParams = {
        to_email: params.email,
        to_name: params.nombreCompleto,
        ...params
      }

      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_IDS.REMINDER,
        templateParams
      )

      console.log("✅ Email recordatorio enviado:", response)
      return { success: true, response }
    } catch (error) {
      console.error("❌ Error enviando email recordatorio:", error)
      return { success: false, error }
    }
  },

  /**
   * Envía email personalizado con template específico
   */
  async sendCustomEmail(templateId: string, params: EmailParams) {
    try {
      const response = await emailjs.send(
        SERVICE_ID,
        templateId,
        params
      )

      console.log("✅ Email personalizado enviado:", response)
      return { success: true, response }
    } catch (error) {
      console.error("❌ Error enviando email personalizado:", error)
      return { success: false, error }
    }
  },

  /**
   * Envía múltiples emails en lote (con delay para no saturar)
   */
  async sendBulkEmails(
    templateId: string,
    recipients: EmailParams[],
    delayMs: number = 1000
  ) {
    const results = []
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendCustomEmail(templateId, recipient)
        results.push({ ...recipient, ...result })
        
        // Delay entre envíos para no saturar el servicio
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      } catch (error) {
        results.push({ ...recipient, success: false, error })
      }
    }
    
    return results
  }
}

// Ejemplo de uso:
/*
import { emailService } from "@/lib/emailService"

// Enviar confirmación
await emailService.sendConfirmationEmail({
  email: "participante@email.com",
  nombreCompleto: "Juan Pérez",
  numeroInscripcion: "2025-001",
  fechaEvento: "8 de Noviembre de 2025",
  talleRemera: "L"
})

// Enviar rechazo
await emailService.sendRejectionEmail({
  email: "participante@email.com",
  nombreCompleto: "Juan Pérez",
  motivo: "Comprobante de pago no válido"
})
*/