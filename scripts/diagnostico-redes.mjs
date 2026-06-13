// Diagnostico: ver whatsapp/instagram/facebook reales de los sponsors.
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await admin
  .from("sponsors")
  .select("nombre, tier, activo, whatsapp, instagram, facebook, telefono")
  .order("tier")

if (error) { console.error(error.message); process.exit(1) }

for (const s of data) {
  console.log(`[${s.tier}] ${s.nombre} (activo:${s.activo})`)
  console.log(`   whatsapp:  ${JSON.stringify(s.whatsapp)}`)
  console.log(`   instagram: ${JSON.stringify(s.instagram)}`)
  console.log(`   facebook:  ${JSON.stringify(s.facebook)}`)
  console.log(`   telefono:  ${JSON.stringify(s.telefono)}`)
  console.log("")
}
