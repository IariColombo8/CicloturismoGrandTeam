import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase-admin"
import { TALLES_DISPONIBLES } from "@/types/database"

// Límite del comprobante en base64. Una imagen de ~3MB ≈ 4M caracteres en
// base64; acotamos para evitar payloads gigantes (DoS de memoria).
const MAX_BASE64_LENGTH = 5_000_000
// Debe coincidir con el `accept` del input en RemeroFormModal (JPG, PNG, PDF).
const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const

// Validación de entrada en el borde: nunca confiar en el cliente.
const submitSchema = z.object({
  dni: z.string().trim().regex(/^\d{7,8}$/, "DNI inválido"),
  nombre: z.string().trim().min(1).max(120),
  telefono: z.string().trim().max(40).optional().default(""),
  items: z
    .array(
      z.object({
        talle: z.enum(TALLES_DISPONIBLES),
        cantidad: z.number().int().min(1).max(50),
      })
    )
    .min(1, "Seleccioná al menos un talle")
    .max(20),
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

// POST /api/remera/submit
// Guarda o actualiza un pedido de remera (UPSERT por DNI).
// Sube el comprobante a Supabase Storage si viene adjunto.
export async function POST(req: NextRequest) {
  let raw: unknown

  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    )
  }

  const {
    dni,
    nombre,
    telefono,
    items,
    envio_tipo,
    direccion,
    estaRegistrado,
    comprobante_base64,
    comprobante_mime,
    comprobante_extension,
  } = parsed.data

  const supabase = createAdminClient()
  let comprobante_url: string | null = null

  // Subir comprobante a Storage si viene
  if (comprobante_base64 && comprobante_mime) {
    try {
      const base64Data = comprobante_base64.split(",").pop() ?? comprobante_base64
      const buffer = Buffer.from(base64Data, "base64")
      const ext = comprobante_extension ?? "jpg"
      const path = `remera/${dni}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(path, buffer, {
          contentType: comprobante_mime,
          upsert: true,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("comprobantes")
          .getPublicUrl(path)
        comprobante_url = urlData.publicUrl
      }
    } catch {
      // El comprobante falló pero continuamos con el pedido
    }
  }

  const payload = {
    dni,
    nombre,
    telefono: telefono || null,
    items,
    envio_tipo,
    direccion: direccion || null,
    esta_registrado: estaRegistrado,
    estado: "pendiente" as const,
    updated_at: new Date().toISOString(),
    ...(comprobante_url !== null && {
      comprobante_url,
      tiene_comprobante: true,
    }),
  }

  const { error } = await supabase
    .from("remera")
    .upsert(payload, { onConflict: "dni" })

  if (error) {
    return NextResponse.json({ error: "Error guardando el pedido" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
