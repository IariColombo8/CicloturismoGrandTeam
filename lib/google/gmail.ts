// lib/google/gmail.ts
// Cliente minimo de la Gmail API basado en fetch (sin dependencias extra).
// Uso EXCLUSIVO en servidor (API routes).

import { GmailConfigError, invalidarAccessToken, leerConfigGoogle, obtenerAccessToken } from "./oauth"
import {
  aBase64Url,
  construirMensajeMime,
  desdeBase64Url,
  htmlATexto,
  type AdjuntoMime,
  type MensajeMime,
} from "./mime"
import type {
  AdjuntoInfo,
  BandejaResultado,
  DireccionEmail,
  HiloCompleto,
  MensajeGmail,
  ResumenHilo,
} from "@/lib/email/tipos"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

/** Error devuelto por la API de Gmail, con el status HTTP original. */
export class GmailApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "GmailApiError"
    this.status = status
  }
}

/**
 * Llama a la Gmail API con el access token vigente.
 * Si Gmail responde 401 (token revocado o expirado antes de tiempo) se
 * descarta el cache y se reintenta una sola vez.
 */
async function gmailFetch<T>(
  path: string,
  init: RequestInit = {},
  reintentar = true
): Promise<T> {
  const token = await obtenerAccessToken()

  const res = await fetch(`${GMAIL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  })

  if (res.status === 401 && reintentar) {
    invalidarAccessToken()
    return gmailFetch<T>(path, init, false)
  }

  if (!res.ok) {
    const cuerpo = await res.text().catch(() => "")
    let detalle = cuerpo
    try {
      const json = JSON.parse(cuerpo) as { error?: { message?: string } }
      detalle = json.error?.message || cuerpo
    } catch {
      // Respuesta no-JSON: se usa el texto crudo.
    }

    if (res.status === 403 && /insufficient|scope/i.test(detalle)) {
      throw new GmailConfigError(
        `Permisos insuficientes en el token de Google (${detalle}). Regenera el refresh token con "npm run gmail:auth" aceptando todos los permisos.`
      )
    }

    throw new GmailApiError(`Gmail API ${res.status}: ${detalle || "error desconocido"}`, res.status)
  }

  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Tipos crudos de la API (solo los campos que usamos)
// ---------------------------------------------------------------------------

interface HeaderCrudo {
  name: string
  value: string
}

interface ParteCruda {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: HeaderCrudo[]
  body?: { size?: number; data?: string; attachmentId?: string }
  parts?: ParteCruda[]
}

interface MensajeCrudo {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: ParteCruda
}

interface HiloCrudo {
  id: string
  historyId?: string
  snippet?: string
  messages?: MensajeCrudo[]
}

// ---------------------------------------------------------------------------
// Tipos que exponemos al resto de la app (definidos en lib/email/tipos.ts para
// que el panel los pueda importar sin arrastrar codigo de servidor)
// ---------------------------------------------------------------------------

export type {
  AdjuntoInfo,
  BandejaResultado,
  DireccionEmail,
  HiloCompleto,
  MensajeGmail,
  ResumenHilo,
} from "@/lib/email/tipos"

// ---------------------------------------------------------------------------
// Parseo
// ---------------------------------------------------------------------------

function buscarHeader(headers: HeaderCrudo[] | undefined, nombre: string): string {
  const objetivo = nombre.toLowerCase()
  return (headers || []).find((h) => h.name?.toLowerCase() === objetivo)?.value || ""
}

/**
 * Parsea un header de direcciones ("Juan <j@x.com>, otro@y.com").
 * No cubre todos los casos exoticos de RFC 5322, pero si los reales.
 */
export function parsearDirecciones(valor: string): DireccionEmail[] {
  if (!valor.trim()) return []

  // Corta por comas que no esten dentro de comillas.
  const partes = valor.match(/(?:[^,"]|"[^"]*")+/g) || []

  return partes
    .map((parte) => {
      const texto = parte.trim()
      const conNombre = texto.match(/^(.*?)<([^>]+)>$/)
      if (conNombre) {
        const nombre = conNombre[1].trim().replace(/^"|"$/g, "")
        const email = conNombre[2].trim()
        return { nombre: nombre || email.split("@")[0], email }
      }
      return { nombre: texto.split("@")[0], email: texto }
    })
    .filter((d) => d.email.includes("@"))
}

/**
 * Quita del HTML recibido todo lo que podria ejecutarse en el panel.
 * Es la primera capa de defensa; la segunda es renderizarlo en un iframe
 * con sandbox (ver components/admin/emails/VisorMensaje.tsx).
 */
export function sanearHtmlEmail(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(?:script|iframe|object|embed|form|link|meta|base)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
}

/** Recorre el arbol de partes juntando texto, html y adjuntos. */
function recorrerPartes(
  parte: ParteCruda | undefined,
  acumulado: { texto: string[]; html: string[]; adjuntos: AdjuntoInfo[] }
): void {
  if (!parte) return

  const mimeType = (parte.mimeType || "").toLowerCase()
  const nombreArchivo = parte.filename || ""

  // Adjunto real (tiene nombre de archivo y attachmentId).
  if (nombreArchivo && parte.body?.attachmentId) {
    acumulado.adjuntos.push({
      id: parte.body.attachmentId,
      nombre: nombreArchivo,
      mimeType: parte.mimeType || "application/octet-stream",
      tamanio: parte.body.size || 0,
    })
    return
  }

  if (parte.body?.data) {
    const contenido = desdeBase64Url(parte.body.data).toString("utf8")
    if (mimeType === "text/plain") acumulado.texto.push(contenido)
    else if (mimeType === "text/html") acumulado.html.push(contenido)
  }

  for (const hija of parte.parts || []) {
    recorrerPartes(hija, acumulado)
  }
}

function parsearMensaje(crudo: MensajeCrudo): MensajeGmail {
  const headers = crudo.payload?.headers
  const acumulado = { texto: [] as string[], html: [] as string[], adjuntos: [] as AdjuntoInfo[] }
  recorrerPartes(crudo.payload, acumulado)

  const etiquetas = crudo.labelIds || []
  const html = acumulado.html.join("\n")
  const texto = acumulado.texto.join("\n")
  const fechaHeader = buscarHeader(headers, "Date")
  const fechaInterna = crudo.internalDate ? new Date(Number(crudo.internalDate)) : null

  return {
    id: crudo.id,
    threadId: crudo.threadId,
    messageId: buscarHeader(headers, "Message-ID"),
    referencias: buscarHeader(headers, "References"),
    de: parsearDirecciones(buscarHeader(headers, "From"))[0] || { nombre: "Desconocido", email: "" },
    para: parsearDirecciones(buscarHeader(headers, "To")),
    cc: parsearDirecciones(buscarHeader(headers, "Cc")),
    asunto: buscarHeader(headers, "Subject") || "(sin asunto)",
    fecha: fechaInterna ? fechaInterna.toISOString() : fechaHeader,
    snippet: crudo.snippet || "",
    etiquetas,
    noLeido: etiquetas.includes("UNREAD"),
    esEnviado: etiquetas.includes("SENT"),
    texto: texto || (html ? htmlATexto(html) : ""),
    html: html ? sanearHtmlEmail(html) : "",
    adjuntos: acumulado.adjuntos,
  }
}

/** Ejecuta las tareas con un tope de concurrencia (Gmail limita por cuota). */
async function mapearConLimite<T, R>(
  items: T[],
  limite: number,
  tarea: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(items.length)
  let indice = 0

  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (indice < items.length) {
      const actual = indice++
      resultados[actual] = await tarea(items[actual])
    }
  })

  await Promise.all(trabajadores)
  return resultados
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

export interface PerfilGmail {
  emailAddress: string
  messagesTotal: number
  threadsTotal: number
}

/** Datos basicos de la casilla conectada (sirve de "ping" de configuracion). */
export function obtenerPerfil(): Promise<PerfilGmail> {
  return gmailFetch<PerfilGmail>("/profile")
}

export interface EtiquetaGmail {
  id: string
  name: string
  type?: string
}

export async function listarEtiquetas(): Promise<EtiquetaGmail[]> {
  const data = await gmailFetch<{ labels?: EtiquetaGmail[] }>("/labels")
  return data.labels || []
}

export interface OpcionesBandeja {
  /** Busqueda estilo Gmail ("from:juan asunto"). */
  q?: string
  etiquetas?: string[]
  maxResultados?: number
  pageToken?: string
}

/**
 * Lista hilos de la casilla con los metadatos necesarios para la bandeja.
 * threads.list no trae headers, asi que se pide el detalle de cada hilo en
 * paralelo (con tope de concurrencia).
 */
export async function listarHilos(opciones: OpcionesBandeja = {}): Promise<BandejaResultado> {
  const params = new URLSearchParams()
  params.set("maxResults", String(Math.min(Math.max(opciones.maxResultados ?? 25, 1), 50)))
  if (opciones.q) params.set("q", opciones.q)
  if (opciones.pageToken) params.set("pageToken", opciones.pageToken)
  for (const etiqueta of opciones.etiquetas || []) params.append("labelIds", etiqueta)

  const lista = await gmailFetch<{
    threads?: { id: string; snippet?: string }[]
    nextPageToken?: string
    resultSizeEstimate?: number
  }>(`/threads?${params.toString()}`)

  const ids = (lista.threads || []).map((t) => t.id)

  const headersMeta = ["Subject", "From", "Date"]
    .map((h) => `metadataHeaders=${h}`)
    .join("&")

  const detalles = await mapearConLimite(ids, 8, async (id) => {
    try {
      return await gmailFetch<HiloCrudo>(`/threads/${id}?format=metadata&${headersMeta}`)
    } catch {
      // Un hilo que falla (borrado entre el list y el get) no debe tirar la bandeja.
      return null
    }
  })

  const hilos: ResumenHilo[] = []

  for (const hilo of detalles) {
    if (!hilo) continue
    const mensajes = hilo.messages || []
    if (mensajes.length === 0) continue

    const primero = mensajes[0]
    const ultimo = mensajes[mensajes.length - 1]
    const etiquetas = Array.from(new Set(mensajes.flatMap((m) => m.labelIds || [])))

    hilos.push({
      id: hilo.id,
      asunto: buscarHeader(primero.payload?.headers, "Subject") || "(sin asunto)",
      de:
        parsearDirecciones(buscarHeader(ultimo.payload?.headers, "From"))[0] || {
          nombre: "Desconocido",
          email: "",
        },
      fecha: ultimo.internalDate
        ? new Date(Number(ultimo.internalDate)).toISOString()
        : buscarHeader(ultimo.payload?.headers, "Date"),
      snippet: ultimo.snippet || hilo.snippet || "",
      cantidadMensajes: mensajes.length,
      noLeido: etiquetas.includes("UNREAD"),
      etiquetas,
      tieneAdjuntos: mensajes.some((m) =>
        (m.payload?.parts || []).some((p) => Boolean(p.filename))
      ),
    })
  }

  // Se reordena por fecha porque los detalles vuelven en paralelo.
  hilos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  return {
    hilos,
    siguientePagina: lista.nextPageToken || null,
    estimado: lista.resultSizeEstimate || hilos.length,
  }
}

/** Trae un hilo completo con el cuerpo de cada mensaje ya parseado. */
export async function obtenerHilo(id: string): Promise<HiloCompleto> {
  const hilo = await gmailFetch<HiloCrudo>(`/threads/${encodeURIComponent(id)}?format=full`)
  const mensajes = (hilo.messages || []).map(parsearMensaje)

  return {
    id: hilo.id,
    asunto: mensajes[0]?.asunto || "(sin asunto)",
    mensajes,
  }
}

/** Descarga un adjunto puntual de un mensaje. */
export async function obtenerAdjunto(
  mensajeId: string,
  adjuntoId: string
): Promise<Buffer> {
  const data = await gmailFetch<{ data?: string }>(
    `/messages/${encodeURIComponent(mensajeId)}/attachments/${encodeURIComponent(adjuntoId)}`
  )
  return desdeBase64Url(data.data || "")
}

export interface EnvioParams {
  para: string | string[]
  asunto: string
  html?: string
  texto?: string
  cc?: string | string[]
  bcc?: string | string[]
  responderA?: string
  adjuntos?: AdjuntoMime[]
  /** Hilo al que se engancha la respuesta. */
  threadId?: string
  inReplyTo?: string
  references?: string
}

export interface EnvioResultado {
  id: string
  threadId: string
}

/**
 * Envia un email desde la casilla configurada en GMAIL_SENDER.
 * Si se pasa threadId (y idealmente inReplyTo), Gmail lo agrupa como respuesta.
 */
export async function enviarEmail(params: EnvioParams): Promise<EnvioResultado> {
  const cfg = leerConfigGoogle()

  const html = params.html
  const texto = params.texto || (html ? htmlATexto(html) : "")

  if (!texto && !html) {
    throw new Error("El email no tiene contenido")
  }

  const mensaje: MensajeMime = {
    de: cfg.remitente,
    nombreDe: cfg.nombreRemitente,
    para: params.para,
    cc: params.cc,
    bcc: params.bcc,
    responderA: params.responderA || cfg.remitente,
    asunto: params.asunto,
    texto,
    html,
    adjuntos: params.adjuntos,
    inReplyTo: params.inReplyTo,
    references: params.references,
  }

  const raw = aBase64Url(construirMensajeMime(mensaje))

  const cuerpo: Record<string, string> = { raw }
  if (params.threadId) cuerpo.threadId = params.threadId

  return gmailFetch<EnvioResultado>("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  })
}

/**
 * Responde al ultimo mensaje de un hilo manteniendo el enhebrado
 * (In-Reply-To + References + mismo threadId).
 */
export async function responderHilo(opciones: {
  threadId: string
  texto?: string
  html?: string
  cc?: string | string[]
  adjuntos?: AdjuntoMime[]
}): Promise<EnvioResultado> {
  const hilo = await obtenerHilo(opciones.threadId)
  const cfg = leerConfigGoogle()

  // Se responde al ultimo mensaje que no hayamos enviado nosotros; si todos
  // son nuestros, al ultimo del hilo.
  const entrantes = hilo.mensajes.filter((m) => !m.esEnviado)
  const objetivo = entrantes[entrantes.length - 1] || hilo.mensajes[hilo.mensajes.length - 1]

  if (!objetivo) {
    throw new Error("El hilo no tiene mensajes para responder")
  }

  const destinatarios = objetivo.esEnviado
    ? objetivo.para.map((d) => d.email)
    : [objetivo.de.email]

  const paraFiltrado = destinatarios.filter(
    (email) => email && email.toLowerCase() !== cfg.remitente.toLowerCase()
  )

  if (paraFiltrado.length === 0) {
    throw new Error("No se pudo determinar el destinatario de la respuesta")
  }

  const asunto = /^re:/i.test(objetivo.asunto) ? objetivo.asunto : `Re: ${objetivo.asunto}`
  const references = [objetivo.referencias, objetivo.messageId].filter(Boolean).join(" ").trim()

  return enviarEmail({
    para: paraFiltrado,
    cc: opciones.cc,
    asunto,
    texto: opciones.texto,
    html: opciones.html,
    adjuntos: opciones.adjuntos,
    threadId: opciones.threadId,
    inReplyTo: objetivo.messageId || undefined,
    references: references || undefined,
  })
}

/** Agrega y/o quita etiquetas de un hilo (leido, archivado, etc). */
export function modificarEtiquetasHilo(
  threadId: string,
  cambios: { agregar?: string[]; quitar?: string[] }
): Promise<unknown> {
  return gmailFetch(`/threads/${encodeURIComponent(threadId)}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addLabelIds: cambios.agregar || [],
      removeLabelIds: cambios.quitar || [],
    }),
  })
}

/** Manda un hilo a la papelera (reversible desde Gmail). */
export function moverHiloAPapelera(threadId: string): Promise<unknown> {
  return gmailFetch(`/threads/${encodeURIComponent(threadId)}/trash`, { method: "POST" })
}
