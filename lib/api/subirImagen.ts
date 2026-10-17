/**
 * Subida de imágenes al Storage de Supabase, compartida por los paneles que
 * cargan fotos (sponsors, alojamientos, premios de sorteos).
 *
 * Dos reglas, aprendidas de cargar un sponsor y recibir "Error al subir el
 * archivo" sin más:
 *
 * 1. **No rechazar de más.** Si parece una imagen, se intenta subir. El
 *    navegador manda tipos raros o vacíos según el celular ("image/heic",
 *    "application/octet-stream" o ""), y rechazar por eso dejaba al equipo sin
 *    poder cargar el logo que tenía a mano.
 * 2. **Si falla, decir por qué.** El mensaje del Storage viaja hasta la
 *    pantalla. Un "el archivo supera el máximo" se arregla en diez segundos;
 *    un "Error al subir" no se arregla nunca.
 */

import { createAdminClient } from "@/lib/supabase-admin"

/** Techo del bucket `sponsors` (10 MB). El cliente ya comprime antes. */
export const MAX_BYTES_IMAGEN = 10 * 1024 * 1024

const EXTENSIONES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  ico: "image/x-icon",
}

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export function limpiarSlug(valor: string | null | undefined, porDefecto: string): string {
  return (
    (valor || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || porDefecto
  )
}

/** Extensión y content-type definitivos, aunque el navegador no colabore. */
function resolverTipo(file: File): { ext: string; contentType: string } {
  const extArchivo = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  const tipoDeclarado = (file.type || "").toLowerCase().split(";")[0].trim()

  if (EXTENSIONES[extArchivo]) {
    return { ext: extArchivo, contentType: EXTENSIONES[extArchivo] }
  }
  if (tipoDeclarado.startsWith("image/")) {
    const porTipo = Object.entries(EXTENSIONES).find(([, mime]) => mime === tipoDeclarado)
    return { ext: porTipo?.[0] || "jpg", contentType: tipoDeclarado }
  }
  // Ni extensión ni tipo conocidos: la mandamos como JPEG, que es lo más
  // probable, antes que negarse a subirla.
  return { ext: "jpg", contentType: "image/jpeg" }
}

/** ¿Vale la pena intentar subirlo? Solo descartamos lo que claramente no es imagen. */
function pareceImagen(file: File): boolean {
  const tipo = (file.type || "").toLowerCase()
  if (tipo.startsWith("image/")) return true
  if (/\.(jpe?g|png|webp|avif|gif|svg|heic|heif|bmp|tiff?|ico)$/i.test(file.name)) return true
  // Tipo vacío o genérico (pasa en algunos Android): le damos el beneficio
  // de la duda, el Storage dirá la última palabra.
  return tipo === "" || tipo === "application/octet-stream"
}

export interface SubidaOk {
  ok: true
  url: string
  path: string
}

export interface SubidaError {
  ok: false
  /** Mensaje listo para mostrarle a la persona. */
  error: string
  status: number
}

export async function subirImagen(opciones: {
  file: File
  /** Carpeta dentro del bucket ("" = raíz, como los logos de sponsors). */
  carpeta?: string
  /** Nombre para armar el archivo. */
  nombre?: string | null
  nombrePorDefecto: string
  bucket?: string
}): Promise<SubidaOk | SubidaError> {
  const { file, carpeta = "", nombre, nombrePorDefecto, bucket = "sponsors" } = opciones

  if (!pareceImagen(file)) {
    return {
      ok: false,
      status: 400,
      error: `"${file.name}" no parece una imagen. Subí una foto o un logo (JPG, PNG, WEBP, AVIF, GIF o SVG).`,
    }
  }

  if (file.size > MAX_BYTES_IMAGEN) {
    return {
      ok: false,
      status: 400,
      error: `La imagen pesa ${mb(file.size)} y el máximo es ${mb(MAX_BYTES_IMAGEN)}. Sacale una captura o reducila y volvé a intentar.`,
    }
  }

  if (file.size === 0) {
    return { ok: false, status: 400, error: "El archivo llegó vacío (0 bytes). Volvé a elegirlo." }
  }

  const { ext, contentType } = resolverTipo(file)
  const slug = limpiarSlug(nombre, nombrePorDefecto)
  const unico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = carpeta ? `${carpeta}/${slug}/${unico}.${ext}` : `${slug}-${unico}.${ext}`

  try {
    const supabase = createAdminClient()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: errorSubida } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true })

    if (errorSubida) {
      console.error(`Error subiendo a ${bucket}/${path}:`, errorSubida)
      const detalle = (errorSubida as any)?.message || "sin detalle"
      return {
        ok: false,
        status: 500,
        // El detalle real va a la pantalla: es lo único que permite arreglarlo.
        error: `El almacenamiento rechazó la imagen: ${detalle}`,
      }
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return { ok: true, url: data.publicUrl, path }
  } catch (error) {
    console.error(`Error inesperado subiendo a ${bucket}:`, error)
    const detalle = error instanceof Error ? error.message : "error desconocido"
    return { ok: false, status: 500, error: `No se pudo subir la imagen (${detalle}).` }
  }
}
