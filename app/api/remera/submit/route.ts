import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase-admin"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_BASE64_LENGTH = 7_100_000
const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const

const submitSchema = z
  .object({
    dni: z.string().trim().regex(/^\d{7,8}$/, "DNI inválido"),
    nombre: z.string().trim().min(1, "Nombre requerido").max(120),
    telefono: z.string().trim().min(1, "Teléfono requerido").max(40),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email requerido")
      .email("Email inválido")
      .max(160),
    items: z
      .array(
        z.object({
          genero: z.enum(["hombre", "mujer"]).default("hombre"),
          talle: z.string().trim().min(1).max(10),
          cantidad: z.number().int().min(1).max(999),
        }),
      )
      .min(1, "Seleccioná al menos un talle")
      .max(50),
    envio_tipo: z.enum(["retiro", "envio"]),
    direccion: z.string().trim().max(300).optional().default(""),
    estaRegistrado: z.boolean().optional().default(false),
    comprobante_base64: z.string().max(MAX_BASE64_LENGTH).optional(),
    comprobante_mime: z.enum(MIME_PERMITIDOS).optional(),
    comprobante_extension: z
      .string()
      .regex(/^[a-z0-9]{1,5}$/i, "Extensión inválida")
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.envio_tipo === "envio" && !data.direccion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direccion"],
        message: "Dirección requerida para envío",
      })
    }

    const hasFile = Boolean(data.comprobante_base64 || data.comprobante_mime)
    const hasCompleteFile = Boolean(data.comprobante_base64 && data.comprobante_mime)
    if (hasFile && !hasCompleteFile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comprobante_base64"],
        message: "El comprobante está incompleto",
      })
    }
  })

export async function POST(req: NextRequest) {
  let raw: unknown

  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path[0]
    const prefix = typeof field === "string" ? `${field}: ` : ""
    return NextResponse.json(
      { error: `${prefix}${issue?.message ?? "Datos inválidos"}` },
      { status: 400 },
    )
  }

  const {
    dni,
    nombre,
    telefono,
    email,
    items,
    envio_tipo,
    direccion,
    estaRegistrado,
    comprobante_base64,
    comprobante_mime,
    comprobante_extension,
  } = parsed.data

  const supabase = createAdminClient()
  let comprobanteUrl: string | null = null

  if (comprobante_base64 && comprobante_mime) {
    try {
      const base64Data = comprobante_base64.split(",").pop() ?? comprobante_base64
      const buffer = Buffer.from(base64Data, "base64")
      if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "El comprobante está vacío o supera los 5 MB." },
          { status: 400 },
        )
      }

      const extension = comprobante_extension ?? "jpg"
      const path = `remera/${dni}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(path, buffer, {
          contentType: comprobante_mime,
          upsert: true,
        })

      if (uploadError) {
        console.error("Error subiendo comprobante de remera:", uploadError)
        return NextResponse.json(
          { error: "No se pudo guardar el comprobante. Intentá nuevamente." },
          { status: 500 },
        )
      }

      const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(path)
      comprobanteUrl = urlData.publicUrl
    } catch (error) {
      console.error("Error procesando comprobante de remera:", error)
      return NextResponse.json(
        { error: "No se pudo procesar el comprobante." },
        { status: 500 },
      )
    }
  }

  const payload = {
    dni,
    nombre,
    telefono,
    email,
    items,
    envio_tipo,
    direccion: direccion || null,
    esta_registrado: estaRegistrado,
    estado: "pendiente" as const,
    updated_at: new Date().toISOString(),
    ...(comprobanteUrl !== null && {
      comprobante_url: comprobanteUrl,
      tiene_comprobante: true,
    }),
  }

  const { error: upsertError } = await supabase
    .from("remera")
    .upsert(payload, { onConflict: "dni" })

  if (upsertError) {
    console.error("Error guardando pedido de remera:", upsertError)
    const missingEmailColumn =
      upsertError.message?.toLowerCase().includes("email") &&
      upsertError.message?.toLowerCase().includes("column")

    return NextResponse.json(
      {
        error: missingEmailColumn
          ? "La tabla de remeras todavía no tiene habilitado el campo email. Aplicá la migración incluida."
          : "No se pudo guardar el pedido de remera.",
      },
      { status: 500 },
    )
  }

  // Si existe como participante, mantenemos actualizado su email.
  // Si no existe, el update no crea filas y el correo igualmente queda en el pedido de remera.
  const { error: participanteError } = await supabase
    .from("participantes")
    .update({ email })
    .eq("dni", dni)

  if (participanteError) {
    // El pedido ya quedó registrado; este error secundario no debe duplicarlo.
    console.error("No se pudo actualizar el email del participante:", participanteError)
  }

  return NextResponse.json({ ok: true, email })
}
