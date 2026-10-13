// lib/email/tipos.ts
// Tipos del dominio "correo" compartidos entre las API routes y el panel.
// Sin imports de Node para que se puedan usar desde componentes cliente.

export interface DireccionEmail {
  nombre: string
  email: string
}

export interface AdjuntoInfo {
  id: string
  nombre: string
  mimeType: string
  tamanio: number
}

export interface MensajeGmail {
  id: string
  threadId: string
  /** Message-ID del header, necesario para enhebrar respuestas. */
  messageId: string
  referencias: string
  de: DireccionEmail
  para: DireccionEmail[]
  cc: DireccionEmail[]
  asunto: string
  fecha: string
  snippet: string
  etiquetas: string[]
  noLeido: boolean
  esEnviado: boolean
  texto: string
  /** HTML ya saneado en el servidor. */
  html: string
  adjuntos: AdjuntoInfo[]
}

export interface ResumenHilo {
  id: string
  asunto: string
  de: DireccionEmail
  fecha: string
  snippet: string
  cantidadMensajes: number
  noLeido: boolean
  etiquetas: string[]
  tieneAdjuntos: boolean
}

export interface HiloCompleto {
  id: string
  asunto: string
  mensajes: MensajeGmail[]
}

export interface BandejaResultado {
  hilos: ResumenHilo[]
  siguientePagina: string | null
  estimado: number
}

/** Carpetas que expone GET /api/email/inbox. */
export const CARPETAS_EMAIL = [
  { id: "recibidos", label: "Recibidos" },
  { id: "no-leidos", label: "No leidos" },
  { id: "enviados", label: "Enviados" },
  { id: "archivados", label: "Archivados" },
  { id: "papelera", label: "Papelera" },
] as const

export type CarpetaEmail = (typeof CARPETAS_EMAIL)[number]["id"]
