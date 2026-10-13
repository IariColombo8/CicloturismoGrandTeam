// lib/api/autorizar.ts
// Autorizacion por rol para API routes: lee el access_token del header
// Authorization, valida la sesion contra Supabase Auth y busca el rol en la
// tabla administradores. Uso exclusivo en servidor.

import { NextResponse, type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

export type Rol = "admin" | "grandteam" | "remera" | "usuario"

const ROLES_VALIDOS: Rol[] = ["admin", "grandteam", "remera", "usuario"]

/** Normaliza roles guardados con otra grafia ("Admin", "grand_team"). */
export function normalizarRol(rol: string | null | undefined): Rol {
  const limpio = (rol || "").trim().toLowerCase().replace(/[\s_-]/g, "")
  return ROLES_VALIDOS.find((r) => r === limpio) ?? "usuario"
}

export interface SesionAutorizada {
  supabase: SupabaseClient
  email: string
  rol: Rol
}

export type ResultadoAutorizacion =
  | { ok: SesionAutorizada; error?: never }
  | { error: NextResponse; ok?: never }

/**
 * Valida que el request venga de un usuario autenticado con uno de los roles
 * permitidos. Devuelve la respuesta de error ya armada si no corresponde.
 */
export async function autorizar(
  req: NextRequest,
  rolesPermitidos: Rol[]
): Promise<ResultadoAutorizacion> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (!token) {
    return {
      error: NextResponse.json({ error: "No autenticado. Volve a iniciar sesion." }, { status: 401 }),
    }
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
    return {
      error: NextResponse.json(
        { error: "Sesion invalida o vencida. Volve a iniciar sesion." },
        { status: 401 }
      ),
    }
  }

  const email = userData.user.email.toLowerCase()

  const { data: adminRow, error: adminError } = await supabase
    .from("administradores")
    .select("role")
    .ilike("email", email)
    .maybeSingle()

  if (adminError) {
    return {
      error: NextResponse.json(
        { error: `Error al verificar el rol: ${adminError.message}` },
        { status: 500 }
      ),
    }
  }

  const rol = normalizarRol((adminRow as { role: string } | null)?.role)

  if (!rolesPermitidos.includes(rol)) {
    return {
      error: NextResponse.json(
        { error: `Acceso denegado: ${email} no tiene permisos para esta seccion.` },
        { status: 403 }
      ),
    }
  }

  return { ok: { supabase, email, rol } }
}
