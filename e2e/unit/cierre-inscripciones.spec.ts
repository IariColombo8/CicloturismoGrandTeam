import { test, expect } from "@playwright/test"
import { inscripcionesCerradas, msHastaCierre } from "../../lib/inscripcion/cierre"

// El cierre es el 5/11/2026 a las 8:00 de Argentina (UTC-3) = 11:00 UTC.
const ms = (iso: string) => new Date(iso).getTime()

test.describe("cierre de inscripciones", () => {
  test("a las 7:59 de Argentina todavia se puede inscribir", () => {
    expect(inscripcionesCerradas(ms("2026-11-05T10:59:59Z"))).toBe(false)
    expect(msHastaCierre(ms("2026-11-05T10:59:59Z"))).toBe(1000)
  })

  test("a las 8:00 en punto ya cerro", () => {
    expect(inscripcionesCerradas(ms("2026-11-05T11:00:00Z"))).toBe(true)
    expect(msHastaCierre(ms("2026-11-05T11:00:00Z"))).toBe(0)
  })

  test("el 4 de noviembre esta abierta y el 6 cerrada", () => {
    expect(inscripcionesCerradas(ms("2026-11-04T23:00:00-03:00"))).toBe(false)
    expect(inscripcionesCerradas(ms("2026-11-06T00:00:00-03:00"))).toBe(true)
  })
})
