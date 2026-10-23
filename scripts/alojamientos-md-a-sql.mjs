// Lee alojamientos-concepcion-del-uruguay.md (el listado de la Direccion de
// Turismo, septiembre 2026) y escribe la migracion que agrega las columnas de
// categoria y carga los 67 alojamientos.
//
//   node scripts/alojamientos-md-a-sql.mjs
//
// Es idempotente: cada INSERT salta el alojamiento si ya hay uno con el mismo
// nombre en la misma categoria, asi que correr la migracion dos veces no
// duplica nada (y no pisa lo que se haya corregido desde el panel).

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const RAIZ = process.cwd()
const ORIGEN = join(RAIZ, "alojamientos-concepcion-del-uruguay.md")
const DESTINO = join(RAIZ, "supabase", "migrations", "20261023_alojamientos_categorias.sql")

// "## 1. Hotel Boutique – Hotel (10)" -> categoria. Mismo orden que
// CATEGORIAS_ALOJAMIENTO en lib/alojamientos.ts.
const SECCIONES = [
  [/hotel boutique/i, "hotel"],
  [/apart hotel/i, "apart"],
  [/hoster/i, "hosteria"],
  [/complejos/i, "complejo"],
  [/bungalows/i, "bungalow"],
  [/caba/i, "cabana"],
  [/casa de campo/i, "campo"],
  [/casas de alquiler/i, "casa"],
  [/departamentos de alquiler/i, "departamento"],
]

// Abreviaturas de la fuente -> texto legible. CAT y DAT no se guardan: ya lo
// dice la categoria.
function clasificacionDe(texto) {
  const t = texto.replace(/★/g, "").trim()
  if (!t || /^(CAT|DAT)$/i.test(t)) return null
  if (/^htl boutique$/i.test(t)) return "Hotel boutique"
  if (/^htl$/i.test(t)) return "Hotel"
  if (/^aph$/i.test(t)) return "Apart hotel"
  return t
}

// Que dicen las observaciones sobre mascotas. null = no lo informa.
function mascotasDe(obs) {
  const t = obs.toLowerCase()
  if (/\bno (se )?aceptan? mascotas/.test(t)) return "no"
  if (!/mascotas/.test(t)) return null
  if (/mascotas peque/.test(t)) return "pequenas"
  if (/mascotas medianas/.test(t)) return "medianas"
  return "si"
}

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "el", "y", "en"])

// "POSTA DEL TORREÓN" -> "Posta del Torreón". Siglas sin vocales ("VH") y
// numeros romanos sueltos ("I") quedan como estan.
function tituloDe(nombre) {
  return nombre
    .toLowerCase()
    .split(/(\s+)/)
    .map((palabra, i) => {
      if (/^\s+$/.test(palabra)) return palabra
      const original = nombre.split(/(\s+)/)[i]
      if (original.length > 1 && /^[^aeiouáéíóú]+$/i.test(original) && /[a-z]/i.test(original)) return original
      if (i > 0 && MINUSCULAS.has(palabra)) return palabra
      return palabra.charAt(0).toUpperCase() + palabra.slice(1)
    })
    .join("")
}

// Saca las aclaraciones de la fuente: "(tal cual figura...)", "(sin numero...)".
function limpiarTelefono(texto) {
  const limpio = texto.replace(/\((?=[^)]*[a-záéíóú])[^)]*\)/gi, "").replace(/\s+/g, " ").trim()
  return /\d{5,}|\d+\s+\d+/.test(limpio.replace(/^\(\d+\)/, "")) ? limpio : null
}

const sql = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)

const lineas = readFileSync(ORIGEN, "utf8").split(/\r?\n/)
const filas = []
let categoria = null

for (const linea of lineas) {
  const titulo = linea.match(/^##\s+\d+\.\s+(.*)$/)
  if (titulo) {
    categoria = SECCIONES.find(([re]) => re.test(titulo[1]))?.[1] ?? null
    continue
  }
  if (!categoria || !linea.startsWith("|")) continue
  const celdas = linea.split("|").slice(1, -1).map((c) => c.trim())
  if (celdas.length !== 5 || celdas[0] === "Nombre" || /^-+$/.test(celdas[0])) continue

  const [nombre, ubicacion, contacto, cat, obs] = celdas
  const observaciones = obs === "—" ? "" : obs
  const estrellas = (cat.match(/★/g) || []).length || null

  filas.push({
    categoria,
    nombre: tituloDe(nombre),
    direccion: ubicacion,
    telefono: limpiarTelefono(contacto),
    estrellas,
    clasificacion: clasificacionDe(cat),
    mascotas: mascotasDe(observaciones),
    descripcion: observaciones || null,
  })
}

if (filas.length !== 67) {
  console.error(`Se esperaban 67 alojamientos y se leyeron ${filas.length}. Revisar el .md.`)
  process.exit(1)
}

// Arrancan en 100 para quedar siempre despues de los destacados (orden 1, 2...).
const valores = filas
  .map((f, i) =>
    `  (${[f.categoria, f.nombre, f.direccion, f.telefono, f.estrellas, f.clasificacion, f.mascotas, f.descripcion]
      .map(sql)
      .join(", ")}, ${100 + i})`,
  )
  .join(",\n")

const salida = `-- Alojamientos de Concepcion del Uruguay por categoria.
-- GENERADO por scripts/alojamientos-md-a-sql.mjs desde
-- alojamientos-concepcion-del-uruguay.md: no editar a mano, cambiar el .md y
-- volver a correr el script.
--
-- Fuente: Servicios Turisticos de Alojamientos, septiembre 2026. Direccion de
-- Turismo de Concepcion del Uruguay. ${filas.length} alojamientos en 9 categorias.
--
-- categoria NULL = destacado bike friendly (los que ya estaban: El Viejo
-- Molino y Cabañas Dulce Amanecer), que siguen arriba como tarjetas grandes.

ALTER TABLE public.alojamientos
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS estrellas SMALLINT,
  ADD COLUMN IF NOT EXISTS clasificacion TEXT,
  ADD COLUMN IF NOT EXISTS mascotas TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alojamientos_categoria_check') THEN
    ALTER TABLE public.alojamientos ADD CONSTRAINT alojamientos_categoria_check CHECK (
      categoria IS NULL OR categoria IN ('hotel','apart','hosteria','complejo','bungalow','cabana','campo','casa','departamento')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alojamientos_estrellas_check') THEN
    ALTER TABLE public.alojamientos ADD CONSTRAINT alojamientos_estrellas_check CHECK (
      estrellas IS NULL OR estrellas BETWEEN 1 AND 5
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alojamientos_mascotas_check') THEN
    ALTER TABLE public.alojamientos ADD CONSTRAINT alojamientos_mascotas_check CHECK (
      mascotas IS NULL OR mascotas IN ('si','pequenas','medianas','no')
    );
  END IF;
END $$;

INSERT INTO public.alojamientos
  (categoria, nombre, direccion, telefono, estrellas, clasificacion, mascotas, descripcion, orden, activo, imagenes)
SELECT v.categoria, v.nombre, v.direccion, v.telefono, v.estrellas::smallint, v.clasificacion, v.mascotas,
       v.descripcion, v.orden, true, '{}'::text[]
FROM (VALUES
${valores}
) AS v (categoria, nombre, direccion, telefono, estrellas, clasificacion, mascotas, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.alojamientos a
  WHERE a.categoria = v.categoria AND lower(a.nombre) = lower(v.nombre)
);
`

writeFileSync(DESTINO, salida)
const porCategoria = filas.reduce((acc, f) => ({ ...acc, [f.categoria]: (acc[f.categoria] || 0) + 1 }), {})
console.log(`${filas.length} alojamientos -> ${DESTINO}`)
console.log(porCategoria)
