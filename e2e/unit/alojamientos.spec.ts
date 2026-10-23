import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { gruposPorEstrellas, ordenarPorEstrellas, telefonosDe, urlMapa } from "../../lib/alojamientos"

test.describe("telefonosDe", () => {
  test("celular con 15: link tel y WhatsApp con el 9", () => {
    expect(telefonosDe("(3442) 15 671460")).toEqual([
      { texto: "(3442) 15 671460", tel: "+5493442671460", whatsapp: "5493442671460" },
    ])
  })

  test("varios numeros: el segundo hereda el codigo de area", () => {
    const [fijo, otro] = telefonosDe("(3442) 411200 / 472422")
    expect(fijo).toEqual({ texto: "(3442) 411200", tel: "+543442411200", whatsapp: null })
    expect(otro).toEqual({ texto: "(3442) 472422", tel: "+543442472422", whatsapp: null })
  })

  test("15 pegado al numero ('154 06543')", () => {
    expect(telefonosDe("(3442) 154 06543")[0].whatsapp).toBe("5493442406543")
  })

  test("Buenos Aires con codigo entre parentesis y sin parentesis", () => {
    expect(telefonosDe("(11) 3469-0257")[0].tel).toBe("+541134690257")
    expect(telefonosDe("11 35726995")[0].tel).toBe("+541135726995")
  })

  test("numero incompleto: se muestra pero sin link", () => {
    expect(telefonosDe("(3442) 15 6 3355")).toEqual([{ texto: "(3442) 15 6 3355", tel: null, whatsapp: null }])
  })

  test("formato internacional de los destacados", () => {
    expect(telefonosDe("+54 9 3442 57-5039")[0]).toMatchObject({ tel: "+5493442575039", whatsapp: "5493442575039" })
  })

  test("vacio", () => {
    expect(telefonosDe(null)).toEqual([])
    expect(telefonosDe("  ")).toEqual([])
  })
})

test.describe("orden por estrellas", () => {
  const lista = [
    { nombre: "B", estrellas: null, orden: 1 },
    { nombre: "A", estrellas: 2, orden: 5 },
    { nombre: "C", estrellas: 3, orden: 9 },
    { nombre: "D", estrellas: 2, orden: 2 },
  ]

  test("de mas estrellas a menos, sin estrellas al final, y por orden", () => {
    expect(ordenarPorEstrellas(lista).map((a) => a.nombre)).toEqual(["C", "D", "A", "B"])
  })

  test("agrupa por estrellas", () => {
    expect(gruposPorEstrellas(ordenarPorEstrellas(lista)).map((g) => [g.estrellas, g.items.length])).toEqual([
      [3, 1],
      [2, 2],
      [0, 1],
    ])
  })
})

test("urlMapa agrega la ciudad solo si falta", () => {
  expect(urlMapa("Rocamora 219")).toContain(encodeURIComponent("Rocamora 219, Concepción del Uruguay"))
  expect(urlMapa("Ruta 135 km 4,5, Colón, Entre Rios")).toBe(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Ruta 135 km 4,5, Colón, Entre Rios")}`,
  )
  expect(urlMapa(null)).toBeNull()
})

test("la migracion trae los 67 alojamientos de la fuente", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261023_alojamientos_categorias.sql"), "utf8")
  const filas = sql.match(/^\s+\('(hotel|apart|hosteria|complejo|bungalow|cabana|campo|casa|departamento)',/gm) ?? []
  expect(filas.length).toBe(67)
})
