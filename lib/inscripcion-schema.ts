import { z } from "zod"

// Logica pura de validacion/normalizacion de la inscripcion.
// Vive fuera de la API route para poder testearse sin levantar Next ni Supabase.

export const CURRENT_YEAR = 2026

export const GRUPOS_SANGUINEOS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "DESCONOCIDO",
] as const

export const submitSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  dni: z.string().regex(/^\d{7,8}$/),
  email: z.string().trim().email(),
  telefono: z.string().trim().min(1),
  fechaNacimiento: z.string().min(1),
  pais: z.enum(["Argentina", "Uruguay"]),
  localidad: z.string().trim().min(1),

  nombreEmergencia: z.string().trim().min(1),
  telefonoEmergencia: z.string().trim().min(1),
  relacionEmergencia: z.string().trim().optional().default(""),

  haRecorridoDistancia: z.enum(["si", "no"]),
  grupoCiclistas: z.string().trim().min(1),
  grupoSanguineo: z.enum(GRUPOS_SANGUINEOS),
  esCeliaco: z.enum(["si", "no"]),
  tieneAlergias: z.enum(["si", "no"]),
  alergias: z.string().trim().optional().default(""),
  tieneProblemasSalud: z.enum(["si", "no"]),
  condicionSalud: z.string().trim().optional().default(""),

  numeroReferencia: z.string().trim().min(1),
  comprobanteBase64: z.string().min(1),
})

export type InscripcionSubmit = z.infer<typeof submitSchema>

export function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

const GRUPO_ALIASES: Record<string, string> = {
  "sin grupo": "Sin grupo",
  "ninguno": "Sin grupo",
  "ninguna": "Sin grupo",
  "no pertenezco": "Sin grupo",
  "no pertenezco a ninguno": "Sin grupo",
  "kamikaze mtb": "Kamikaze MTB",
  "empujando limites": "Empujando Límites",
  "xtralage team": "Xtralarge Team",
  "xtralarge team": "Xtralarge Team",
  "chicas treck": "Chicas Trek",
  "chicas trek": "Chicas Trek",
  "grand team bike cdelu": "Grand Team Bike CdelU",
}

export function normalizeGrupoCiclistas(value: string) {
  const clean = value.trim().replace(/\s+/g, " ")
  return GRUPO_ALIASES[normalizeLookupKey(clean)] || clean
}

export const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024

export function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) {
    return { mimeType: "image/jpeg", base64Data: dataUrl, extension: "jpg" }
  }

  const mimeType = match[1].toLowerCase()
  const extension = MIME_EXTENSIONS[mimeType]
  if (!extension) throw new Error("Formato de comprobante no permitido")

  return { mimeType, base64Data: match[2], extension }
}
