// Diagnostico: probar INSERT en sponsors como admin autenticado (RLS real).
// Crea usuario de prueba + fila en administradores, inserta y borra un sponsor
// de prueba, y limpia todo al final.
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
const TEST_EMAIL = "diagnostico-sponsors-temp@example.com"
const TEST_PASS = "Diag-" + Math.random().toString(36).slice(2) + "A1!"

const { data: created, error: eCreate } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASS,
  email_confirm: true,
})
if (eCreate) {
  console.error("No se pudo crear usuario:", eCreate.message)
  process.exit(1)
}
const uid = created.user.id
console.log("Usuario de prueba:", uid)

let adminRowId = null
let sponsorId = null
try {
  // Agregarlo como admin vinculado
  const { data: row, error: eRow } = await admin
    .from("administradores")
    .insert({ email: TEST_EMAIL, role: "admin", auth_user_id: uid, login_method: "email" })
    .select("id")
    .single()
  if (eRow) throw new Error("No se pudo insertar admin de prueba: " + eRow.message)
  adminRowId = row.id

  // Login como ese usuario
  const client = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error: eLogin } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  })
  if (eLogin) throw new Error("Login fallo: " + eLogin.message)

  // INSERT sponsor de prueba via RLS
  const { data: sp, error: eIns } = await client
    .from("sponsors")
    .insert({ nombre: "DIAGNOSTICO-TEMP", tier: "bronce", activo: false, orden: 999 })
    .select("id")
    .single()
  console.log("=== INSERT sponsors como admin autenticado ===")
  if (eIns) {
    console.error("ERROR:", eIns.message, "| code:", eIns.code)
  } else {
    sponsorId = sp.id
    console.log("OK, sponsor insertado:", sponsorId)
    // UPDATE de prueba
    const { error: eUpd } = await client
      .from("sponsors")
      .update({ descripcion: "test" })
      .eq("id", sponsorId)
    console.log("UPDATE:", eUpd ? "ERROR: " + eUpd.message : "OK")
    // DELETE de prueba
    const { error: eDel } = await client.from("sponsors").delete().eq("id", sponsorId)
    console.log("DELETE:", eDel ? "ERROR: " + eDel.message : "OK")
    if (!eDel) sponsorId = null
  }
} catch (err) {
  console.error("FALLO:", err.message)
} finally {
  if (sponsorId) await admin.from("sponsors").delete().eq("id", sponsorId)
  if (adminRowId) await admin.from("administradores").delete().eq("id", adminRowId)
  await admin.auth.admin.deleteUser(uid)
  console.log("Limpieza completa")
}
