// El recorrido del evento, tal como sale del GPX limpio (scripts/gpx-a-recorrido.mjs).
// Logica pura: sin Leaflet ni DOM, asi se puede testear (e2e/unit/recorrido.spec.ts).

import ruta from "./ruta.json"

export type Punto = [lat: number, lon: number]

export const PUNTOS_RUTA = ruta.puntos as Punto[]

/** GPX limpio para descargar (Strava, Garmin, Wikiloc...). Lo genera el mismo script. */
export const URL_GPX = "/recorrido-grand-team.gpx"

const RADIO_TIERRA_M = 6371000
const RAD = Math.PI / 180

/** Distancia en metros entre dos puntos (haversine). */
export function distanciaM(a: Punto, b: Punto): number {
  const dLat = (b[0] - a[0]) * RAD
  const dLon = (b[1] - a[1]) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h))
}

/** Metros recorridos hasta cada punto (el primero es 0, el ultimo es el largo total). */
export function acumularDistancias(puntos: Punto[]): number[] {
  const acumulados = [0]
  for (let i = 1; i < puntos.length; i++) acumulados.push(acumulados[i - 1] + distanciaM(puntos[i - 1], puntos[i]))
  return acumulados
}

/**
 * Donde esta quien lleva `metros` pedaleados. Fuera de rango se queda en la
 * salida o en la llegada. Busqueda binaria: se llama en cada cuadro de la
 * animacion.
 */
export function posicionEnRuta(puntos: Punto[], acumulados: number[], metros: number): Punto {
  if (puntos.length === 0) return [0, 0]
  const total = acumulados[acumulados.length - 1]
  if (metros <= 0 || puntos.length === 1) return puntos[0]
  if (metros >= total) return puntos[puntos.length - 1]

  let bajo = 0
  let alto = acumulados.length - 1
  while (alto - bajo > 1) {
    const medio = (bajo + alto) >> 1
    if (acumulados[medio] <= metros) bajo = medio
    else alto = medio
  }
  const tramo = acumulados[alto] - acumulados[bajo]
  const t = tramo > 0 ? (metros - acumulados[bajo]) / tramo : 0
  const a = puntos[bajo]
  const b = puntos[alto]
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Link de Google Maps para llegar a un punto (la salida). */
export function linkComoLlegar([lat, lon]: Punto): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}
