import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/avif"]
const MAX_BYTES = 6 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

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
      return NextResponse.json(
        { error: "La imagen es muy grande. Maximo 6MB." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
    const path = `galeria/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("galeria")
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("Error subiendo foto de galeria:", uploadError)
      return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("galeria").getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error("Error en galeria/upload:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
