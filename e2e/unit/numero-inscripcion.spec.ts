import { test, expect } from "@playwright/test"
import {
  SIN_NUMERO,
  compararParaListado,
  debeTenerNumero,
  formatNumeroInscripcion,
  menorNumeroLibre,
  ordenEstado,
  type FilaListado,
} from "@/lib/numeroInscripcion"

test.describe("formatNumeroInscripcion", () => {
  test("formatea con 3 dígitos", () => {
    expect(formatNumeroInscripcion(1)).toBe("#001")
    expect(formatNumeroInscripcion(5)).toBe("#005")
    expect(formatNumeroInscripcion(42)).toBe("#042")
    expect(formatNumeroInscripcion(246)).toBe("#246")
  })

  test("no recorta números de más de 3 dígitos", () => {
    expect(formatNumeroInscripcion(1234)).toBe("#1234")
  })

  test("muestra guion cuando todavía no tiene número", () => {
    expect(formatNumeroInscripcion(null)).toBe(SIN_NUMERO)
    expect(formatNumeroInscripcion(undefined)).toBe(SIN_NUMERO)
  })

  test("nunca imprime la palabra 'null'", () => {
    expect(formatNumeroInscripcion(null)).not.toContain("null")
  })
})

test.describe("debeTenerNumero", () => {
  test("solo las confirmadas llevan número", () => {
    expect(debeTenerNumero("confirmada")).toBe(true)
    expect(debeTenerNumero("pendiente")).toBe(false)
    expect(debeTenerNumero("rechazada")).toBe(false)
  })
})

test.describe("orden del listado", () => {
  const ordenar = (filas: FilaListado[]) => [...filas].sort(compararParaListado)
  const etiquetas = (filas: FilaListado[]) =>
    ordenar(filas).map((f) => `${f.estado[0]}${f.numeroInscripcion ?? "-"}`)

  test("los pendientes van arriba de todo", () => {
    expect(ordenEstado("pendiente")).toBeLessThan(ordenEstado("confirmada"))
    expect(ordenEstado("confirmada")).toBeLessThan(ordenEstado("rechazada"))
  })

  test("los confirmados se ven del mayor al menor, con el #1 último", () => {
    const filas: FilaListado[] = [
      { estado: "confirmada", numeroInscripcion: 1 },
      { estado: "confirmada", numeroInscripcion: 3 },
      { estado: "confirmada", numeroInscripcion: 2 },
    ]
    expect(ordenar(filas).map((f) => f.numeroInscripcion)).toEqual([3, 2, 1])
  })

  test("pendientes primero, confirmados descendente, rechazados al final", () => {
    const filas: FilaListado[] = [
      { estado: "confirmada", numeroInscripcion: 2 },
      { estado: "rechazada", numeroInscripcion: null },
      { estado: "pendiente", numeroInscripcion: null, fechaInscripcion: "2026-08-01" },
      { estado: "confirmada", numeroInscripcion: 5 },
      { estado: "pendiente", numeroInscripcion: null, fechaInscripcion: "2026-08-10" },
      { estado: "confirmada", numeroInscripcion: 1 },
    ]
    expect(etiquetas(filas)).toEqual(["p-", "p-", "c5", "c2", "c1", "r-"])
  })

  test("entre pendientes gana el más reciente", () => {
    const filas: FilaListado[] = [
      { estado: "pendiente", numeroInscripcion: null, fechaInscripcion: "2026-08-01" },
      { estado: "pendiente", numeroInscripcion: null, fechaInscripcion: "2026-08-15" },
      { estado: "pendiente", numeroInscripcion: null, fechaInscripcion: "2026-08-07" },
    ]
    expect(ordenar(filas).map((f) => f.fechaInscripcion)).toEqual([
      "2026-08-15",
      "2026-08-07",
      "2026-08-01",
    ])
  })

  test("el #1 queda último aunque haya muchas inscripciones", () => {
    const filas: FilaListado[] = Array.from({ length: 120 }, (_, i) => ({
      estado: "confirmada",
      numeroInscripcion: i + 1,
    }))
    const ordenadas = ordenar(filas)
    expect(ordenadas[0].numeroInscripcion).toBe(120)
    expect(ordenadas.at(-1)?.numeroInscripcion).toBe(1)
  })

  test("'aprobado' se agrupa con los confirmados", () => {
    expect(ordenEstado("aprobado")).toBe(ordenEstado("confirmada"))
  })
})

test.describe("menorNumeroLibre", () => {
  test("con la edición vacía arranca en 1", () => {
    expect(menorNumeroLibre([])).toBe(1)
  })

  test("sigue la secuencia cuando no hay huecos", () => {
    expect(menorNumeroLibre([1, 2, 3, 4, 5])).toBe(6)
  })

  test("reutiliza el hueco que deja una inscripción despublicada", () => {
    // Estaban 1..6 y el 3 volvió a pendiente: el próximo confirmado toma el 3.
    expect(menorNumeroLibre([1, 2, 4, 5, 6])).toBe(3)
  })

  test("toma el hueco más bajo cuando hay varios", () => {
    expect(menorNumeroLibre([1, 4, 5])).toBe(2)
  })

  test("si se liberó el 1, ese es el próximo", () => {
    expect(menorNumeroLibre([2, 3, 4])).toBe(1)
  })

  test("ignora los null de los pendientes", () => {
    expect(menorNumeroLibre([1, null, 2, undefined, null])).toBe(3)
  })

  test("no se confunde con el orden de la lista", () => {
    expect(menorNumeroLibre([5, 1, 4, 2])).toBe(3)
  })

  test("un ciclo confirmar → despublicar → confirmar no salta números", () => {
    const asignados: (number | null)[] = [1, 2, 3, 4, 5]

    // Entra alguien nuevo: se lleva el 6.
    const nuevo = menorNumeroLibre(asignados)
    expect(nuevo).toBe(6)
    asignados.push(nuevo)

    // El 3 vuelve a pendiente: libera su número.
    asignados[2] = null
    expect(menorNumeroLibre(asignados)).toBe(3)

    // Se confirma otro: ocupa el 3, no el 7.
    asignados[2] = 3
    expect(menorNumeroLibre(asignados)).toBe(7)
  })
})
