/**
 * Imagenes de vista previa: las que se ven al compartir un link por WhatsApp,
 * Instagram o Facebook. Una por pagina.
 *
 * Antes todas usaban METADATOS.png, la del evento: el link de "Mi QR" se veia
 * igual que el de la inscripcion y no se entendia para que era cada uno. Ahora
 * cada pagina muestra lo suyo, con el mismo lenguaje visual (negro, dorado y
 * el logo), y la de la remera muestra la remera.
 *
 * La home sigue con METADATOS.png, que es la pieza de diseño del evento.
 *
 *   node scripts/generar-og.mjs
 */

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"

const ANCHO = 1200
const ALTO = 630
const DORADO = "#ffd700"
const PUBLIC = join(process.cwd(), "public")
const DESTINO = join(PUBLIC, "og")

const PAGINAS = [
  {
    archivo: "mi-qr.png",
    titulo: "MI QR",
    bajada: "Consultá el estado de tu inscripción",
    detalle: "y descargá tu código para la acreditación",
    imagen: "logo.png",
  },
  {
    archivo: "inscripcion.png",
    titulo: "INSCRIBIRME",
    bajada: "50 km por las Ruinas del Viejo Molino",
    detalle: "8 de noviembre de 2026 · Concepción del Uruguay",
    imagen: "logo.png",
  },
  {
    archivo: "remera.png",
    titulo: "LA REMERA",
    bajada: "Hacé tu pedido de la remera del evento",
    // Lo que mas preguntan, dicho antes de que pregunten.
    detalle: "Solo con envío a domicilio y después del evento",
    imagen: "remera.png",
    // Solo el frente de la remera: la imagen trae frente y espalda.
    recorte: { left: 170, top: 60, width: 600, height: 980 },
    ancho: 400,
  },
  {
    archivo: "contacto.png",
    titulo: "CONTACTO",
    bajada: "¿Tenés dudas sobre el cicloturismo?",
    detalle: "Escribinos y te respondemos",
    imagen: "logo.png",
  },
  {
    archivo: "grand-team.png",
    titulo: "GRAND TEAM BIKE",
    bajada: "El grupo que organiza el cicloturismo",
    detalle: "Concepción del Uruguay, Entre Ríos",
    imagen: "logo.png",
  },
]

/** Escapa lo que va dentro del SVG. */
const limpiar = (texto) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Parte el texto si no entra a lo ancho (aprox, por cantidad de caracteres). */
function cortar(texto, maximo) {
  if (texto.length <= maximo) return [texto]
  const palabras = texto.split(" ")
  const lineas = [""]
  for (const palabra of palabras) {
    const actual = lineas[lineas.length - 1]
    if ((actual + " " + palabra).trim().length <= maximo) {
      lineas[lineas.length - 1] = (actual + " " + palabra).trim()
    } else {
      lineas.push(palabra)
    }
  }
  return lineas
}

function armarFondo({ titulo, bajada, detalle }) {
  // El texto arranca despues de la imagen de la izquierda.
  const x = 520
  // Los titulos largos ("GRAND TEAM BIKE") necesitan letra mas chica.
  const tamanoTitulo = titulo.length > 12 ? 68 : 96
  const lineasBajada = cortar(bajada, 34)
  const lineasDetalle = cortar(detalle, 42)

  // El bloque arranca arriba para que, con dos líneas de bajada, el detalle no
  // termine pegado al pie.
  const bajadaSvg = lineasBajada
    .map(
      (linea, i) =>
        `<text x="${x}" y="${330 + i * 52}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#ffffff">${limpiar(linea)}</text>`,
    )
    .join("\n")

  const yDetalle = 330 + lineasBajada.length * 52 + 10
  const detalleSvg = lineasDetalle
    .map(
      (linea, i) =>
        `<text x="${x}" y="${yDetalle + i * 40}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="30" fill="#d4d4d8">${limpiar(linea)}</text>`,
    )
    .join("\n")

  return Buffer.from(`
    <svg width="${ANCHO}" height="${ALTO}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="brillo" cx="25%" cy="35%" r="75%">
          <stop offset="0%" stop-color="#3a2f00" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#000000" stop-opacity="1" />
        </radialGradient>
        <linearGradient id="linea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${DORADO}" stop-opacity="0" />
          <stop offset="45%" stop-color="${DORADO}" stop-opacity="1" />
          <stop offset="100%" stop-color="${DORADO}" stop-opacity="0" />
        </linearGradient>
      </defs>

      <rect width="${ANCHO}" height="${ALTO}" fill="url(#brillo)" />
      <rect width="${ANCHO}" height="${ALTO}" fill="none" stroke="${DORADO}" stroke-opacity="0.35" stroke-width="6" />

      <text x="${x}" y="228" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="${tamanoTitulo}"
            font-weight="800" fill="${DORADO}" letter-spacing="2">${limpiar(titulo)}</text>

      <rect x="${x}" y="258" width="340" height="4" fill="url(#linea)" />

      ${bajadaSvg}
      ${detalleSvg}

      <text x="${x}" y="545" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="24"
            font-weight="700" fill="${DORADO}" letter-spacing="2">CICLOTURISMO RUINAS DEL VIEJO MOLINO</text>

      <text x="${x}" y="578" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="21"
            fill="#a1a1aa">grand-team.vercel.app</text>
    </svg>
  `)
}

await mkdir(DESTINO, { recursive: true })

for (const pagina of PAGINAS) {
  const ancho = pagina.ancho ?? 420
  let imagen = sharp(join(PUBLIC, pagina.imagen))
  if (pagina.recorte) imagen = imagen.extract(pagina.recorte)

  const pieza = await imagen
    .resize(ancho, 470, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp(armarFondo(pagina))
    .composite([{ input: pieza, top: Math.round((ALTO - 470) / 2), left: Math.round((520 - ancho) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(join(DESTINO, pagina.archivo))

  console.log(`✓ public/og/${pagina.archivo}`)
}
