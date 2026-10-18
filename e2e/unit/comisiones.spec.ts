import { test, expect } from "@playwright/test"
import {
  CATEGORIA_COMISION,
  DESCRIPCION_COMISIONES,
  desdeCuando,
  descripcionComisiones,
  esIngresoComision,
  fechaCorta,
  hoyISO,
  nuevoItemComision,
  ordenarComisiones,
  parsearItemsComision,
  resumenComisiones,
  totalComisiones,
  type ItemComision,
} from "@/lib/finanzas/comisiones"

/** Item armado a mano, con id fijo para poder buscarlo. */
function item(id: string, fecha: string, monto: number, nota: string | null = null): ItemComision {
  return { id, fecha, monto, nota }
}

const COMISIONES = [
  item("a", "2026-10-12", 1200.5),
  item("b", "2026-10-15", 300),
  item("c", "2026-10-18", 47.25, "comisión de la semana"),
]

test.describe("totales", () => {
  test("el total es la suma de todas las acreditaciones", () => {
    expect(totalComisiones(COMISIONES)).toBeCloseTo(1547.75, 2)
  })

  test("sin comisiones el total es cero", () => {
    expect(totalComisiones([])).toBe(0)
  })

  test("desde cuando es la fecha mas vieja, no la primera de la lista", () => {
    expect(desdeCuando(COMISIONES)).toBe("2026-10-12")
    expect(desdeCuando(ordenarComisiones(COMISIONES))).toBe("2026-10-12")
    expect(desdeCuando([])).toBeNull()
  })

  test("el resumen trae total, desde y cantidad", () => {
    const resumen = resumenComisiones(COMISIONES)
    expect(resumen.cantidad).toBe(3)
    expect(resumen.desde).toBe("2026-10-12")
    expect(resumen.total).toBeCloseTo(1547.75, 2)
  })
})

test.describe("orden", () => {
  test("la ultima acreditacion queda arriba", () => {
    expect(ordenarComisiones(COMISIONES).map((i) => i.fecha)).toEqual([
      "2026-10-18",
      "2026-10-15",
      "2026-10-12",
    ])
  })

  test("ordenar no modifica el array original", () => {
    const original = [...COMISIONES]
    ordenarComisiones(COMISIONES)
    expect(COMISIONES).toEqual(original)
  })
})

test.describe("fechas", () => {
  // El Date de "2026-10-18" es medianoche UTC: en Argentina (UTC-3) mostraba
  // el 17. Por eso la fecha se formatea sin pasar por Date.
  test("formatea dd/mm/aaaa sin corrimiento de zona horaria", () => {
    expect(fechaCorta("2026-10-18")).toBe("18/10/2026")
    expect(fechaCorta("2026-01-01")).toBe("01/01/2026")
  })

  test("acepta el ISO largo que puede venir de la base", () => {
    expect(fechaCorta("2026-10-18T03:00:00.000Z")).toBe("18/10/2026")
  })

  test("una fecha que no se entiende no imprime basura", () => {
    expect(fechaCorta(null)).toBe("-")
    expect(fechaCorta("18/10/2026")).toBe("-")
    expect(fechaCorta("")).toBe("-")
  })

  test("hoyISO devuelve la fecha local en aaaa-mm-dd", () => {
    const hoy = hoyISO()
    expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const ahora = new Date()
    expect(hoy).toBe(
      `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
        ahora.getDate(),
      ).padStart(2, "0")}`,
    )
  })
})

test.describe("parseo del JSONB", () => {
  test("lee los items guardados", () => {
    const leidos = parsearItemsComision([
      { id: "a", fecha: "2026-10-12", monto: "1200.5", nota: " algo " },
    ])
    expect(leidos).toHaveLength(1)
    expect(leidos[0].monto).toBeCloseTo(1200.5, 2)
    expect(leidos[0].nota).toBe("algo")
  })

  test("descarta lo que no se entiende en vez de romper la pantalla", () => {
    const leidos = parsearItemsComision([
      { id: "a", fecha: "2026-10-12", monto: 100 },
      { id: "b", fecha: "ayer", monto: 100 },
      { id: "c", fecha: "2026-10-13", monto: "no es un numero" },
      null,
      "cualquier cosa",
    ])
    expect(leidos.map((i) => i.id)).toEqual(["a"])
  })

  test("un valor que no es array da una lista vacia", () => {
    expect(parsearItemsComision(null)).toEqual([])
    expect(parsearItemsComision(undefined)).toEqual([])
    expect(parsearItemsComision({ fecha: "2026-10-12", monto: 1 })).toEqual([])
  })

  test("un item sin id igual se lee, con un id propio", () => {
    const leidos = parsearItemsComision([{ fecha: "2026-10-12", monto: 1 }])
    expect(leidos).toHaveLength(1)
    expect(leidos[0].id).toBeTruthy()
  })

  test("una nota vacia queda en null", () => {
    const leidos = parsearItemsComision([{ fecha: "2026-10-12", monto: 1, nota: "   " }])
    expect(leidos[0].nota).toBeNull()
  })
})

test.describe("item nuevo", () => {
  test("guarda fecha, monto y nota recortada", () => {
    const nuevo = nuevoItemComision("2026-10-18", 47.25, "  de la semana  ")
    expect(nuevo.fecha).toBe("2026-10-18")
    expect(nuevo.monto).toBeCloseTo(47.25, 2)
    expect(nuevo.nota).toBe("de la semana")
    expect(nuevo.id).toBeTruthy()
  })

  test("sin fecha valida usa hoy, para no perder la carga", () => {
    expect(nuevoItemComision("", 100).fecha).toBe(hoyISO())
  })

  test("dos items seguidos no comparten id", () => {
    expect(nuevoItemComision("2026-10-18", 1).id).not.toBe(nuevoItemComision("2026-10-18", 1).id)
  })
})

test.describe("como se nombra en el PDF", () => {
  // La regla: en el PDF va el total y desde cuando, nunca los dias uno por uno.
  test("dice desde cuando y cuantas acreditaciones", () => {
    expect(descripcionComisiones(DESCRIPCION_COMISIONES, COMISIONES)).toBe(
      "Comisiones de Naranja X (desde el 12/10/2026, 3 acreditaciones)",
    )
  })

  test("una sola acreditacion va en singular", () => {
    expect(descripcionComisiones(DESCRIPCION_COMISIONES, [COMISIONES[0]])).toContain(
      "1 acreditación)",
    )
  })

  test("no inventa fechas cuando no hay items", () => {
    expect(descripcionComisiones("Sponsor Bicicletería López", [])).toBe(
      "Sponsor Bicicletería López",
    )
  })

  test("nunca lista las fechas de cada dia", () => {
    const texto = descripcionComisiones(DESCRIPCION_COMISIONES, COMISIONES)
    expect(texto).not.toContain("15/10/2026")
    expect(texto).not.toContain("18/10/2026")
  })
})

test.describe("que ingreso es un acumulador", () => {
  test("lo es por categoria o por tener items", () => {
    expect(esIngresoComision({ categoria: CATEGORIA_COMISION, items: [] })).toBe(true)
    expect(esIngresoComision({ categoria: "otro", items: COMISIONES })).toBe(true)
  })

  test("un sponsor normal no lo es", () => {
    expect(esIngresoComision({ categoria: "sponsor", items: [] })).toBe(false)
    expect(esIngresoComision({ categoria: "sponsor" })).toBe(false)
  })
})
