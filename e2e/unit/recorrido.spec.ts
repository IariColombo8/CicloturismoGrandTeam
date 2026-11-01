import { test, expect } from "@playwright/test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { PUNTOS_RUTA, acumularDistancias, distanciaM, posicionEnRuta, type Punto } from "../../lib/recorrido"

test.describe("ruta del mapa (generada desde el GPX)", () => {
  test("sale y llega al mismo lugar", () => {
    expect(PUNTOS_RUTA.length).toBeGreaterThan(50)
    expect(distanciaM(PUNTOS_RUTA[0], PUNTOS_RUTA[PUNTOS_RUTA.length - 1])).toBeLessThan(50)
  })

  // El GPX grabado tenia una ida y vuelta por el mismo camino (km 27): en el mapa va siempre "derecho".
  test("no pega la vuelta en U en ningun punto", () => {
    const rumbo = (a: Punto, b: Punto) =>
      (Math.atan2((b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180), b[0] - a[0]) * 180) / Math.PI
    for (let i = 1; i < PUNTOS_RUTA.length - 1; i++) {
      let giro = Math.abs(rumbo(PUNTOS_RUTA[i - 1], PUNTOS_RUTA[i]) - rumbo(PUNTOS_RUTA[i], PUNTOS_RUTA[i + 1]))
      if (giro > 180) giro = 360 - giro
      expect(giro, `vuelta en U en el punto ${i}`).toBeLessThan(110)
    }
  })

  test("el GPX para descargar existe", () => {
    expect(existsSync(join(__dirname, "..", "..", "public", "recorrido-grand-team.gpx"))).toBe(true)
  })
})

test.describe("posicionEnRuta", () => {
  const puntos: Punto[] = [
    [0, 0],
    [0, 1],
    [1, 1],
  ]
  const acumulados = acumularDistancias(puntos)

  test("extremos", () => {
    expect(posicionEnRuta(puntos, acumulados, -5)).toEqual([0, 0])
    expect(posicionEnRuta(puntos, acumulados, 1e12)).toEqual([1, 1])
  })

  test("a mitad del primer tramo", () => {
    const [lat, lon] = posicionEnRuta(puntos, acumulados, acumulados[1] / 2)
    expect(lat).toBeCloseTo(0)
    expect(lon).toBeCloseTo(0.5)
  })

  test("justo en un vertice", () => {
    expect(posicionEnRuta(puntos, acumulados, acumulados[1])).toEqual([0, 1])
  })
})
