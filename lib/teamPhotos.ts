import fs from "node:fs"
import path from "node:path"

export interface GalleryImage {
  url: string
  alt: string
  title: string
}

// Carpeta pública con las fotos del equipo. El nombre tiene un espacio.
const TEAM_DIR_NAME = "fotos equipo"
const TEAM_DIR = path.join(process.cwd(), "public", TEAM_DIR_NAME)
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"])

// Construye una URL pública segura (codifica el espacio y los acentos del
// nombre de carpeta/archivo) -> /fotos%20equipo/archivo.jpg
const toPublicUrl = (fileName: string): string =>
  `/${encodeURIComponent(TEAM_DIR_NAME)}/${encodeURIComponent(fileName)}`

// Genera un título legible a partir del nombre de archivo. Si parece un nombre
// de cámara/WhatsApp (sin significado), usa un título genérico del equipo.
const toTitle = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, "")
  const esGenerico = /^(img|dsc|photo|image|foto|whatsapp|screenshot|captura)[\W_]/i.test(
    base
  ) || /^\d+$/.test(base.replace(/[\W_]/g, ""))

  if (esGenerico) return "Grand Team Bike"

  const limpio = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

/**
 * Lee las fotos del equipo desde `public/fotos equipo` en tiempo de build/SSR.
 * Devuelve [] si la carpeta no existe o está vacía, para que la galería pueda
 * caer a un respaldo. Ordena por nombre con sensibilidad numérica (foto2 < foto10).
 */
export function getTeamPhotos(): GalleryImage[] {
  try {
    const files = fs
      .readdirSync(TEAM_DIR)
      .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }))

    return files.map((file, index) => ({
      url: toPublicUrl(file),
      alt: `Equipo Grand Team — foto ${index + 1}`,
      title: toTitle(file),
    }))
  } catch {
    return []
  }
}
