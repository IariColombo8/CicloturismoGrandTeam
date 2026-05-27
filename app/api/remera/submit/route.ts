import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import type { RemeraItem } from "@/types/database"

interface SubmitBody {
  dni: string
  nombre: string
  telefono: string
  items: RemeraItem[]
  envio_tipo: "retiro" | "envio"
  direccion?: string
  estaRegistrado: boolean
  comprobante_base64?: string
  comprobante_mime?: string
  comprobante_extension?: string
}

// POST /api/remera/submit
// Guarda o actualiza un pedido de remera (UPSERT por DNI).
// Sube el comprobante a Supabase Storage si viene adjunto.
export async function POST(req: NextRequest) {
  let body: SubmitBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { dni, nombre, telefono, items, envio_tipo, direccion, estaRegistrado, comprobante_base64, comprobante_mime, comprobante_extension } = body

  if (!dni || !nombre || !items || items.length === 0) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

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
