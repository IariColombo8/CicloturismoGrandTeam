// lib/google/errores.ts
// Traduce los errores del cliente de Gmail a respuestas HTTP coherentes.

import { NextResponse } from "next/server"
import { GmailConfigError } from "./oauth"
import { GmailApiError } from "./gmail"

/**
 * Convierte un error cualquiera en una respuesta JSON.
 * - GmailConfigError -> 503 (el servidor no puede operar hasta arreglar config)
 * - GmailApiError    -> status original de Gmail
 * - resto            -> 500
 */
export function respuestaErrorGmail(error: unknown): NextResponse {
  if (error instanceof GmailConfigError) {
    return NextResponse.json({ error: error.message, configuracion: false }, { status: 503 })
  }

  if (error instanceof GmailApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  const mensaje = error instanceof Error ? error.message : "Error desconocido"
  return NextResponse.json({ error: mensaje }, { status: 500 })
}
