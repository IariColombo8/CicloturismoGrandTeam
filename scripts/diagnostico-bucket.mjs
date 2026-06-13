// Diagnostico: estado del bucket comprobantes y por que falla la URL publica.
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

// 1. Listar buckets y su estado public
const { data: buckets, error: eB } = await admin.storage.listBuckets()
console.log("=== BUCKETS ===")
if (eB) {
  console.error("Error:", eB.message)
} else {
  for (const b of buckets) {
    console.log(`  ${b.name}  | public: ${b.public}  | id: ${b.id}`)
  }
}

// 2. Listar archivos en comprobantes/sponsors
console.log("\n=== ARCHIVOS en comprobantes/sponsors ===")
const { data: files, error: eF } = await admin.storage
  .from("comprobantes")
  .list("sponsors", { limit: 100 })
if (eF) {
  console.error("Error listando:", eF.message)
} else if (!files || files.length === 0) {
  console.log("  (vacio - no hay archivos)")
} else {
  for (const f of files) {
    console.log(`  ${f.name}  (${f.metadata?.size ?? "?"} bytes)`)
  }
}

// 3. Ver el cuerpo del error 400 de la URL publica
const testUrl =
  "https://pbgzygskufxclyzbexnn.supabase.co/storage/v1/object/public/comprobantes/sponsors/panader-a-san-carlos-1781313000888.jpeg"
console.log("\n=== RESPUESTA de la URL publica que falla ===")
try {
  const res = await fetch(testUrl)
  console.log("  HTTP", res.status)
  const text = await res.text()
  console.log("  body:", text.slice(0, 300))
} catch (e) {
  console.log("  ERROR:", e.message)
}
