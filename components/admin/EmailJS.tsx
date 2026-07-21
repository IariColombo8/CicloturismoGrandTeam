"use client"

import { useEffect } from "react"

interface EmailJSConfig {
  serviceId: string
  templateId: string
  publicKey: string
}

interface SendEmailParams {
  nombre: string
  email: string
  estado: string
  numeroInscripcion?: string
}

export const EmailJSConfig: EmailJSConfig = {
  serviceId: "default_service",
  templateId: "template_8ml1cks",
  publicKey: "ZA8Xs_gruWnjf7n1S",
}

export function EmailJSProvider() {
  useEffect(() => {
    // Cargar script de EmailJS
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"
    script.async = true
    script.onload = () => {
      // @ts-ignore
      if (window.emailjs) {
        // @ts-ignore
        window.emailjs.init(EmailJSConfig.publicKey)
      }
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return null
}

export const sendConfirmationEmail = async (params: SendEmailParams): Promise<boolean> => {
  try {
    // @ts-ignore
    if (!window.emailjs) {
      console.error("EmailJS no está inicializado")
      return false
    }

    const templateParams = {
      nombre: params.nombre,
      email: params.email,
      estado: params.estado,
      numeroInscripcion: params.numeroInscripcion || "",
      message: `Tu inscripción ha sido ${params.estado === "confirmada" ? "CONFIRMADA" : params.estado === "rechazada" ? "RECHAZADA" : "actualizada"}.`,
    }

    // @ts-ignore
    const response = await window.emailjs.send(EmailJSConfig.serviceId, EmailJSConfig.templateId, templateParams)

    if (response.status === 200) {
      console.log("Email enviado exitosamente")
      return true
    }

    return false
  } catch (error) {
    console.error("Error al enviar email:", error)
    return false
  }
}
