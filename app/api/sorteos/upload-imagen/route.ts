import { NextRequest, NextResponse } from "next/server"
import { subirImagen } from "@/lib/api/subirImagen"

// Foto de un premio al bucket publico "sponsors" (carpeta sorteos/).
// Mismo criterio que alojamientos: cualquier imagen, y si falla se dice por que.
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
      carpeta: "sorteos",
      nombre,
      nombrePorDefecto: "premio",
    })

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status })
    }

    return NextResponse.json({ url: resultado.url })
  } catch (error) {
    console.error("Error en sorteos/upload-imagen:", error)
    const detalle = error instanceof Error ? error.message : "error desconocido"
    return NextResponse.json({ error: `Error del servidor: ${detalle}` }, { status: 500 })
  }
}
