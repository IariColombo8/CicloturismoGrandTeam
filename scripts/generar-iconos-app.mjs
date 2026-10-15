/**
 * Iconos de la app instalada (PWA), a partir de public/logo.png.
 *
 * Por que existe: los iconos del manifest salian de los favicon, que tienen
 * las letras NEGRAS sobre fondo transparente. Como la pantalla de arranque de
 * la app es negra, el nombre del evento desaparecia: se veia el dibujo y nada
 * mas. El logo grande (public/logo.png) tiene las letras blancas, asi que es
 * el que sirve.
 *
 * Genera dos familias:
 *
 * - `icono-<n>.png`: el logo tal cual, con fondo transparente. Es el que se usa
 *   en la pantalla de arranque, sobre el negro del tema.
 * - `icono-maskable-<n>.png`: con fondo negro y el logo al 72%, porque Android
 *   recorta los iconos "maskable" en circulo o en otras formas y, sin ese
 *   margen, le come las letras de los bordes.
 *
 *   node scripts/generar-iconos-app.mjs
 */

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"

const ORIGEN = join(process.cwd(), "public", "logo.png")
const DESTINO = join(process.cwd(), "public", "app")
const TAMANOS = [192, 256, 384, 512]
const FONDO = { r: 0, g: 0, b: 0, alpha: 1 }

await mkdir(DESTINO, { recursive: true })

for (const tamano of TAMANOS) {
  // Transparente: para la pantalla de arranque y la lista de apps.
  await sharp(ORIGEN)
    .resize(tamano, tamano, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(DESTINO, `icono-${tamano}.png`))

  // Maskable: fondo negro y el logo con margen, para que el recorte de Android
  // no se coma las letras.
  const interior = Math.round(tamano * 0.72)
  const margen = Math.round((tamano - interior) / 2)
  const logo = await sharp(ORIGEN)
    .resize(interior, interior, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({ create: { width: tamano, height: tamano, channels: 4, background: FONDO } })
    .composite([{ input: logo, top: margen, left: margen }])
    .png({ compressionLevel: 9 })
    .toFile(join(DESTINO, `icono-maskable-${tamano}.png`))
}

// Icono de iOS: siempre con fondo (iOS no respeta la transparencia y la pinta
// de negro o blanco segun el sistema, que es justo lo que no queremos).
const interiorApple = Math.round(180 * 0.82)
const margenApple = Math.round((180 - interiorApple) / 2)
const logoApple = await sharp(ORIGEN)
  .resize(interiorApple, interiorApple, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer()

await sharp({ create: { width: 180, height: 180, channels: 4, background: FONDO } })
  .composite([{ input: logoApple, top: margenApple, left: margenApple }])
  .png({ compressionLevel: 9 })
  .toFile(join(DESTINO, "apple-touch-icon.png"))

console.log(`Listo: ${TAMANOS.length * 2 + 1} iconos en public/app/`)
