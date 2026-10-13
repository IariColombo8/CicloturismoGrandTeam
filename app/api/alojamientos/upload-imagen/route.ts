import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/avif"]
const MAX_BYTES = 6 * 1024 * 1024

// Sube una foto de alojamiento al bucket publico "sponsors" (carpeta alojamientos/).
// Acepta formatos de foto (no solo logos) y hasta 6MB, igual que la galeria.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const nombre = formData.get("nombre") as string | null

    if (!file) {
      return NextResponse.json({ error: "No se envio archivo" }, { status: 400 })
    }

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Solo JPG, PNG, WEBP o AVIF." },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "La imagen es muy grande. Maximo 6MB." }, { status: 400 })
    }

    const supabase = createAdminClient()

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
    const slug = (nombre || "alojamiento")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "alojamiento"
    const path = `alojamientos/${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("sponsors")
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("Error subiendo imagen de alojamiento:", uploadError)
      return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("sponsors").getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error("Error en alojamientos/upload-imagen:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
