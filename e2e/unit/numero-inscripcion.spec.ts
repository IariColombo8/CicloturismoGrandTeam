import { test, expect } from "@playwright/test"
import { SIN_NUMERO, debeTenerNumero, formatNumeroInscripcion } from "@/lib/numeroInscripcion"

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
