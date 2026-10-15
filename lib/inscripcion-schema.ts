import { z } from "zod"

// Logica pura de validacion/normalizacion de la inscripcion.
// Vive fuera de la API route para poder testearse sin levantar Next ni Supabase.

export const CURRENT_YEAR = 2026

export const GRUPOS_SANGUINEOS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "DESCONOCIDO",
] as const

// Política de validación: la inscripción NUNCA se rechaza por un dato
// secundario. Lo único imprescindible es el DNI (es la clave de la fila) y el
// nombre. Todo lo demás se normaliza a algo guardable y, si viene raro, queda
// como está para que el equipo lo corrija desde el panel. Un formulario que
// contesta "datos inválidos" deja a la persona sin inscripción y sin saber qué
// hacer, y eso es peor que una fila con un dato para revisar.

/** Texto que, venga como venga (null, número, espacios), termina en string. */
const texto = (porDefecto = "") =>
  z
    .any()
    .transform((v) => (v === null || v === undefined ? porDefecto : String(v).trim()))
    .transform((v) => (v === "" ? porDefecto : v))

/** "si" / "no" tolerante: sí, SI, true, 1 → "si". Cualquier otra cosa → "no". */
const siNo = () =>
  z
    .any()
    .transform((v) => {
      const s = String(v ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
      return s === "si" || s === "true" || s === "1" || s === "yes" ? "si" : "no"
    })

export const submitSchema = z.object({
  // Imprescindibles: sin esto no hay fila que guardar.
  nombre: z.string().trim().min(1),
  apellido: texto(),
  dni: z
    .any()
    .transform((v) => String(v ?? "").replace(/\D/g, ""))
    .refine((v) => v.length >= 6 && v.length <= 10, "DNI inválido"),

  // El resto entra como venga.
  email: texto(),
  telefono: texto(),
  fechaNacimiento: texto(),
  pais: texto("Argentina"),
  localidad: texto(),

  nombreEmergencia: texto(),
  telefonoEmergencia: texto(),
  relacionEmergencia: texto(),

  haRecorridoDistancia: siNo(),
  grupoCiclistas: texto("Sin grupo"),
  grupoSanguineo: z
    .any()
    .transform((v) => {
      const s = String(v ?? "").trim().toUpperCase()
      return (GRUPOS_SANGUINEOS as readonly string[]).includes(s) ? s : "DESCONOCIDO"
    }),
  esCeliaco: siNo(),
  tieneAlergias: siNo(),
  alergias: texto(),
  tieneProblemasSalud: siNo(),
  condicionSalud: texto(),

  numeroReferencia: texto(),
  /** Puede venir vacío: hay comprobantes que no se pueden subir (ver comprobanteNota). */
  comprobanteBase64: texto(),
  /** Por qué la inscripción llegó sin comprobante, para que el equipo lo pida. */
  comprobanteNota: texto(),
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

/**
 * Tope del archivo ya procesado. El navegador comprime las fotos antes de
 * enviarlas (lib/inscripcion/comprobante.ts), así que una captura de 20 MB
 * llega bastante abajo de esto; el margen es para los PDF.
 */
export const MAX_COMPROBANTE_BYTES = 4 * 1024 * 1024

/**
 * Lee el data URL del comprobante. Nunca lanza: si el formato no se reconoce
 * devuelve null y la inscripción se guarda sin archivo, con su nota.
 */
export function parseDataUrl(
  dataUrl: string,
): { mimeType: string; base64Data: string; extension: string } | null {
  if (!dataUrl) return null

  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) {
    // Base64 pelado: asumimos JPEG, que es lo que manda el compresor.
    return { mimeType: "image/jpeg", base64Data: dataUrl, extension: "jpg" }
  }

  const mimeType = match[1].toLowerCase()
  const extension = MIME_EXTENSIONS[mimeType]
  if (!extension) return null

  return { mimeType, base64Data: match[2], extension }
}
