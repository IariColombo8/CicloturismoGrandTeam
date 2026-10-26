import { test, expect } from "@playwright/test"
import {
  estadoGastoVisible,
  estadoMovimiento,
  ordenarGastosPorPago,
  ordenarIngresosPorCobro,
  ordenarMovimientos,
  type Gasto,
  type Ingreso,
  type Movimiento,
} from "@/app/admin/gastos/tipos"

function gasto(id: string, estado: Gasto["estado"], pagado: boolean, fecha: string | null = null): Gasto {
  return {
    id,
    descripcion: id,
    monto: 1000,
    porParticipante: false,
    cobraDiscapacidad: true,
    categoria: "otro",
    estado,
    pagado,
    fecha,
    comprobante: null,
    creadoPor: null,
    rolCreador: null,
    aprobadoPor: null,
    fechaAprobacion: null,
    motivoRechazo: null,
  }
}

function ingreso(id: string, estado: Ingreso["estado"], fecha: string | null = null): Ingreso {
  return {
    id,
    descripcion: id,
    monto: 1000,
    categoria: "sponsor",
    estado,
    fecha,
    comprobante: null,
    creadoPor: null,
    notas: null,
    items: [],
  }
}

function movimiento(
  id: string,
  tipo: Movimiento["tipo"],
  estado: string,
  fecha: string | null,
  origen: Gasto | null = null,
): Movimiento {
  return {
    id,
    tipo,
    descripcion: id,
    detalle: null,
    categoria: "otro",
    monto: tipo === "gasto" ? -1000 : 1000,
    estado,
    fecha,
    origen,
  }
}

test.describe("estadoGastoVisible", () => {
  // Estan aprobados todos: "Aprobado" no informaba nada y al lado habia otro
  // badge diciendo lo mismo al reves.
  test("un gasto aprobado dice si se pago, no que esta aprobado", () => {
    expect(estadoGastoVisible(gasto("a", "aprobado", true)).texto).toBe("Pagado")
    expect(estadoGastoVisible(gasto("b", "aprobado", false)).texto).toBe("Por pagar")
  })

  test("nunca escribe la palabra Aprobado", () => {
    for (const g of [gasto("a", "aprobado", true), gasto("b", "aprobado", false)]) {
      expect(estadoGastoVisible(g).texto).not.toContain("Aprobado")
    }
  })

  test("los que todavia no se aprobaron o se rechazaron no mienten", () => {
    expect(estadoGastoVisible(gasto("c", "pendiente", false)).texto).toBe("Pendiente")
    expect(estadoGastoVisible(gasto("d", "rechazado", false)).texto).toBe("Rechazado")
  })

  test("el color acompaña: pagado verde, por pagar naranja", () => {
    expect(estadoGastoVisible(gasto("a", "aprobado", true)).tono).toBe("verde")
    expect(estadoGastoVisible(gasto("b", "aprobado", false)).tono).toBe("naranja")
  })

  test("la clave sirve para filtrar", () => {
    expect(estadoGastoVisible(gasto("a", "aprobado", true)).clave).toBe("pagado")
    expect(estadoGastoVisible(gasto("b", "aprobado", false)).clave).toBe("por_pagar")
  })
})

test.describe("orden de los gastos", () => {
  test("pagado arriba, por pagar abajo", () => {
    const lista = [
      gasto("por-pagar", "aprobado", false),
      gasto("pagado", "aprobado", true),
    ]
    expect(ordenarGastosPorPago(lista).map((g) => g.id)).toEqual(["pagado", "por-pagar"])
  })

  test("lo que todavia no se aprobo y lo rechazado van al final", () => {
    const lista = [
      gasto("rechazado", "rechazado", false),
      gasto("pendiente", "pendiente", false),
      gasto("por-pagar", "aprobado", false),
      gasto("pagado", "aprobado", true),
    ]
    expect(ordenarGastosPorPago(lista).map((g) => g.id)).toEqual([
      "pagado",
      "por-pagar",
      "pendiente",
      "rechazado",
    ])
  })

  test("dentro del grupo se mantiene el orden por fecha que ya traen", () => {
    const lista = [
      gasto("pagado-nuevo", "aprobado", true, "2026-10-18"),
      gasto("pagado-viejo", "aprobado", true, "2026-09-01"),
      gasto("por-pagar", "aprobado", false, "2026-10-17"),
    ]
    expect(ordenarGastosPorPago(lista).map((g) => g.id)).toEqual([
      "pagado-nuevo",
      "pagado-viejo",
      "por-pagar",
    ])
  })

  test("no modifica el array original", () => {
    const lista = [gasto("por-pagar", "aprobado", false), gasto("pagado", "aprobado", true)]
    const antes = lista.map((g) => g.id)
    ordenarGastosPorPago(lista)
    expect(lista.map((g) => g.id)).toEqual(antes)
  })
})

test.describe("orden de los ingresos", () => {
  test("cobrado arriba, por cobrar abajo", () => {
    const lista = [ingreso("por-cobrar", "por_cobrar"), ingreso("cobrado", "cobrado")]
    expect(ordenarIngresosPorCobro(lista).map((i) => i.id)).toEqual(["cobrado", "por-cobrar"])
  })

  test("dentro del grupo manda la fecha con la que vienen", () => {
    const lista = [
      ingreso("cobrado-nuevo", "cobrado", "2026-10-18"),
      ingreso("cobrado-viejo", "cobrado", "2026-09-01"),
      ingreso("por-cobrar", "por_cobrar", "2026-10-17"),
    ]
    expect(ordenarIngresosPorCobro(lista).map((i) => i.id)).toEqual([
      "cobrado-nuevo",
      "cobrado-viejo",
      "por-cobrar",
    ])
  })

  test("no modifica el array original", () => {
    const lista = [ingreso("por-cobrar", "por_cobrar"), ingreso("cobrado", "cobrado")]
    ordenarIngresosPorCobro(lista)
    expect(lista[0].id).toBe("por-cobrar")
  })
})

test.describe("orden de la vista Todo", () => {
  test("la plata que ya se movio va arriba, de los dos tipos", () => {
    const lista = [
      movimiento("gasto-por-pagar", "gasto", "aprobado", "2026-10-18", gasto("g1", "aprobado", false)),
      movimiento("ingreso-por-cobrar", "ingreso", "por_cobrar", "2026-10-18"),
      movimiento("gasto-pagado", "gasto", "aprobado", "2026-10-01", gasto("g2", "aprobado", true)),
      movimiento("ingreso-cobrado", "ingreso", "cobrado", "2026-10-02"),
    ]
    expect(ordenarMovimientos(lista).map((m) => m.id)).toEqual([
      "ingreso-cobrado",
      "gasto-pagado",
      "gasto-por-pagar",
      "ingreso-por-cobrar",
    ])
  })

  test("la fila calculada de inscripciones (sin fecha) sigue primero en su grupo", () => {
    const lista = [
      movimiento("ingreso-con-fecha", "ingreso", "cobrado", "2026-10-18"),
      movimiento("inscripciones", "ingreso", "cobrado", null),
    ]
    expect(ordenarMovimientos(lista).map((m) => m.id)).toEqual([
      "inscripciones",
      "ingreso-con-fecha",
    ])
  })

  test("un gasto rechazado queda al fondo", () => {
    const lista = [
      movimiento("rechazado", "gasto", "rechazado", "2026-10-18", gasto("g1", "rechazado", false)),
      movimiento("cobrado", "ingreso", "cobrado", "2026-09-01"),
    ]
    expect(ordenarMovimientos(lista).map((m) => m.id)).toEqual(["cobrado", "rechazado"])
  })

  test("el estado de una fila de gasto sale de si se pago", () => {
    const pagado = movimiento("m", "gasto", "aprobado", null, gasto("g", "aprobado", true))
    const porPagar = movimiento("m", "gasto", "aprobado", null, gasto("g", "aprobado", false))
    expect(estadoMovimiento(pagado)).toBe("pagado")
    expect(estadoMovimiento(porPagar)).toBe("por_pagar")
  })

  test("una fila de ingreso conserva su propio estado", () => {
    expect(estadoMovimiento(movimiento("m", "ingreso", "cobrado", null))).toBe("cobrado")
    expect(estadoMovimiento(movimiento("m", "ingreso", "por_cobrar", null))).toBe("por_cobrar")
  })
})
