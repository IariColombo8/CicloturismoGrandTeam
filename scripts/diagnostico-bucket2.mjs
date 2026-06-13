// Ver que carpetas/archivos hay en el bucket comprobantes (raiz).
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

const { data, error } = await admin.storage.from("comprobantes").list("", { limit: 100 })
console.log("=== Contenido raiz del bucket comprobantes ===")
if (error) console.error(error.message)
else for (const f of data) console.log(`  ${f.id ? "[archivo]" : "[carpeta]"} ${f.name}`)
