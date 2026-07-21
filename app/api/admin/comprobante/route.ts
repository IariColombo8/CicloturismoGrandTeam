import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase-admin"

const BUCKET = "comprobantes"
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
const ALLOWED_ROLES = new Set(["admin", "grandteam"])

const requestSchema = z.object({
  source: z.string().trim().min(1).max(4096),
})

function extractStoragePath(source: string) {
  const clean = source.trim()
  const markers = [
    "/storage/v1/object/public/comprobantes/",
    "/storage/v1/object/sign/comprobantes/",
    "/storage/v1/object/authenticated/comprobantes/",
  ]

  for (const marker of markers) {
    const index = clean.indexOf(marker)
    if (index !== -1) {
      return decodeURIComponent(clean.slice(index + marker.length).split("?")[0])
    }
  }

  // Los registros nuevos guardan únicamente la ruta dentro del bucket.
  if (!/^https?:\/\//i.test(clean) && !clean.startsWith("data:")) {
    return decodeURIComponent(clean.replace(/^\/+/, ""))
  }

  return null
}

function isSafeStoragePath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 1024 &&
    !path.includes("..") &&
    !path.includes("\\") &&
    !path.includes("\0")
  )
}

async function authorize(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (!token) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)

  if (userError || !userData?.user?.email) {
    return { error: NextResponse.json({ error: "Sesión inválida" }, { status: 401 }) }
  }

  const { data: adminRow, error: roleError } = await supabase
    .from("administradores")
    .select("role")
    .eq("email", userData.user.email)
    .maybeSingle()

  const role = (adminRow as { role?: string } | null)?.role
  if (roleError || !role || !ALLOWED_ROLES.has(role)) {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) }
  }

  return { supabase }
}

/**
 * POST /api/admin/comprobante
 * Genera una URL firmada del bucket privado `comprobantes` válida por un año.
 * Acepta tanto las URLs públicas antiguas como la ruta interna guardada por
 * las inscripciones nuevas.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req)
    if (auth.error) return auth.error

    const parsed = requestSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Comprobante inválido" }, { status: 400 })
    }

    const path = extractStoragePath(parsed.data.source)
    if (!path || !isSafeStoragePath(path)) {
      return NextResponse.json(
        { error: "No se pudo identificar la ruta del comprobante" },
        { status: 400 }
      )
    }

    const { data, error } = await auth.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, ONE_YEAR_SECONDS)

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "No se pudo abrir el comprobante" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        signedUrl: data.signedUrl,
        expiresIn: ONE_YEAR_SECONDS,
        expiresAt: new Date(Date.now() + ONE_YEAR_SECONDS * 1000).toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    )
  }
}
