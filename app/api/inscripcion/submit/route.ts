import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import {
  CURRENT_YEAR,
  MAX_COMPROBANTE_BYTES,
  normalizeGrupoCiclistas,
  parseDataUrl,
  submitSchema,
} from "@/lib/inscripcion-schema"
import { notificarInscripcionNueva } from "@/lib/push/inscripcion"

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
  const cuerpo = await req.json().catch(() => null)
  const parsed = submitSchema.safeParse(cuerpo)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const formData = parsed.data
  const supabase = createAdminClient()

  // Avisos para el equipo: nada de esto corta la inscripción.
  const notas: string[] = []
  if (formData.comprobanteNota) notas.push(formData.comprobanteNota)

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

  // El numero de inscripcion NO se asigna acá. Se otorga recien cuando el
  // admin confirma la inscripcion (RPC assign_inscription_number), asi la
  // numeracion queda correlativa 1,2,3... entre los confirmados y los
  // pendientes no ocupan un numero.
  const numeroInscripcion = existente?.numero_inscripcion ?? null

  // El comprobante no puede voltear una inscripción: si no se puede subir, la
  // fila se guarda igual y la nota le dice al equipo que lo pida aparte.
  // Antes, cualquier problema acá devolvia 500 y la persona veía un error
  // despues de haber llenado los cuatro pasos.
  let comprobantePagoUrl = ""
  try {
    const archivo = parseDataUrl(formData.comprobanteBase64)

    if (!archivo) {
      if (formData.comprobanteBase64) {
        notas.push("El comprobante llegó en un formato que no se pudo guardar.")
      }
    } else {
      const buffer = Buffer.from(archivo.base64Data, "base64")

      if (!buffer.length) {
        notas.push("El comprobante llegó vacío.")
      } else if (buffer.length > MAX_COMPROBANTE_BYTES) {
        notas.push(
          `El comprobante pesaba ${(buffer.length / (1024 * 1024)).toFixed(1)} MB y no se pudo guardar. Pedírselo por WhatsApp.`
        )
      } else {
        const path = `inscripciones/${formData.dni}/${Date.now()}.${archivo.extension}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
          contentType: archivo.mimeType,
          upsert: false,
        })

        if (uploadError) {
          notas.push(`No se pudo guardar el comprobante (${uploadError.message}). Pedírselo por WhatsApp.`)
        } else {
          // El bucket es privado. Guardamos la ruta estable del objeto y el
          // admin genera una URL firmada cuando necesita visualizarlo.
          comprobantePagoUrl = path
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "error desconocido"
    notas.push(`No se pudo procesar el comprobante (${message}). Pedírselo por WhatsApp.`)
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
      comprobante_nota: notas.join(" · "),

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

  // Lo que sigue es "nice to have": la inscripcion ya esta guardada, y ningun
  // fallo de acá puede devolverle un error a la persona.
  try {
    await guardarGrupoNuevoSiCorresponde(supabase, normalizeGrupoCiclistas(formData.grupoCiclistas))
  } catch {}

  // Aviso a los organizadores. Va despues del alta y con await para que la
  // funcion serverless no muera antes de mandarlo.
  try {
    await notificarInscripcionNueva({
      nombre: `${formData.nombre} ${formData.apellido}`.trim(),
      localidad: formData.localidad,
      grupo: normalizeGrupoCiclistas(formData.grupoCiclistas),
    })
  } catch {}

  return NextResponse.json({ ok: true, numeroInscripcion, tokenQR })
}
