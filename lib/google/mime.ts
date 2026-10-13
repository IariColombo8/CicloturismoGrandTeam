// lib/google/mime.ts
// Armado de mensajes RFC 5322 para la Gmail API (campo "raw").
// Uso exclusivo en servidor.

/** Codifica en base64url (sin padding), formato que exige la Gmail API. */
export function aBase64Url(valor: string | Buffer): string {
  const buf = typeof valor === "string" ? Buffer.from(valor, "utf8") : valor
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Decodifica base64url (lo que devuelve Gmail en los bodies). */
export function desdeBase64Url(valor: string): Buffer {
  const normalizado = valor.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(normalizado, "base64")
}

/**
 * Codifica un header con acentos o emojis segun RFC 2047 ("encoded-word").
 * Sin esto, un asunto con "ñ" llega como basura a varios clientes.
 */
function codificarHeader(texto: string): string {
  const limpio = texto.replace(/[\r\n]+/g, " ").trim()
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(limpio)) return limpio
  return `=?UTF-8?B?${Buffer.from(limpio, "utf8").toString("base64")}?=`
}

/** Formatea "Nombre <email>" codificando el nombre si hace falta. */
export function formatearDireccion(email: string, nombre?: string): string {
  const mail = email.trim()
  if (!nombre || !nombre.trim()) return mail
  return `${codificarHeader(nombre)} <${mail}>`
}

/** Parte el base64 en lineas de 76 caracteres (limite de RFC 2045). */
function base64EnLineas(valor: string | Buffer): string {
  const buf = typeof valor === "string" ? Buffer.from(valor, "utf8") : valor
  return buf.toString("base64").replace(/(.{76})/g, "$1\r\n")
}

/** Acepta una lista de destinatarios como array o como string separado por comas. */
function normalizarLista(valor: string | string[] | undefined): string[] {
  if (!valor) return []
  const items = Array.isArray(valor) ? valor : valor.split(/[,;]/)
  return items.map((v) => v.trim()).filter(Boolean)
}

export interface AdjuntoMime {
  nombre: string
  mimeType: string
  /** Contenido binario del adjunto. */
  contenido: Buffer
}

export interface MensajeMime {
  de: string
  nombreDe?: string
  para: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  responderA?: string
  asunto: string
  texto: string
  html?: string
  adjuntos?: AdjuntoMime[]
  /** Message-ID del mensaje que se responde (para enhebrar la conversacion). */
  inReplyTo?: string
  /** Cadena References del hilo. */
  references?: string
}

/** Genera un boundary unico para las partes multipart. */
function nuevoBoundary(prefijo: string): string {
  return `--==_gtb_${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Construye el mensaje MIME completo y lo devuelve listo para el campo "raw".
 *
 * Estructura:
 * - sin adjuntos -> multipart/alternative (texto + html)
 * - con adjuntos -> multipart/mixed { multipart/alternative, adjuntos... }
 */
export function construirMensajeMime(msg: MensajeMime): string {
  const para = normalizarLista(msg.para)
  if (para.length === 0) {
    throw new Error("El mensaje no tiene destinatarios")
  }

  const cc = normalizarLista(msg.cc)
  const bcc = normalizarLista(msg.bcc)
  const adjuntos = msg.adjuntos || []

  const boundaryAlt = nuevoBoundary("alt")
  const boundaryMix = nuevoBoundary("mix")

  const headers: string[] = [
    `From: ${formatearDireccion(msg.de, msg.nombreDe)}`,
    `To: ${para.join(", ")}`,
  ]
  if (cc.length) headers.push(`Cc: ${cc.join(", ")}`)
  if (bcc.length) headers.push(`Bcc: ${bcc.join(", ")}`)
  if (msg.responderA) headers.push(`Reply-To: ${msg.responderA}`)
  headers.push(`Subject: ${codificarHeader(msg.asunto)}`)
  headers.push("MIME-Version: 1.0")
  if (msg.inReplyTo) headers.push(`In-Reply-To: ${msg.inReplyTo}`)
  if (msg.references) headers.push(`References: ${msg.references}`)

  // Cuerpo alternativo: texto plano primero, HTML despues (el cliente elige).
  const partesAlternativas: string[] = []
  partesAlternativas.push(
    [
      `--${boundaryAlt}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      base64EnLineas(msg.texto || ""),
      "",
    ].join("\r\n")
  )

  if (msg.html) {
    partesAlternativas.push(
      [
        `--${boundaryAlt}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        base64EnLineas(msg.html),
        "",
      ].join("\r\n")
    )
  }

  const bloqueAlternativo = [
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    "",
    partesAlternativas.join("\r\n"),
    `--${boundaryAlt}--`,
    "",
  ].join("\r\n")

  if (adjuntos.length === 0) {
    return [...headers, bloqueAlternativo].join("\r\n")
  }

  const partesAdjuntas = adjuntos.map((a) =>
    [
      `--${boundaryMix}`,
      `Content-Type: ${a.mimeType}; name="${codificarHeader(a.nombre)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${codificarHeader(a.nombre)}"`,
      "",
      base64EnLineas(a.contenido),
      "",
    ].join("\r\n")
  )

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundaryMix}"`,
    "",
    `--${boundaryMix}`,
    bloqueAlternativo,
    partesAdjuntas.join("\r\n"),
    `--${boundaryMix}--`,
    "",
  ].join("\r\n")
}

/** Convierte HTML a un texto plano razonable para el fallback del email. */
export function htmlATexto(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
