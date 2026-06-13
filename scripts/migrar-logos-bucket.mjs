// Migracion: crea bucket publico "sponsors", mueve los logos desde
// comprobantes/sponsors, y actualiza las logo_url en la tabla sponsors.
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
const NEW_BUCKET = "sponsors"

// 1. Crear bucket publico si no existe
console.log("=== 1. Crear/verificar bucket publico 'sponsors' ===")
const { data: buckets } = await admin.storage.listBuckets()
const exists = buckets?.some((b) => b.name === NEW_BUCKET)
if (exists) {
  console.log("  Ya existe. Asegurando que sea publico...")
  const { error } = await admin.storage.updateBucket(NEW_BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png"],
  })
  console.log("  " + (error ? "ERROR: " + error.message : "OK, marcado publico"))
} else {
  const { error } = await admin.storage.createBucket(NEW_BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png"],
  })
  console.log("  " + (error ? "ERROR: " + error.message : "OK, bucket creado publico"))
}

// 2. Listar logos en comprobantes/sponsors y moverlos
console.log("\n=== 2. Mover logos de comprobantes/sponsors -> sponsors/ ===")
const { data: files, error: eList } = await admin.storage
  .from("comprobantes")
  .list("sponsors", { limit: 100 })

if (eList) {
  console.error("  Error listando:", eList.message)
  process.exit(1)
}

const urlMap = {} // viejo public url -> nuevo public url
for (const f of files || []) {
  const oldPath = `sponsors/${f.name}`
  const newPath = f.name

  // Descargar del bucket viejo
  const { data: blob, error: eDown } = await admin.storage.from("comprobantes").download(oldPath)
  if (eDown) {
    console.log(`  ${f.name}: ERROR descarga -> ${eDown.message}`)
    continue
  }
  const buffer = Buffer.from(await blob.arrayBuffer())
  const ext = f.name.split(".").pop()?.toLowerCase()
  const contentType = ext === "png" ? "image/png" : "image/jpeg"

  // Subir al bucket nuevo
  const { error: eUp } = await admin.storage.from(NEW_BUCKET).upload(newPath, buffer, {
    contentType,
    upsert: true,
  })
  if (eUp) {
    console.log(`  ${f.name}: ERROR subida -> ${eUp.message}`)
    continue
  }

  const oldUrl = admin.storage.from("comprobantes").getPublicUrl(oldPath).data.publicUrl
  const newUrl = admin.storage.from(NEW_BUCKET).getPublicUrl(newPath).data.publicUrl
  urlMap[oldUrl] = newUrl
  console.log(`  ${f.name}: OK movido`)
}

// 3. Actualizar logo_url en la tabla sponsors
console.log("\n=== 3. Actualizar logo_url en la base de datos ===")
const { data: sponsors } = await admin
  .from("sponsors")
  .select("id, nombre, logo_url")
  .like("logo_url", "%comprobantes/sponsors/%")

for (const s of sponsors || []) {
  const newUrl = urlMap[s.logo_url]
  if (newUrl) {
    const { error } = await admin.from("sponsors").update({ logo_url: newUrl }).eq("id", s.id)
    console.log(`  ${s.nombre}: ${error ? "ERROR " + error.message : "OK -> " + newUrl}`)
  } else {
    console.log(`  ${s.nombre}: no se encontro mapeo para ${s.logo_url}`)
  }
}

// 4. Verificar que la nueva URL carga
console.log("\n=== 4. Verificacion ===")
const sampleNew = Object.values(urlMap)[0]
if (sampleNew) {
  const res = await fetch(sampleNew)
  const ct = res.headers.get("content-type") || ""
  console.log(`  ${sampleNew}`)
  console.log(`  HTTP ${res.status} | ${ct} | ${res.ok && ct.startsWith("image/") ? "✓ CARGA OK" : "✗ falla"}`)
}

console.log("\nMigracion completa.")
