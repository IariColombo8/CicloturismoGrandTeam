import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import {
  CURRENT_YEAR,
  MAX_COMPROBANTE_BYTES,
  normalizeGrupoCiclistas,
  parseDataUrl,
  submitSchema,
} from "@/lib/inscripcion-schema"

const BUCKET = "comprobantes"

// Da de alta un grupo de ciclistas nuevo en content_settings.id = "grupos"
// para que quede disponible en el combo del próximo que se inscriba.
// Relee la lista actual de la DB (en vez de confiar en un valor cacheado en
// el cliente) para minimizar pisadas entre altas concurrentes.
async function guardarGrupoNuevoSiCorresponde(
  supabase: ReturnType<typeof createAdminClient>,
  grupo: string
) {
  if (!grupo || grupo === "Sin grupo") return

  const { data: currentConfig } = await supabase
    .from("content_settings")
    .select("data")
    .eq("id", "grupos")
    .maybeSingle()

  const listaActual: string[] = (currentConfig?.data as { lista?: string[] } | null)?.lista ?? []
  if (listaActual.some((g) => g.toLowerCase() === grupo.toLowerCase())) return

  await supabase
    .from("content_settings")
    .upsert({ id: "grupos", data: { lista: [...listaActual, grupo] } })
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

    if (!buffer.length || buffer.length > MAX_COMPROBANTE_BYTES) {
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

  await guardarGrupoNuevoSiCorresponde(supabase, normalizeGrupoCiclistas(formData.grupoCiclistas))

  return NextResponse.json({ ok: true, numeroInscripcion, tokenQR })
}
