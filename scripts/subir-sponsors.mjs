// ============================================
// Subir sponsors a Supabase desde scripts/sponsors-data.json
// ============================================
// Lee el JSON generado desde el Excel (sponsor/sponsor.xlsx) y carga cada
// sponsor en la tabla `sponsors`. Es IDEMPOTENTE: si un sponsor con el mismo
// nombre ya existe, lo ACTUALIZA en lugar de duplicarlo.
//
// NO sube logos: el campo logo_url se deja vacio para cargarlo luego a mano
// desde el panel admin (/admin/sponsors).
//
// Uso:
//   node scripts/subir-sponsors.mjs            (carga real)
//   node scripts/subir-sponsors.mjs --dry-run  (solo muestra que haria)
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (solo se usa en este script de servidor)
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const DRY_RUN = process.argv.includes("--dry-run")

// --- Cargar variables de entorno desde .env.local ---
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
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- Mapear una fila del JSON al registro de la tabla sponsors ---
function mapSponsor(item) {
  // WhatsApp local (area + numero, ej 3442543387) -> formato internacional 549...
  let whatsapp = null
  if (item.whatsapp_local) {
    const digits = item.whatsapp_local.replace(/\D/g, "")
    whatsapp = digits.length >= 10 ? `549${digits}` : digits
  }

  // Instagram: guardar URL completa a partir del handle
  const instagram = item.instagram_handle
    ? `https://instagram.com/${item.instagram_handle}`
    : null

  // Descripcion a partir de lo que ofrece + nota opcional
  const partes = []
  if (item.ofrece) partes.push(item.ofrece)
  if (item.nota) partes.push(item.nota)
  const descripcion = partes.length ? partes.join(" - ") : null

  return {
    nombre: item.nombre,
    nombre_comercial: item.nombre,
    tier: item.tier,
    descripcion,
    categoria: item.ofrece || null,
    servicios: item.ofrece ? [item.ofrece] : null,
    instagram,
    whatsapp,
    telefono: item.whatsapp_local || null,
    logo_url: null, // se sube manualmente despues
    activo: true,
    orden: item.orden,
  }
}

async function main() {
  const data = JSON.parse(readFileSync("scripts/sponsors-data.json", "utf8"))
  console.log(`Sponsors a procesar: ${data.length}${DRY_RUN ? " (DRY-RUN)" : ""}\n`)

  let creados = 0
  let actualizados = 0
  let errores = 0

  for (const item of data) {
    const registro = mapSponsor(item)

    // Buscar existente por nombre (case-insensitive)
    const { data: existentes, error: eBuscar } = await supabase
      .from("sponsors")
      .select("id")
      .ilike("nombre", registro.nombre)
      .limit(1)

    if (eBuscar) {
      console.error(`  ERROR buscando "${registro.nombre}": ${eBuscar.message}`)
      errores++
      continue
    }

    const existe = existentes && existentes.length > 0

    if (DRY_RUN) {
      console.log(`  [${existe ? "ACTUALIZARIA" : "CREARIA"}] ${registro.nombre} (${registro.tier})`)
      continue
    }

    if (existe) {
      const { error: eUpd } = await supabase
        .from("sponsors")
        .update(registro)
        .eq("id", existentes[0].id)
      if (eUpd) {
        console.error(`  ERROR actualizando "${registro.nombre}": ${eUpd.message}`)
        errores++
      } else {
        console.log(`  ✓ Actualizado: ${registro.nombre}`)
        actualizados++
      }
    } else {
      const { error: eIns } = await supabase.from("sponsors").insert(registro)
      if (eIns) {
        console.error(`  ERROR creando "${registro.nombre}": ${eIns.message}`)
        errores++
      } else {
        console.log(`  ✓ Creado: ${registro.nombre}`)
        creados++
      }
    }
  }

  console.log("\n=== Resumen ===")
  console.log(`  Creados:      ${creados}`)
  console.log(`  Actualizados: ${actualizados}`)
  console.log(`  Errores:      ${errores}`)
  if (!DRY_RUN) {
    console.log("\nRecorda subir el logo de cada sponsor desde /admin/sponsors")
  }
}

main().catch((err) => {
  console.error("FALLO:", err.message)
  process.exit(1)
})
