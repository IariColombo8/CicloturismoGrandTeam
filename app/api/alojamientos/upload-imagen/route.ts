import { NextRequest, NextResponse } from "next/server"
import { subirImagen } from "@/lib/api/subirImagen"

// Foto de alojamiento al bucket publico "sponsors" (carpeta alojamientos/).
// Declaraba 6MB y WEBP/AVIF, pero el bucket solo aceptaba 2MB de JPG/PNG:
// el Storage las rechazaba y la pantalla decia "Error al subir la imagen".
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const nombre = formData.get("nombre") as string | null

    if (!file) {
      return NextResponse.json({ error: "No llego ningun archivo" }, { status: 400 })
    }

    const resultado = await subirImagen({
      file,
      carpeta: "alojamientos",
      nombre,
      nombrePorDefecto: "alojamiento",
    })

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status })
    }

    return NextResponse.json({ url: resultado.url })
  } catch (error) {
    console.error("Error en alojamientos/upload-imagen:", error)
    const detalle = error instanceof Error ? error.message : "error desconocido"
    return NextResponse.json({ error: `Error del servidor: ${detalle}` }, { status: 500 })
  }
}
