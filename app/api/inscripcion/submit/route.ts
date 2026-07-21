import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase-admin"

const CURRENT_YEAR = 2026
const BUCKET = "comprobantes"

const submitSchema = z.object({
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
  grupoSanguineo: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "DESCONOCIDO"]),
  esCeliaco: z.enum(["si", "no"]),
  tieneAlergias: z.enum(["si", "no"]),
  alergias: z.string().trim().optional().default(""),
  tieneProblemasSalud: z.enum(["si", "no"]),
  condicionSalud: z.string().trim().optional().default(""),

  numeroReferencia: z.string().trim().min(1),
  comprobanteBase64: z.string().min(1),
})


function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function normalizeGrupoCiclistas(value: string) {
  const clean = value.trim().replace(/\s+/g, " ")
  const key = normalizeLookupKey(clean)

  const aliases: Record<string, string> = {
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

  return aliases[key] || clean
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) {
    return { mimeType: "image/jpeg", base64Data: dataUrl, extension: "jpg" }
  }

  const mimeType = match[1].toLowerCase()
  const extension = MIME_EXTENSIONS[mimeType]
  if (!extension) throw new Error("Formato de comprobante no permitido")

  return { mimeType, base64Data: match[2], extension }
}

export async function POST(req: NextRequest) {
  const parsed = submitSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const formData = parsed.data
  const supabase = createAdminClient()

  type Existente = {
    numero_inscripcion: number | null
    anios: number[] | null
    token_qr: string | null
  }

  const { data: existente, error: existingError } = (await supabase
    .from("participantes")
    .select("numero_inscripcion, anios, token_qr")
    .eq("dni", formData.dni)
    .maybeSingle()) as { data: Existente | null; error: { message: string } | null }

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const yaInscriptoEsteAnio =
    !!existente?.numero_inscripcion && (existente?.anios ?? []).includes(CURRENT_YEAR)
  let numeroInscripcion = existente?.numero_inscripcion ?? null

  if (!yaInscriptoEsteAnio) {
    const { data: nuevoNumero, error: numberError } = await supabase.rpc(
      "next_inscription_number",
      { p_year: String(CURRENT_YEAR) }
    )

    if (numberError) {
      return NextResponse.json({ error: numberError.message }, { status: 500 })
    }
    numeroInscripcion = nuevoNumero
  }

  let comprobantePagoUrl: string
  try {
    const { mimeType, base64Data, extension } = parseDataUrl(formData.comprobanteBase64)
    const buffer = Buffer.from(base64Data, "base64")

    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El comprobante está vacío o supera los 5 MB" },
        { status: 400 }
      )
    }

    const path = `inscripciones/${formData.dni}/${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    })

    if (uploadError) throw uploadError

    // El bucket es privado. Guardamos la ruta estable del objeto y el admin
    // genera una URL firmada válida por un año cuando necesita visualizarlo.
    comprobantePagoUrl = path
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el comprobante"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const anios = Array.from(new Set([...(existente?.anios ?? []), CURRENT_YEAR]))
  const tokenQR = existente?.token_qr ?? crypto.randomUUID()

  const { error: upsertError } = await supabase.from("participantes").upsert(
    {
      dni: formData.dni,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      telefono: formData.telefono,
      pais: formData.pais,
      localidad: formData.localidad,
      grupo_ciclistas: normalizeGrupoCiclistas(formData.grupoCiclistas),
      es_celiaco: formData.esCeliaco === "si",
      grupo_sanguineo: formData.grupoSanguineo.toUpperCase(),

      fecha_nacimiento: formData.fechaNacimiento,
      nombre_emergencia: formData.nombreEmergencia,
      telefono_emergencia: formData.telefonoEmergencia,
      relacion_emergencia: formData.relacionEmergencia,

      ha_recorrido_distancia: formData.haRecorridoDistancia,
      tiene_alergias: formData.tieneAlergias,
      alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
      tiene_problemas_salud: formData.tieneProblemasSalud,
      condicion_salud:
        formData.tieneProblemasSalud === "si" ? formData.condicionSalud : "",

      metodo_pago: "transferencia",
      numero_referencia: formData.numeroReferencia,
      comprobante_pago_url: comprobantePagoUrl,

      estado: "pendiente",
      aprobado_por_admin: false,
      anios,
      token_qr: tokenQR,
      fecha_inscripcion: new Date().toISOString(),
    },
    { onConflict: "dni" }
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, numeroInscripcion, tokenQR })
}
