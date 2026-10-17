/**
 * Traducción de errores a algo que se pueda leer en pantalla y entender.
 *
 * Nació de un "Error al guardar: " con el mensaje vacío en /admin/sponsors:
 * si el error no dice qué pasó, nadie puede arreglarlo (ni la persona que
 * carga, ni el que mira el código después).
 */

/** Códigos de Postgres/PostgREST que sabemos explicar en criollo. */
const CONOCIDOS: Record<string, string> = {
  "23505": "Ya existe un registro con ese dato (está duplicado).",
  "23502": "Falta un dato obligatorio en la base.",
  "23503": "El registro está relacionado con otro y la base no lo permite.",
  "22P02": "Alguno de los valores tiene un formato que la base no entiende.",
  "42501": "Tu usuario no tiene permiso para esta operación.",
  "42703": "La base no tiene una de las columnas que el sitio intenta guardar (falta una migración).",
  PGRST301: "Tu sesión venció. Cerrá sesión y volvé a entrar.",
  PGRST204: "La base no tiene una de las columnas que el sitio intenta guardar (falta una migración).",
}

/**
 * Arma un mensaje completo: qué pasó, con el detalle técnico incluido.
 * Nunca devuelve cadena vacía.
 */
export function explicarError(error: unknown): string {
  if (!error) return "Error desconocido (sin detalle)."

  if (typeof error === "string") return error || "Error desconocido (sin detalle)."

  const e = error as any
  const mensaje: string = (e?.message || "").trim()
  const codigo: string = (e?.code || "").toString().trim()
  const detalles: string = (e?.details || "").trim()
  const pista: string = (e?.hint || "").trim()

  // Permisos: el caso más frecuente y el más confuso de todos.
  const esRls =
    codigo === "42501" ||
    /row-level security|violates row-level/i.test(mensaje) ||
    /permission denied/i.test(mensaje)

  if (esRls) {
    return (
      "Tu usuario no tiene permiso para guardar esto. " +
      "Cerrá sesión y volvé a entrar con Google; si sigue igual, pedí que te habiliten como admin. " +
      `(detalle: ${mensaje || codigo || "permiso denegado"})`
    )
  }

  if (/Failed to fetch|NetworkError|ERR_INTERNET/i.test(mensaje)) {
    return "No hay conexión con el servidor. Revisá internet y volvé a intentar; lo que cargaste queda guardado como borrador."
  }

  const partes: string[] = []
  if (codigo && CONOCIDOS[codigo]) partes.push(CONOCIDOS[codigo])
  if (mensaje) partes.push(mensaje)
  if (detalles && detalles !== mensaje) partes.push(detalles)
  if (pista) partes.push(`Sugerencia: ${pista}`)
  if (codigo) partes.push(`(código ${codigo})`)

  if (partes.length === 0) {
    // Último recurso: que se vea algo, aunque sea el objeto crudo.
    try {
      const crudo = JSON.stringify(error)
      if (crudo && crudo !== "{}") return `Error sin mensaje: ${crudo}`
    } catch {
      /* nada */
    }
    return "Error desconocido (el servidor no devolvió ningún detalle)."
  }

  return partes.join(" ")
}
