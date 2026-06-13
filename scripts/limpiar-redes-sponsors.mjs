// Limpia whatsapp (formato 549...) e instagram (sin espacios) en la DB.
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

function normWa(n) {
  if (!n) return n
  let d = n.replace(/[^0-9]/g, "")
  if (!d) return n
  if (d.startsWith("00")) d = d.slice(2)
  if (d.startsWith("549")) return d
  if (d.startsWith("54")) return "549" + d.slice(2)
  return "549" + d
}
function normIg(ig) {
  if (!ig) return ig
  const v = ig.trim()
  if (!v) return null
  if (v.startsWith("http")) return v.replace(/\s+/g, "")
  const u = v.replace(/^@/, "").trim()
  return u ? `https://www.instagram.com/${u}/` : null
}

const { data, error } = await admin
  .from("sponsors")
  .select("id, nombre, whatsapp, instagram")
if (error) { console.error(error.message); process.exit(1) }

for (const s of data) {
  const newWa = normWa(s.whatsapp)
  const newIg = normIg(s.instagram)
  const changes = {}
  if (newWa !== s.whatsapp) changes.whatsapp = newWa
  if (newIg !== s.instagram) changes.instagram = newIg
  if (Object.keys(changes).length === 0) {
    console.log(`  ${s.nombre}: sin cambios`)
    continue
  }
  const { error: eUpd } = await admin.from("sponsors").update(changes).eq("id", s.id)
  console.log(`  ${s.nombre}: ${eUpd ? "ERROR " + eUpd.message : "actualizado " + JSON.stringify(changes)}`)
}
console.log("\nListo.")
