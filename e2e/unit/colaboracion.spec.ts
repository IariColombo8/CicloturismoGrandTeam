import { test, expect } from "@playwright/test"
import {
  cuentaEnGastos,
  montoCobrado,
  montoEsperado,
  type InscripcionPago,
} from "@/app/admin/gastos/tipos"

// Una colaboracion pone la plata de la inscripcion pero no va al evento:
// suma como ingreso y no es una persona mas en los gastos por participante.

const PRECIO = 25000

function insc(pagoEstado: InscripcionPago["pagoEstado"], montoPagado: number | null): InscripcionPago {
  return {
    id: "x",
    nombre: "Ana",
    apellido: "Prueba",
    dni: "30000000",
    estado: "confirmada",
    montoPagado,
    pagoEstado,
    pagoNota: null,
    discapacidad: false,
  }
}

test("una colaboracion suma como ingreso", () => {
  expect(montoCobrado(insc("colaboracion", 25000), PRECIO)).toBe(25000)
  expect(montoCobrado(insc("colaboracion", null), PRECIO)).toBe(PRECIO)
  expect(montoEsperado(insc("colaboracion", 25000), PRECIO)).toBe(25000)
})

test("una colaboracion no cuenta en los gastos por persona", () => {
  expect(cuentaEnGastos(insc("colaboracion", 25000))).toBe(false)
  expect(cuentaEnGastos(insc("pagado", 25000))).toBe(true)
  expect(cuentaEnGastos(insc("gratis", 0))).toBe(true)
})
