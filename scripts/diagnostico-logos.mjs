// Diagnostico: lista los sponsors y verifica si sus logo_url cargan.
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

const { data, error } = await admin
  .from("sponsors")
  .select("id, nombre, tier, activo, logo_url, orden")
  .order("tier", { ascending: true })
  .order("orden", { ascending: true })

if (error) {
  console.error("Error leyendo sponsors:", error.message)
  process.exit(1)
}

console.log(`\n=== ${data.length} sponsors en la base de datos ===\n`)

for (const s of data) {
  console.log(`[${s.tier}] ${s.nombre}  (activo: ${s.activo})`)
  console.log(`   logo_url: ${s.logo_url || "(VACIO)"}`)

  if (s.logo_url) {
    const isDrive = s.logo_url.includes("drive.google.com")
    const isSupabase = s.logo_url.includes(".supabase.co/storage")
    console.log(`   tipo: ${isDrive ? "GOOGLE DRIVE" : isSupabase ? "SUPABASE STORAGE" : "OTRO/LOCAL"}`)

    try {
      const res = await fetch(s.logo_url, { method: "GET" })
      const ct = res.headers.get("content-type") || ""
      const ok = res.ok && ct.startsWith("image/")
      console.log(`   fetch: HTTP ${res.status} | content-type: ${ct} | ${ok ? "✓ ES IMAGEN" : "✗ NO CARGA COMO IMAGEN"}`)
    } catch (e) {
      console.log(`   fetch: ERROR -> ${e.message}`)
    }
  }
  console.log("")
}
