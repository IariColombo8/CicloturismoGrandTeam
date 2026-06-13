// Diagnostico de solo lectura: estado de administradores, policies y sponsors
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !serviceKey) {
  console.error("Faltan variables de Supabase en .env.local")
  process.exit(1)
}

const admin = createClient(url, serviceKey)

// 1. Tabla administradores completa
const { data: admins, error: e1 } = await admin
  .from("administradores")
  .select("id, email, role, auth_user_id, display_name, login_method, last_login")

console.log("=== administradores ===")
if (e1) console.error("ERROR:", e1.message)
else console.table(admins)

// 2. Usuarios de auth (para cruzar auth_user_id)
const { data: authData, error: e2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 })
console.log("=== auth.users ===")
if (e2) console.error("ERROR:", e2.message)
else
  console.table(
    authData.users.map((u) => ({
      id: u.id,
      email: u.email,
      ultimo_login: u.last_sign_in_at,
    }))
  )

// 3. Sponsors: cuenta y ultimo error potencial
const { data: sponsors, error: e3 } = await admin.from("sponsors").select("id, nombre, tier, activo")
console.log("=== sponsors (via service role) ===")
if (e3) console.error("ERROR:", e3.message)
else console.log(`Total: ${sponsors.length}`)

// 4. Probar lectura de administradores con clave ANON (simula cliente sin sesion)
const anon = createClient(url, anonKey)
const { data: anonRead, error: e4 } = await anon
  .from("administradores")
  .select("email, role")
console.log("=== administradores leidos con anon key (sin sesion) ===")
if (e4) console.error("ERROR:", e4.message)
else console.log(`Filas visibles sin sesion: ${anonRead.length}`)
