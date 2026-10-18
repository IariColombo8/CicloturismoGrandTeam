import { test, expect } from "@playwright/test"
import {
  calcularEstimacion,
  type EntradaEstimacion,
  type GastoEstimado,
} from "@/lib/finanzas/estimacion"

const FIJO = (monto: number, estado = "aprobado"): GastoEstimado => ({
  monto,
  porParticipante: false,
  estado,
})
const POR_PERSONA = (monto: number, estado = "aprobado"): GastoEstimado => ({
  monto,
  porParticipante: true,
  estado,
})

function entrada(cambios: Partial<EntradaEstimacion> = {}): EntradaEstimacion {
  return {
    cantidad: 100,
    precioBase: 25000,
    gastos: [FIJO(500000), POR_PERSONA(8000)],
    ingresosCobrados: 0,
    ingresosPorCobrar: 0,
    gratis: 0,
    contarGratis: false,
    ...cambios,
  }
}

test.describe("la cuenta base", () => {
  test("entra la inscripción por cada uno, sale lo fijo más lo de por persona", () => {
    const est = calcularEstimacion(entrada())
    expect(est.entra).toBe(100 * 25000)
    expect(est.gastosFijos).toBe(500000)
    expect(est.gastosVariables).toBe(8000 * 100)
    expect(est.sale).toBe(500000 + 800000)
    expect(est.neto).toBe(2500000 - 1300000)
    expect(est.veredicto).toBe("RINDE")
  })

  test("los otros ingresos se suman una sola vez, no por persona", () => {
    const est = calcularEstimacion(entrada({ ingresosCobrados: 300000, ingresosPorCobrar: 200000 }))
    expect(est.entraOtros).toBe(500000)
    expect(est.entra).toBe(100 * 25000 + 500000)
  })

  test("los gastos pendientes cuentan (es el peor caso realista)", () => {
    const est = calcularEstimacion(entrada({ gastos: [FIJO(100000, "pendiente")] }))
    expect(est.sale).toBe(100000)
  })

  test("los rechazados no cuentan", () => {
    const est = calcularEstimacion(entrada({ gastos: [FIJO(100000, "rechazado")] }))
    expect(est.sale).toBe(0)
  })

  test("el veredicto avisa cuando falta plata", () => {
    expect(calcularEstimacion(entrada({ cantidad: 10 })).veredicto).toBe("FALTA PLATA")
  })

  test("empatar justo se llama JUSTO", () => {
    // Un solo gasto fijo igual a lo que entra.
    const est = calcularEstimacion(
      entrada({ cantidad: 10, gastos: [FIJO(250000)] }),
    )
    expect(est.neto).toBe(0)
    expect(est.veredicto).toBe("JUSTO")
  })
})

test.describe("inscripciones gratis", () => {
  // No pagan, pero comen y llevan remera: salen de lo que entra y siguen en los
  // gastos por persona.
  test("tenerlas en cuenta baja lo que entra pero no lo que sale", () => {
    const sin = calcularEstimacion(entrada({ gratis: 5, contarGratis: false }))
    const con = calcularEstimacion(entrada({ gratis: 5, contarGratis: true }))

    expect(sin.pagan).toBe(100)
    expect(con.pagan).toBe(95)
    expect(con.entra).toBe(95 * 25000)
    expect(con.sale).toBe(sin.sale)
    expect(sin.entra - con.entra).toBe(5 * 25000)
  })

  test("no tenerlas en cuenta calcula como si pagaran todos", () => {
    const est = calcularEstimacion(entrada({ gratis: 5, contarGratis: false }))
    expect(est.gratisDescontados).toBe(0)
    expect(est.entraInscripciones).toBe(100 * 25000)
  })

  test("si hay más gratis que inscriptos proyectados no entra nada negativo", () => {
    const est = calcularEstimacion(entrada({ cantidad: 3, gratis: 10, contarGratis: true }))
    expect(est.pagan).toBe(0)
    expect(est.entraInscripciones).toBe(0)
    expect(est.gratisDescontados).toBe(3)
  })

  test("sin gratis cargadas la respuesta no cambia nada", () => {
    const sin = calcularEstimacion(entrada({ gratis: 0, contarGratis: false }))
    const con = calcularEstimacion(entrada({ gratis: 0, contarGratis: true }))
    expect(con).toEqual(sin)
  })
})

test.describe("datos derivados", () => {
  test("el costo por persona reparte todo lo que sale", () => {
    const est = calcularEstimacion(entrada())
    expect(est.costoPorPersona).toBeCloseTo(1300000 / 100, 6)
  })

  test("el precio que empata deja el neto en cero", () => {
    const est = calcularEstimacion(entrada({ ingresosCobrados: 200000 }))
    const empatando = calcularEstimacion(entrada({ ingresosCobrados: 200000, precioBase: est.precioQueEmpata }))
    expect(empatando.neto).toBeCloseTo(0, 6)
  })

  test("con cero inscriptos no divide por cero", () => {
    const est = calcularEstimacion(entrada({ cantidad: 0 }))
    expect(est.costoPorPersona).toBe(0)
    expect(est.precioQueEmpata).toBe(0)
    expect(Number.isNaN(est.neto)).toBe(false)
  })

  test("una cantidad rara no rompe la cuenta", () => {
    const est = calcularEstimacion(entrada({ cantidad: Number.NaN }))
    expect(est.cantidad).toBe(0)
    expect(est.entra).toBe(0)
  })

  test("una cantidad con decimales se trunca a personas enteras", () => {
    expect(calcularEstimacion(entrada({ cantidad: 10.9 })).cantidad).toBe(10)
  })
})
