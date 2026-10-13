// Tipos y helpers compartidos entre la seccion publica de alojamientos
// (components/home/Alojamientos.tsx) y su modal de detalle.

export interface Alojamiento {
  id: string
  nombre: string
  descripcion: string | null
  logo_url: string | null
  website: string | null
  telefono: string | null
  whatsapp: string | null
  direccion: string | null
  instagram: string | null
  imagenes: string[] | null
}

// Placeholder embebido: evita tarjetas vacias si la imagen no carga.
export const ALOJAMIENTO_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" rx="24" fill="#ffffff"/>
    <rect x="110" y="170" width="180" height="80" rx="14" fill="#e4e4e7"/>
    <rect x="130" y="140" width="60" height="40" rx="12" fill="#d4d4d8"/>
    <text x="200" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#3f3f46">ALOJAMIENTO</text>
  </svg>
`)}`

// Normaliza URLs de imagen: fuerza https y soporta enlaces de Google Drive.
export function normalizarLogo(url: string | null | undefined): string {
  if (!url) return ALOJAMIENTO_PLACEHOLDER

  let value = url.trim()
  if (!value) return ALOJAMIENTO_PLACEHOLDER

  if (value.startsWith("http://")) {
    value = `https://${value.slice("http://".length)}`
  }

  const driveId =
    value.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1] ||
    (value.includes("drive.google.com") ? value.match(/[?&]id=([^&#]+)/)?.[1] : undefined)

  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`
  }

  return encodeURI(value)
}

export function normalizarWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  const value = url.trim()
  if (!value) return null
  return value.startsWith("http") ? value : `https://${value}`
}
