import { test, expect } from "@playwright/test"
import {
  describirEntrega,
  describirEntregaRemera,
  esDniValido,
  muestraEstadoEntrega,
  normalizarDni,
  presentarEstado,
  resumirTalles,
  totalRemeras,
} from "@/lib/miInscripcion"
import { nombreArchivoQR } from "@/lib/descargarQR"

test.describe("normalizarDni", () => {
  test("deja solo dígitos y corta en 8", () => {
    expect(normalizarDni("12.345.678")).toBe("12345678")
    expect(normalizarDni("12345678901")).toBe("12345678")
    expect(normalizarDni("abc123def")).toBe("123")
    expect(normalizarDni("  31 234 567 ")).toBe("31234567")
  })
})

test.describe("esDniValido", () => {
  test("acepta 7 y 8 dígitos", () => {
    expect(esDniValido("1234567")).toBe(true)
    expect(esDniValido("12345678")).toBe(true)
  })

  test("rechaza el resto", () => {
    for (const v of ["", "123456", "123456789", "1234567a"]) {
      expect(esDniValido(v), v).toBe(false)
    }
  })
})

test.describe("presentarEstado", () => {
  test("solo la confirmada habilita el QR", () => {
    expect(presentarEstado("confirmada").muestraQR).toBe(true)
    expect(presentarEstado("aprobado").muestraQR).toBe(true)
    expect(presentarEstado("pendiente").muestraQR).toBe(false)
    expect(presentarEstado("rechazada").muestraQR).toBe(false)
  })

  test("cada estado tiene su tono", () => {
    expect(presentarEstado("confirmada").tono).toBe("verde")
    expect(presentarEstado("pendiente").tono).toBe("amarillo")
    expect(presentarEstado("rechazada").tono).toBe("rojo")
  })

  test("un estado desconocido cae en pendiente y no filtra el QR", () => {
    const desconocido = presentarEstado("lo-que-sea")
    expect(desconocido.muestraQR).toBe(false)
    expect(desconocido.tono).toBe("amarillo")
  })
})

test.describe("resumirTalles", () => {
  test("arma el resumen con cantidad, talle y género", () => {
    expect(resumirTalles([{ talle: "M", genero: "hombre", cantidad: 1 }])).toBe("1 x M (hombre)")
  })

  test("junta varios talles", () => {
    expect(
      resumirTalles([
        { talle: "M", cantidad: 1 },
        { talle: "L", cantidad: 2 },
      ])
    ).toBe("1 x M · 2 x L")
  })

  test("asume cantidad 1 si falta o es inválida", () => {
    expect(resumirTalles([{ talle: "S" }])).toBe("1 x S")
    expect(resumirTalles([{ talle: "S", cantidad: 0 }])).toBe("1 x S")
  })

  test("ignora items sin talle y listas vacías", () => {
    expect(resumirTalles([{ cantidad: 2 }])).toBe("")
    expect(resumirTalles([])).toBe("")
    expect(resumirTalles(null)).toBe("")
    expect(resumirTalles(undefined)).toBe("")
  })
})

test.describe("totalRemeras", () => {
  test("suma las cantidades", () => {
    expect(totalRemeras([{ talle: "M", cantidad: 1 }, { talle: "L", cantidad: 2 }])).toBe(3)
  })

  test("sin pedido es 0", () => {
    expect(totalRemeras([])).toBe(0)
    expect(totalRemeras(null)).toBe(0)
  })
})

test.describe("describirEntrega", () => {
  test("traduce el tipo de envío", () => {
    expect(describirEntrega("retiro")).toBe("Retiro en el evento")
    expect(describirEntrega("envio")).toBe("Envío a domicilio")
    expect(describirEntrega(null)).toBe("A coordinar")
  })
})

test.describe("muestraEstadoEntrega", () => {
  test("se oculta cuando la remera se retira en el evento", () => {
    expect(muestraEstadoEntrega("retiro")).toBe(false)
  })

  test("se muestra cuando la remera viaja", () => {
    expect(muestraEstadoEntrega("envio")).toBe(true)
    expect(muestraEstadoEntrega(null)).toBe(true)
  })
})

test.describe("describirEntregaRemera", () => {
  test("distingue entregada de pendiente", () => {
    expect(describirEntregaRemera("entregado", false)).toBe("Ya entregada")
    expect(describirEntregaRemera("pendiente", true)).toBe("Ya entregada")
    expect(describirEntregaRemera("pendiente", false)).toBe("Pendiente de entrega")
  })
})

test.describe("nombreArchivoQR", () => {
  test("usa el número con 3 dígitos", () => {
    expect(nombreArchivoQR(7)).toBe("QR-GrandTeam-007.png")
    expect(nombreArchivoQR(120)).toBe("QR-GrandTeam-120.png")
  })

  test("sin número usa un nombre genérico", () => {
    expect(nombreArchivoQR(null)).toBe("QR-GrandTeam-inscripcion.png")
    expect(nombreArchivoQR("")).toBe("QR-GrandTeam-inscripcion.png")
  })
})
