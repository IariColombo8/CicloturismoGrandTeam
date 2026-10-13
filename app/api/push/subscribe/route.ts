import { NextResponse, type NextRequest } from "next/server"
import { autorizar } from "@/lib/api/autorizar"
import { pushConfigurado } from "@/lib/push/enviar"

export const dynamic = "force-dynamic"

/**
 * POST /api/push/subscribe
 * Registra el dispositivo del admin para recibir notificaciones push.
 * Body: { endpoint, keys: { p256dh, auth } }
 */
export async function POST(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error
  const { supabase, email } = auth.ok

  if (!pushConfigurado()) {
    return NextResponse.json(
      { error: "El servidor no tiene configuradas las claves VAPID. Ver docs/notificaciones.md" },
      { status: 503 }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  } | null

  const endpoint = body?.endpoint?.trim()
  const p256dh = body?.keys?.p256dh?.trim()
  const clave = body?.keys?.auth?.trim()

  if (!endpoint || !p256dh || !clave) {
    return NextResponse.json({ error: "Suscripcion incompleta" }, { status: 400 })
  }

  // Upsert por endpoint: si el mismo dispositivo vuelve a activar, se actualiza
  // en vez de duplicarse.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh,
      auth: clave,
      email,
      user_agent: req.headers.get("user-agent")?.slice(0, 300) || null,
    },
    { onConflict: "endpoint" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/push/subscribe?endpoint=...
 * Da de baja el dispositivo.
 */
export async function DELETE(req: NextRequest) {
  const auth = await autorizar(req, ["admin", "grandteam"])
  if (auth.error) return auth.error
  const { supabase } = auth.ok

  const endpoint = (req.nextUrl.searchParams.get("endpoint") || "").trim()
  if (!endpoint) {
    return NextResponse.json({ error: "Falta el endpoint" }, { status: 400 })
  }

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
