// Diagnostico: probar lectura de administradores y escritura de sponsors
// con un usuario autenticado de prueba (se crea y elimina al final).
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
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY)
const TEST_EMAIL = "diagnostico-rls-temp@example.com"
const TEST_PASS = "Diag-" + Math.random().toString(36).slice(2) + "A1!"

// Crear usuario de prueba
const { data: created, error: eCreate } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASS,
  email_confirm: true,
})
if (eCreate) {
  console.error("No se pudo crear usuario de prueba:", eCreate.message)
  process.exit(1)
}
console.log("Usuario de prueba creado:", created.user.id)

try {
  // Iniciar sesion como usuario autenticado comun
  const client = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error: eLogin } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  })
  if (eLogin) throw new Error("Login fallo: " + eLogin.message)

  // 1. Leer administradores como autenticado
  const { data: admins, error: e1 } = await client
    .from("administradores")
    .select("email, role")
  console.log("=== SELECT administradores como autenticado ===")
  if (e1) console.error("ERROR:", e1.message)
  else console.log(`Filas visibles: ${admins.length}`, admins)

  // 2. Leer sponsors como autenticado
  const { data: sp, error: e2 } = await client.from("sponsors").select("id").limit(1)
  console.log("=== SELECT sponsors como autenticado ===")
  if (e2) console.error("ERROR:", e2.message)
  else console.log(`OK, filas: ${sp.length}`)
} finally {
  // Eliminar usuario de prueba
  const { error: eDel } = await admin.auth.admin.deleteUser(created.user.id)
  console.log(eDel ? "ERROR eliminando usuario de prueba: " + eDel.message : "Usuario de prueba eliminado")
}
