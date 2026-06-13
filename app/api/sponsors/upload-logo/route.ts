import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const sponsorName = formData.get("nombre") as string | null

    if (!file) {
      return NextResponse.json({ error: "No se envio archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Solo se aceptan archivos JPG o PNG." },
        { status: 400 }
      )
    }

    // Validar tamanio (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo es muy grande. Maximo 2MB." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Generar nombre unico
    const ext = file.name.split(".").pop() || "png"
    const slug = (sponsorName || "sponsor")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const path = `sponsors/${slug}-${Date.now()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("comprobantes")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("Error subiendo logo:", uploadError)
      return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("comprobantes")
      .getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error("Error en upload-logo:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
