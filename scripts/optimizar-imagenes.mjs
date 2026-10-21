/**
 * Achica las imagenes de public/ sin cambiarles el nombre.
 *
 * Por que: PageSpeed medía 19 MB de descarga en la home. La mayor parte eran
 * tres PNG de la remera de 1,4 MB cada uno (4096 px de ancho para mostrarse en
 * una tarjeta de 400) y logos de sponsors de hasta 2 MB. En un celular con 4G
 * lento eso dejaba el LCP en 37 segundos.
 *
 * Que hace: reescribe cada archivo en su lugar, con el MISMO nombre y el mismo
 * formato. Nadie tiene que cambiar una ruta: ni el codigo, ni las URLs que el
 * panel guardo en content_settings, ni los links que ya circulan por WhatsApp.
 *
 *   node scripts/optimizar-imagenes.mjs            # optimiza
 *   node scripts/optimizar-imagenes.mjs --listar   # solo informa, no escribe
 *
 * Es idempotente: volver a correrlo sobre un archivo ya optimizado no lo
 * degrada (si la version nueva no ahorra al menos un 5%, se descarta).
 *
 * NO se tocan (son fuentes de diseño, de ellas salen otras piezas):
 *   - remera-og.png y METADATOS.png -> scripts/generar-og.mjs
 *   - favicon-*.png, apple-touch-*.png, app/* -> scripts/generar-iconos-app.mjs
 *   - logo.png -> fuente de los iconos de la app, se reduce a 1024 px y no mas.
 */

import sharp from "sharp"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

// Se lee el archivo entero a memoria y se le pasa el buffer a sharp: en Windows,
// sharp deja el archivo abierto mientras procesa y reescribirlo en su lugar
// falla con "UNKNOWN: unknown error, open".
sharp.cache(false)

const PUBLIC = path.join(process.cwd(), "public")
const SOLO_LISTAR = process.argv.includes("--listar")

// Ancho maximo por carpeta/archivo. Mas grande que esto no se ve en ninguna
// pantalla: la remera se muestra en una tarjeta de 400 px y los logos de
// sponsors en una de 160.
const ANCHO_MAXIMO = [
  { patron: /^logo\.png$/, ancho: 1024 },
  { patron: /^sponsor[\\/]/, ancho: 600 },
  { patron: /^(remera|remerab|remeran)\.png$/, ancho: 1200 },
  { patron: /^fotos equipo[\\/]/, ancho: 1600 },
  { patron: /./, ancho: 1600 },
]

// Fuentes de diseño y piezas generadas por otros scripts.
const NO_TOCAR = [
  /^remera-og\.png$/,
  /^METADATOS\.png$/,
  /^favicon/i,
  /^apple-touch/i,
  /^icon\.svg$/,
  /^og[\\/]/,
  /^app[\\/]/,
  /^email[\\/]/,
  /^placeholder/,
]

const MINIMO_KB = 60 // por debajo de esto no vale la pena

function anchoMaximo(relativo) {
  return ANCHO_MAXIMO.find((r) => r.patron.test(relativo)).ancho
}

async function listarImagenes(dir, relativo = "") {
  const salida = []
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const rel = path.join(relativo, entrada.name)
    if (entrada.isDirectory()) {
      salida.push(...(await listarImagenes(path.join(dir, entrada.name), rel)))
    } else if (/\.(png|jpe?g)$/i.test(entrada.name)) {
      salida.push(rel)
    }
  }
  return salida
}

async function optimizar(relativo) {
  const absoluto = path.join(PUBLIC, relativo)
  if (NO_TOCAR.some((p) => p.test(relativo))) return null

  const entrada = await readFile(absoluto)
  const antes = entrada.length
  if (antes < MINIMO_KB * 1024) return null

  const meta = await sharp(entrada, { failOn: "none" }).metadata()
  const limite = anchoMaximo(relativo)
  const redimensionar = meta.width > limite

  let pipeline = sharp(entrada, { failOn: "none" })
  if (redimensionar) {
    pipeline = pipeline.resize({ width: limite, withoutEnlargement: true })
  }

  // Se mantiene el formato: cambiar la extension obligaria a cambiar rutas
  // guardadas en la base y links ya compartidos. El PNG con transparencia va a
  // paleta (es lo que hace pngquant) porque son logos y dibujos planos; una
  // foto en PNG se pasa a PNG comprimido sin paleta para no ensuciarla.
  if (meta.format === "png") {
    pipeline = pipeline.png({
      compressionLevel: 9,
      effort: 10,
      palette: true,
      quality: 82,
      dither: 0.6,
    })
  } else {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true, progressive: true })
  }

  const buffer = await pipeline.toBuffer()
  const ahorro = 1 - buffer.length / antes

  if (ahorro < 0.05) return null
  if (!SOLO_LISTAR) await writeFile(absoluto, buffer)

  return {
    relativo,
    antes,
    despues: buffer.length,
    ancho: redimensionar ? `${meta.width} -> ${limite}` : `${meta.width}`,
  }
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`

const imagenes = await listarImagenes(PUBLIC)
let totalAntes = 0
let totalDespues = 0

for (const relativo of imagenes.sort()) {
  const r = await optimizar(relativo)
  if (!r) continue
  totalAntes += r.antes
  totalDespues += r.despues
  console.log(
    `${r.relativo.padEnd(46)} ${kb(r.antes).padStart(8)} -> ${kb(r.despues).padStart(8)}  (${r.ancho} px)`,
  )
}

console.log("")
console.log(
  SOLO_LISTAR
    ? `Se ahorrarian ${kb(totalAntes - totalDespues)} (de ${kb(totalAntes)} a ${kb(totalDespues)}).`
    : `Listo: ${kb(totalAntes)} -> ${kb(totalDespues)} (${kb(totalAntes - totalDespues)} menos).`,
)
