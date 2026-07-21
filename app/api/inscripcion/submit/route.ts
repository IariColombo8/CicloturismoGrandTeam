import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase-admin"

// POST /api/inscripcion/submit
// Guarda la inscripción con service_role (bypasea RLS). "participantes" es
// la única tabla: identidad = dni. Reinscribirse o editar es la misma
// operación (upsert por dni), y "anios" acumula en qué ediciones participó.
const CURRENT_YEAR = 2026

const submitSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  dni: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().min(1),
  fechaNacimiento: z.string().min(1),
  paisTelefono: z.string().min(1),
  localidad: z.string().min(1),

  nombreEmergencia: z.string().min(1),
  telefonoEmergencia: z.string().min(1),
  relacionEmergencia: z.string().optional().default(""),

  haRecorridoDistancia: z.string().min(1),
  talleRemera: z.string().min(1),
  grupoSanguineo: z.string().min(1),
  tieneAlergias: z.string().min(1),
  alergias: z.string().optional().default(""),
  tieneProblemasSalud: z.string().min(1),
  condicionSalud: z.string().optional().default(""),

  numeroReferencia: z.string().min(1),
  // Data URL (data:image/jpeg;base64,...) generada por compressAndConvertToBase64 en el cliente.
  comprobanteBase64: z.string().min(1),
})

const BUCKET = "comprobantes"

export async function POST(req: NextRequest) {
  const parsed = submitSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }
  const formData = parsed.data

  const supabase = createAdminClient()

  type Existente = { numero_inscripcion: number | null; anios: number[] | null; token_qr: string | null }
  const { data: existente } = (await supabase
    .from("participantes")
    .select("numero_inscripcion, anios, token_qr")
    .eq("dni", formData.dni)
    .maybeSingle()) as { data: Existente | null }

  // Si ya tenía número asignado para este año, lo conservamos (edición).
  // Si no, pedimos uno nuevo (alta o reinscripción en otro año).
  const yaInscriptoEsteAnio = !!existente?.numero_inscripcion && (existente?.anios ?? []).includes(CURRENT_YEAR)
  let numeroInscripcion = existente?.numero_inscripcion ?? null

  if (!yaInscriptoEsteAnio) {
    const { data: nuevoNumero, error: numberError } = await supabase.rpc("next_inscription_number", {
      p_year: String(CURRENT_YEAR),
    })
    if (numberError) {
      return NextResponse.json({ error: numberError.message }, { status: 500 })
    }
    numeroInscripcion = nuevoNumero
  }

  // Subir el comprobante a Storage en vez de guardarlo en base64 en la tabla.
  let comprobantePagoUrl: string | null = null
  try {
    const base64Data = formData.comprobanteBase64.split(",").pop() ?? formData.comprobanteBase64
    const buffer = Buffer.from(base64Data, "base64")
    const path = `inscripciones/${formData.dni}/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      comprobantePagoUrl = urlData.publicUrl
    }
  } catch {
    // El comprobante falló pero continuamos con la inscripción.
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
      categoria: formData.talleRemera,
      provincia: formData.localidad,
      numero_inscripcion: numeroInscripcion,
      talla_camiseta: formData.talleRemera,
      grupo_sanguineo: formData.grupoSanguineo,

      fecha_nacimiento: formData.fechaNacimiento,
      pais: formData.paisTelefono,
      nombre_emergencia: formData.nombreEmergencia,
      telefono_emergencia: formData.telefonoEmergencia,
      relacion_emergencia: formData.relacionEmergencia,

      ha_recorrido_distancia: formData.haRecorridoDistancia,
      tiene_alergias: formData.tieneAlergias,
      alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
      tiene_problemas_salud: formData.tieneProblemasSalud,
      condicion_salud: formData.tieneProblemasSalud === "si" ? formData.condicionSalud : "",

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
