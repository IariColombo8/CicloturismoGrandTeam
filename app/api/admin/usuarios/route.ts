import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import type { SupabaseClient } from "@supabase/supabase-js"

type Rol = "admin" | "grandteam" | "remera" | "usuario"
const ROLES_VALIDOS: Rol[] = ["admin", "grandteam", "remera", "usuario"]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface AutorizacionOk {
  supabase: SupabaseClient
  email: string
}

/**
 * Valida que el request provenga de un usuario autenticado con rol admin.
 * Lee el access_token del header Authorization y verifica el rol en la tabla
 * administradores (comparando el email sin distinguir mayusculas).
 */
async function autorizarAdmin(
  req: NextRequest
): Promise<{ error: NextResponse; ok?: never } | { ok: AutorizacionOk; error?: never }> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (!token) {
    return { error: NextResponse.json({ error: "No autenticado. Volve a iniciar sesion." }, { status: 401 }) }
  }

  let supabase: SupabaseClient
  try {
    supabase = createAdminClient()
  } catch {
    return {
      error: NextResponse.json(
        { error: "El servidor no tiene configurada SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      ),
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user?.email) {
    return { error: NextResponse.json({ error: "Sesion invalida o vencida. Volve a iniciar sesion." }, { status: 401 }) }
  }

  const email = userData.user.email.toLowerCase()

  const { data: adminRow, error: adminError } = await supabase
    .from("administradores")
    .select("role")
    .ilike("email", email)
    .maybeSingle()

  if (adminError) {
    return { error: NextResponse.json({ error: `Error al verificar el rol: ${adminError.message}` }, { status: 500 }) }
  }

  if (!adminRow || (adminRow as { role: string }).role !== "admin") {
    return {
      error: NextResponse.json(
        { error: `Acceso denegado: ${email} no tiene rol admin en la tabla administradores.` },
        { status: 403 }
      ),
    }
  }

  return { ok: { supabase, email } }
}

/** Cuenta cuantos admins quedan en la tabla. */
async function contarAdmins(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("administradores")
    .select("email", { count: "exact", head: true })
    .eq("role", "admin")
  return count ?? 0
}

/**
 * GET /api/admin/usuarios
 * Lista los usuarios que iniciaron sesion (auth.users) fusionados con los
 * registros de la tabla administradores. Los registros de administradores sin
 * cuenta creada todavia se devuelven con `pendiente: true` (invitados).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await autorizarAdmin(req)
    if (auth.error) return auth.error
    const { supabase, email: miEmail } = auth.ok

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (authError) {
      return NextResponse.json({ error: `No se pudieron listar las cuentas: ${authError.message}` }, { status: 500 })
    }

    const { data: admins, error: adminsError } = await supabase
      .from("administradores")
      .select("email, role, display_name")
    if (adminsError) {
      return NextResponse.json({ error: `No se pudo leer administradores: ${adminsError.message}` }, { status: 500 })
    }

    interface AdminRow {
      email: string
      role: string
      display_name: string | null
    }

    const filasPorEmail = new Map<string, AdminRow>()
    for (const a of (admins || []) as AdminRow[]) {
      if (a.email) filasPorEmail.set(a.email.toLowerCase(), a)
    }

    const emailsConCuenta = new Set<string>()

    const usuarios = (authData?.users || []).map((u) => {
      const email = (u.email || "").toLowerCase()
      emailsConCuenta.add(email)
      const meta = (u.user_metadata || {}) as Record<string, unknown>
      const fila = filasPorEmail.get(email)
      return {
        id: u.id,
        email,
        nombre:
          fila?.display_name ||
          (meta.full_name as string) ||
          (meta.name as string) ||
          email.split("@")[0] ||
          "Sin nombre",
        avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
        rol: (fila?.role as Rol) || "usuario",
        creado: u.created_at,
        ultimo_acceso: u.last_sign_in_at || null,
        pendiente: false,
      }
    })

    // Invitados: estan en administradores pero todavia no iniciaron sesion
    for (const [email, fila] of filasPorEmail) {
      if (emailsConCuenta.has(email)) continue
      usuarios.push({
        id: `pendiente:${email}`,
        email,
        nombre: fila.display_name || email.split("@")[0],
        avatar_url: null,
        rol: fila.role as Rol,
        creado: "",
        ultimo_acceso: null,
        pendiente: true,
      })
    }

    // Pendientes primero, luego por ultimo acceso mas reciente
    usuarios.sort((a, b) => {
      if (a.pendiente !== b.pendiente) return a.pendiente ? -1 : 1
      const ta = a.ultimo_acceso ? new Date(a.ultimo_acceso).getTime() : 0
      const tb = b.ultimo_acceso ? new Date(b.ultimo_acceso).getTime() : 0
      return tb - ta
    })

    return NextResponse.json({ success: true, usuarios, miEmail })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/usuarios
 * Crea o actualiza el rol de un usuario por email. Sirve tanto para cambiar el
 * rol de alguien que ya entro como para invitar a alguien que todavia no tiene
 * cuenta (queda pendiente hasta que ingrese con ese mismo email).
 * Body: { email, role, nombre?, authUserId? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await autorizarAdmin(req)
    if (auth.error) return auth.error
    const { supabase, email: miEmail } = auth.ok

    const body = await req.json().catch(() => null)
    const email = String(body?.email || "").trim().toLowerCase()
    const role = body?.role as Rol
    const authUserId = (body?.authUserId as string | undefined) || null
    const nombre = String(body?.nombre || "").trim() || null

    if (!email) {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 })
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "El email no tiene un formato valido" }, { status: 400 })
    }
    if (!ROLES_VALIDOS.includes(role)) {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 })
    }

    // No dejar el sistema sin ningun admin
    if (email === miEmail && role !== "admin") {
      const admins = await contarAdmins(supabase)
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Sos el unico admin. Asigna otro admin antes de bajarte el rol." },
          { status: 400 }
        )
      }
    }

    if (role === "usuario") {
      const { error } = await supabase.from("administradores").delete().ilike("email", email)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, message: "Rol quitado (queda como usuario)" })
    }

    const registro: Record<string, unknown> = {
      email,
      role,
      login_method: "google",
    }
    if (nombre) registro.display_name = nombre
    if (authUserId) registro.auth_user_id = authUserId

    const { error } = await supabase
      .from("administradores")
      .upsert(registro, { onConflict: "email" })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Rol actualizado a ${role}` })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/usuarios?email=X
 * Elimina el registro de administradores (usado para quitar invitaciones
 * pendientes). No borra la cuenta de auth.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await autorizarAdmin(req)
    if (auth.error) return auth.error
    const { supabase, email: miEmail } = auth.ok

    const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 })
    }

    if (email === miEmail) {
      const admins = await contarAdmins(supabase)
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Sos el unico admin. No podes eliminarte." },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase.from("administradores").delete().ilike("email", email)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Registro eliminado" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
