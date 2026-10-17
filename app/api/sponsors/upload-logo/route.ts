import { NextRequest, NextResponse } from "next/server"
import { subirImagen } from "@/lib/api/subirImagen"

// Logo de sponsor al bucket publico "sponsors" (en la raiz, como siempre).
// Acepta cualquier imagen: antes solo JPG/PNG de 2MB y cualquier foto de
// celular quedaba afuera con un error que no explicaba nada.
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
      nombre,
      nombrePorDefecto: "sponsor",
    })

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status })
    }

    return NextResponse.json({ url: resultado.url })
  } catch (error) {
    console.error("Error en upload-logo:", error)
    const detalle = error instanceof Error ? error.message : "error desconocido"
    return NextResponse.json({ error: `Error del servidor: ${detalle}` }, { status: 500 })
  }
}
