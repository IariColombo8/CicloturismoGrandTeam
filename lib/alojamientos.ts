// Tipos y helpers compartidos entre la seccion publica de alojamientos
// (components/home/Alojamientos.tsx), sus modales y /admin/alojamientos.

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
  // Opcionales: si la migracion 20261023_alojamientos_categorias.sql todavia
  // no corrio, no vienen y todo se trata como destacado (como antes).
  /** null = destacado bike friendly (las tarjetas grandes de arriba). */
  categoria?: CategoriaAlojamiento | null
  estrellas?: number | null
  /** Como lo clasifica Turismo: "Hotel boutique", "Hostel", "Sin categoría"... */
  clasificacion?: string | null
  mascotas?: Mascotas | null
  orden?: number
}

// ──────────────────────────────────────────────────────────────
// Categorias: el listado de la Direccion de Turismo de Concepcion
// del Uruguay (septiembre 2026). El orden de este array es el orden
// en que se muestran, el mismo de la fuente.
// ──────────────────────────────────────────────────────────────

export const CATEGORIAS_ALOJAMIENTO = [
  { id: "hotel", nombre: "Hoteles", detalle: "Hoteles y hoteles boutique" },
  { id: "apart", nombre: "Apart hotel", detalle: "Departamentos con servicio de hotel" },
  { id: "hosteria", nombre: "Hosterías y hostels", detalle: "Hosterías, hostels y casas de huéspedes" },
  { id: "complejo", nombre: "Complejos", detalle: "Complejos con pileta y parque" },
  { id: "bungalow", nombre: "Bungalows", detalle: "Bungalows con parque y parrilla" },
  { id: "cabana", nombre: "Cabañas", detalle: "Cabañas equipadas" },
  { id: "campo", nombre: "Casa de campo y estancia", detalle: "En el campo, fuera de la ciudad" },
  { id: "casa", nombre: "Casas de alquiler turístico", detalle: "Casas equipadas" },
  { id: "departamento", nombre: "Departamentos de alquiler turístico", detalle: "Departamentos equipados" },
] as const

export type CategoriaAlojamiento = (typeof CATEGORIAS_ALOJAMIENTO)[number]["id"]

export function nombreCategoria(id: string | null | undefined): string | null {
  return CATEGORIAS_ALOJAMIENTO.find((c) => c.id === id)?.nombre ?? null
}

export type Mascotas = "si" | "pequenas" | "medianas" | "no"

export const MASCOTAS_ETIQUETA: Record<Mascotas, string> = {
  si: "Aceptan mascotas",
  pequenas: "Mascotas pequeñas",
  medianas: "Mascotas medianas",
  no: "No aceptan mascotas",
}

/** Aceptan alguna mascota (de cualquier tamaño). */
export const aceptaMascotas = (m: Mascotas | null | undefined) => m === "si" || m === "pequenas" || m === "medianas"

/**
 * Los de una categoria, de mas estrellas a menos (sin estrellas al final) y,
 * a igual estrellas, por `orden`. Es el orden de la lista del modal.
 */
export function ordenarPorEstrellas<T extends Pick<Alojamiento, "estrellas" | "orden" | "nombre">>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      (b.estrellas ?? 0) - (a.estrellas ?? 0) ||
      (a.orden ?? 0) - (b.orden ?? 0) ||
      a.nombre.localeCompare(b.nombre, "es"),
  )
}

/** Agrupa una lista ya ordenada por cantidad de estrellas (0 = sin estrellas). */
export function gruposPorEstrellas<T extends Pick<Alojamiento, "estrellas">>(
  lista: T[],
): { estrellas: number; items: T[] }[] {
  const grupos: { estrellas: number; items: T[] }[] = []
  for (const item of lista) {
    const e = item.estrellas ?? 0
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.estrellas === e) ultimo.items.push(item)
    else grupos.push({ estrellas: e, items: [item] })
  }
  return grupos
}

// ──────────────────────────────────────────────────────────────
// Telefonos: en la fuente vienen como "(3442) 15 671460 / 15 643991".
// Se separan y se arma el link tel: (y WhatsApp si es celular, el "15").
// Un numero que no da 10 digitos se muestra igual, pero sin link.
// ──────────────────────────────────────────────────────────────

export interface TelefonoAlojamiento {
  texto: string
  /** Para href="tel:...". null si el numero esta incompleto. */
  tel: string | null
  /** Para https://wa.me/... Solo celulares. */
  whatsapp: string | null
}

export function telefonosDe(valor: string | null | undefined): TelefonoAlojamiento[] {
  if (!valor?.trim()) return []
  let area = ""
  const resultado: TelefonoAlojamiento[] = []

  for (const crudo of valor.split("/")) {
    const segmento = crudo.trim()
    if (!segmento) continue
    const conArea = segmento.match(/^\((\d{2,4})\)\s*(.*)$/)
    if (conArea) area = conArea[1]
    const resto = conArea ? conArea[2] : segmento
    const digitos = resto.replace(/\D/g, "")
    if (!digitos) continue

    // Hereda el codigo de area del numero anterior: "(3442) 411200 / 472422".
    const texto = conArea || !area || digitos.length >= 10 ? segmento : `(${area}) ${segmento}`

    let tel: string | null = null
    let whatsapp: string | null = null

    if (digitos.startsWith("54") && digitos.length >= 12) {
      // Ya viene internacional: "+54 9 3442 57-5039".
      tel = `+${digitos}`
      if (digitos[2] === "9") whatsapp = digitos
    } else if (digitos.length === 10 && !conArea) {
      // "11 35726995": codigo de area y numero juntos.
      tel = `+54${digitos}`
    } else if (area && digitos.startsWith("15") && area.length + digitos.length - 2 === 10) {
      const numero = `${area}${digitos.slice(2)}`
      tel = `+549${numero}`
      whatsapp = `549${numero}`
    } else if (area && area.length + digitos.length === 10) {
      tel = `+54${area}${digitos}`
    }

    resultado.push({ texto, tel, whatsapp })
  }

  return resultado
}

/** Link de Google Maps. Agrega la ciudad si la direccion no la dice. */
export function urlMapa(direccion: string | null | undefined, ciudad = "Concepción del Uruguay, Entre Ríos"): string | null {
  if (!direccion?.trim()) return null
  const conCiudad = /entre r[ií]os|concepci[oó]n|col[oó]n/i.test(direccion) ? direccion : `${direccion}, ${ciudad}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(conCiudad)}`
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
