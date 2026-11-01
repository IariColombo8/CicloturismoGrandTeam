// Convierte el GPX grabado del recorrido en lo que usa el mapa de la home.
//
//   node scripts/gpx-a-recorrido.mjs
//
// Entrada: datos/recorrido-grand-team-original.gpx (export de Mi Fitness, tal cual se grabo).
// Salidas (se generan, NO se editan a mano):
//   - lib/recorrido/ruta.json            -> puntos [lat, lon] simplificados + distancia, para el mapa
//   - public/recorrido-grand-team.gpx    -> el mismo recorrido limpio, para descargar (Strava, Garmin...)
//
// Que limpia:
//   1. Los tramos donde se fue y se volvio por el mismo camino (una vuelta en U para esperar
//      al grupo, por ejemplo). Si mas adelante el track vuelve a pasar a menos de RADIO_M de un
//      punto despues de haber recorrido mas de MIN_DESVIO_M, todo lo del medio se saca: en el
//      mapa queda una sola linea que va "derecho". El limite MAX_DESVIO_M evita cortar el
//      recorrido entero (salida y llegada son el mismo lugar).
//   2. Puntos de mas: se simplifica con Douglas-Peucker (TOLERANCIA_M) para que el JSON pese poco.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ENTRADA = path.join(RAIZ, "datos", "recorrido-grand-team-original.gpx")
const SALIDA_JSON = path.join(RAIZ, "lib", "recorrido", "ruta.json")
const SALIDA_GPX = path.join(RAIZ, "public", "recorrido-grand-team.gpx")

const RADIO_M = 15
const MIN_DESVIO_M = 150
const MAX_DESVIO_M = 5000
const TOLERANCIA_M = 4

const R = 6371000
const rad = Math.PI / 180
const distancia = (a, b) => {
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const xml = fs.readFileSync(ENTRADA, "utf8")
const puntos = [...xml.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)">/g)].map((m) => ({ lat: +m[1], lon: +m[2] }))
if (puntos.length < 2) throw new Error("El GPX no tiene puntos de track")

let acumulado = 0
puntos.forEach((p, i) => {
  if (i) acumulado += distancia(puntos[i - 1], p)
  p.m = acumulado
})
const distanciaOriginal = acumulado

// 1. Sacar las idas y vueltas por el mismo camino
const limpios = []
const cortes = []
for (let i = 0; i < puntos.length; i++) {
  limpios.push(puntos[i])
  let vuelta = -1
  for (let j = i + 1; j < puntos.length && puntos[j].m - puntos[i].m < MAX_DESVIO_M; j++) {
    if (puntos[j].m - puntos[i].m > MIN_DESVIO_M && distancia(puntos[i], puntos[j]) < RADIO_M) vuelta = j
  }
  if (vuelta > 0) {
    cortes.push({ km: (puntos[i].m / 1000).toFixed(2), metros: Math.round(puntos[vuelta].m - puntos[i].m) })
    i = vuelta - 1
  }
}

// 1b. Ruido del GPS: puntos que retroceden unos metros y vuelven (el reloj interpola y a veces
// deja un punto "atras"). Se saca todo punto donde el camino pega la vuelta (> GIRO_MAX grados)
// en un tramo corto (< RUIDO_M). Se repite hasta que no quede ninguno.
const GIRO_MAX = 110
const RUIDO_M = 50
const rumbo = (a, b) => Math.atan2((b.lon - a.lon) * Math.cos(a.lat * rad), b.lat - a.lat) / rad
function sacarRetrocesos(lista) {
  const salida = [...lista]
  for (let cambio = true; cambio; ) {
    cambio = false
    for (let i = 1; i < salida.length - 1; i++) {
      const a = salida[i - 1], p = salida[i], b = salida[i + 1]
      let giro = Math.abs(rumbo(a, p) - rumbo(p, b))
      if (giro > 180) giro = 360 - giro
      const corto = Math.min(distancia(a, p), distancia(p, b)) < RUIDO_M
      if ((giro > GIRO_MAX && corto) || distancia(a, p) < 0.5) {
        salida.splice(i, 1)
        cambio = true
        i--
      }
    }
  }
  return salida
}
const sinRuido = sacarRetrocesos(limpios)

// 2. Douglas-Peucker (en metros, proyeccion local equirectangular)
const lat0 = sinRuido[0].lat * rad
const xy = (p) => [p.lon * rad * Math.cos(lat0) * R, p.lat * rad * R]
const distSegmento = (p, a, b) => {
  const [px, py] = xy(p), [ax, ay] = xy(a), [bx, by] = xy(b)
  const dx = bx - ax, dy = by - ay
  const largo = dx * dx + dy * dy
  const t = largo ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
function simplificar(lista, tol) {
  const conservar = new Uint8Array(lista.length)
  conservar[0] = conservar[lista.length - 1] = 1
  const pila = [[0, lista.length - 1]]
  while (pila.length) {
    const [a, b] = pila.pop()
    let max = 0, idx = -1
    for (let k = a + 1; k < b; k++) {
      const d = distSegmento(lista[k], lista[a], lista[b])
      if (d > max) { max = d; idx = k }
    }
    if (max > tol) { conservar[idx] = 1; pila.push([a, idx], [idx, b]) }
  }
  return lista.filter((_, k) => conservar[k])
}
// Al simplificar, un monton de puntos de cuando el grupo estaba parado puede quedar como un
// zigzag de pocos metros: se vuelve a pasar el filtro de retrocesos sobre el resultado.
const simples = sacarRetrocesos(simplificar(sinRuido, TOLERANCIA_M))
const paraGpx = sacarRetrocesos(simplificar(sinRuido, 1))

let distanciaLimpia = 0
for (let i = 1; i < paraGpx.length; i++) distanciaLimpia += distancia(paraGpx[i - 1], paraGpx[i])

const redondear = (n) => Math.round(n * 1e6) / 1e6
const ruta = {
  // Generado por scripts/gpx-a-recorrido.mjs. No editar a mano.
  distanciaKm: Math.round(distanciaLimpia / 100) / 10,
  puntos: simples.map((p) => [redondear(p.lat), redondear(p.lon)]),
}
fs.mkdirSync(path.dirname(SALIDA_JSON), { recursive: true })
fs.writeFileSync(SALIDA_JSON, JSON.stringify(ruta) + "\n")

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Grand Team Bike" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Recorrido Grand Team Bike 2026</name></metadata>
  <trk><name>Recorrido Grand Team Bike 2026</name><trkseg>
${paraGpx.map((p) => `    <trkpt lat="${redondear(p.lat)}" lon="${redondear(p.lon)}"/>`).join("\n")}
  </trkseg></trk>
</gpx>
`
fs.writeFileSync(SALIDA_GPX, gpx)

console.log(`Puntos: ${puntos.length} -> ${limpios.length} sin idas y vueltas -> ${paraGpx.length} en el GPX -> ${simples.length} en el mapa`)
console.log(`Distancia: ${(distanciaOriginal / 1000).toFixed(2)} km grabados -> ${(distanciaLimpia / 1000).toFixed(2)} km limpios`)
for (const c of cortes) console.log(`  Ida y vuelta sacada en el km ${c.km} (${c.metros} m)`)
