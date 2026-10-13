// lib/google/oauth.ts
// Intercambia el refresh token de Google por access tokens de corta duracion.
// Uso EXCLUSIVO en servidor (API routes). NUNCA importar desde un componente
// cliente: expondria GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN.

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

// Se renueva el token 2 minutos antes de que expire para no cortar un request
// a mitad de camino.
const MARGEN_EXPIRACION_MS = 2 * 60 * 1000

/** Scopes que pide el script de autorizacion (ver scripts/gmail-oauth.mjs). */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
]

/** Error de configuracion: faltan variables o el refresh token ya no sirve. */
export class GmailConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GmailConfigError"
  }
}

export interface ConfigGoogle {
  clientId: string
  clientSecret: string
  refreshToken: string
  /** Casilla desde la que se envia y cuya bandeja se lee. */
  remitente: string
  /** Nombre visible en el "From" (ej: Grand Team Bike). */
  nombreRemitente: string
}

const VARIABLES_REQUERIDAS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GMAIL_SENDER",
] as const

/** Devuelve las variables de entorno que faltan para operar con Gmail. */
export function variablesFaltantes(): string[] {
  return VARIABLES_REQUERIDAS.filter((nombre) => !(process.env[nombre] || "").trim())
}

/** True si el servidor tiene todo lo necesario para hablar con Gmail. */
export function gmailConfigurado(): boolean {
  return variablesFaltantes().length === 0
}

/**
 * Lee la configuracion de Google desde el entorno.
 * @throws GmailConfigError si falta alguna variable.
 */
export function leerConfigGoogle(): ConfigGoogle {
  const faltantes = variablesFaltantes()
  if (faltantes.length > 0) {
    throw new GmailConfigError(
      `Gmail no esta configurado en el servidor. Faltan estas variables de entorno: ${faltantes.join(", ")}. Ver docs/gmail-setup.md`
    )
  }

  const remitente = (process.env.GMAIL_SENDER || "").trim()

  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    refreshToken: (process.env.GOOGLE_REFRESH_TOKEN || "").trim(),
    remitente,
    nombreRemitente: (process.env.GMAIL_SENDER_NAME || "Grand Team Bike").trim(),
  }
}

interface TokenCacheado {
  accessToken: string
  /** Timestamp (ms) a partir del cual conviene pedir uno nuevo. */
  vigenteHasta: number
}

// Cache en memoria del proceso. En serverless cada instancia tiene la suya,
// que es justo lo que queremos: nada se persiste en disco ni en la base.
let cache: TokenCacheado | null = null

/** Borra el access token cacheado (se usa al recibir un 401 de Gmail). */
export function invalidarAccessToken(): void {
  cache = null
}

/**
 * Devuelve un access token valido de Google, renovandolo si hace falta.
 * @param forzar ignora el cache y pide uno nuevo.
 */
export async function obtenerAccessToken(forzar = false): Promise<string> {
  if (!forzar && cache && cache.vigenteHasta > Date.now()) {
    return cache.accessToken
  }

  const cfg = leerConfigGoogle()

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  })

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!res.ok || !data.access_token) {
    cache = null
    const detalle = data.error_description || data.error || `HTTP ${res.status}`

    // invalid_grant = el refresh token fue revocado, caduco (apps en modo
    // "Testing" los vencen a los 7 dias) o cambio la contrasena de la cuenta.
    if (data.error === "invalid_grant") {
      throw new GmailConfigError(
        `El refresh token de Google ya no es valido (${detalle}). Regeneralo con "npm run gmail:auth" y actualiza GOOGLE_REFRESH_TOKEN. Si la app OAuth sigue en modo "Testing", publicala en produccion para que el token no caduque cada 7 dias.`
      )
    }

    throw new Error(`No se pudo renovar el access token de Google: ${detalle}`)
  }

  const duracionMs = (data.expires_in ?? 3600) * 1000
  cache = {
    accessToken: data.access_token,
    vigenteHasta: Date.now() + Math.max(duracionMs - MARGEN_EXPIRACION_MS, 30_000),
  }

  return cache.accessToken
}
