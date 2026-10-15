import { NextResponse } from "next/server"

/**
 * Version del sitio que esta publicada ahora mismo.
 *
 * El navegador la compara con la version que tiene cargada (horneada en el
 * bundle como NEXT_PUBLIC_BUILD_ID). Si no coinciden, la persona esta viendo
 * una version vieja — porque la dejo abierta durante un deploy, o porque el
 * telefono le sirvio una copia guardada — y se le avisa que recargue.
 *
 * Nunca se cachea: si se cacheara, no serviria para nada.
 */
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_BUILD_ID || "desconocida" },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  )
}
