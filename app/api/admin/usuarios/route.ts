import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

type Rol = "admin" | "grandteam" | "usuario"
const ROLES_VALIDOS: Rol[] = ["admin", "grandteam", "usuario"]

/**
 * Valida que el request provenga de un usuario autenticado con rol admin.
 * Lee el access_token del header Authorization y verifica el rol en la tabla administradores.
 * Devuelve el cliente admin si autoriza, o una respuesta de error si no.
 */
async function autorizarAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (!token) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) }
  }

  const supabase = createAdminClient()

  // Verificar token y obtener el usuario real
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user?.email) {
    return { error: NextResponse.json({ error: "Sesion invalida" }, { status: 401 }) }
  }

  // Verificar que sea admin en la tabla administradores
  const { data: adminRow } = await supabase
    .from("administradores")
    .select("role")
    .eq("email", userData.user.email)
    .maybeSingle()

  if (!adminRow || (adminRow as { role: string }).role !== "admin") {
    return { error: NextResponse.json({ error: "Acceso denegado: requiere rol admin" }, { status: 403 }) }
  }

  return { supabase }
}

/**
 * GET /api/admin/usuarios
 * Lista todos los usuarios autenticados (auth.users) con su rol actual.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await autorizarAdmin(req)
    if (auth.error) return auth.error
    const supabase = auth.supabase

    // Listar usuarios de auth.users (paginado, traemos hasta 1000)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Traer la tabla administradores para cruzar roles por email
    const { data: admins, error: adminsError } = await supabase
      .from("administradores")
      .select("email, role")
    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 })
    }

    const rolPorEmail = new Map<string, string>()
    for (const a of admins || []) {
      const row = a as { email: string; role: string }
      if (row.email) rolPorEmail.set(row.email.toLowerCase(), row.role)
    }

    const usuarios = (authData?.users || []).map((u) => {
      const email = u.email || ""
      const meta = (u.user_metadata || {}) as Record<string, unknown>
      return {
        id: u.id,
        email,
        nombre:
          (meta.full_name as string) || (meta.name as string) || email.split("@")[0] || "Sin nombre",
        avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
        rol: rolPorEmail.get(email.toLowerCase()) || "usuario",
        creado: u.created_at,
        ultimo_acceso: u.last_sign_in_at || null,
      }
    })

    // Ordenar: ultimo acceso mas reciente primero
    usuarios.sort((a, b) => {
      const ta = a.ultimo_acceso ? new Date(a.ultimo_acceso).getTime() : 0
      const tb = b.ultimo_acceso ? new Date(b.ultimo_acceso).getTime() : 0
      return tb - ta
    })

    return NextResponse.json({ success: true, usuarios })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/usuarios
 * Cambia el rol de un usuario.
 * Body: { email: string, role: "admin" | "grandteam" | "usuario", authUserId?: string, nombre?: string }
 * - admin/grandteam => upsert en administradores
 * - usuario => elimina el registro de administradores (vuelve al rol por defecto)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await autorizarAdmin(req)
    if (auth.error) return auth.error
    const supabase = auth.supabase

    const body = await req.json().catch(() => null)
    const email = (body?.email || "").trim().toLowerCase()
    const role = body?.role as Rol
    const authUserId = body?.authUserId as string | undefined
    const nombre = (body?.nombre as string | undefined) || null

    if (!email) {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 })
    }
    if (!ROLES_VALIDOS.includes(role)) {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 })
    }

    // Bajar a "usuario" => eliminar de administradores
    if (role === "usuario") {
      const { error } = await supabase.from("administradores").delete().eq("email", email)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, message: "Usuario degradado a rol usuario" })
    }

    // admin o grandteam => upsert
    const { error } = await supabase
      .from("administradores")
      .upsert(
        {
          email,
          role,
          display_name: nombre,
          login_method: "google",
          auth_user_id: authUserId || null,
        },
        { onConflict: "email" }
      )
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
