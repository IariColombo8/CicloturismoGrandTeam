import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { test, expect } from "@playwright/test"
import { armarFinanzasPDF } from "@/app/admin/gastos/exportFinanzas"
import { armarEstimacionPDF } from "@/app/admin/gastos/exportEstimacion"
import type { Gasto, Ingreso, InscripcionPago, NotaCaja } from "@/app/admin/gastos/tipos"
import type { ResumenFinanciero } from "@/app/admin/gastos/useFinanzas"
import { nuevoItemComision } from "@/lib/finanzas/comisiones"

/**
 * Test de humo de los dos PDF. No mira el diseño (eso se mira abriéndolos),
 * pero sí que se armen sin explotar: los dos comparten pdfEstilo.ts, así que un
 * cambio en la estética no puede romper el informe de finanzas en silencio.
 *
 * Con PDF_SALIDA=<carpeta> además los escribe en disco, para abrirlos y ver
 * cómo quedaron.
 */

const PRECIO = 25000

function gasto(parcial: Partial<Gasto> & { descripcion: string }): Gasto {
  return {
    id: parcial.descripcion,
    monto: 100000,
    porParticipante: false,
    cobraDiscapacidad: true,
    categoria: "logistica",
    estado: "aprobado",
    pagado: true,
    fecha: "2026-10-01T12:00:00.000Z",
    comprobante: null,
    creadoPor: "equipo@grandteam.test",
    rolCreador: "admin",
    aprobadoPor: "equipo@grandteam.test",
    fechaAprobacion: "2026-10-02T12:00:00.000Z",
    motivoRechazo: null,
    ...parcial,
  }
}

const GASTOS: Gasto[] = [
  gasto({ descripcion: "Alquiler del salón", monto: 450000 }),
  gasto({ descripcion: "Sonido", monto: 180000, pagado: false }),
  gasto({ descripcion: "Comida", monto: 8500, porParticipante: true, categoria: "comida" }),
  gasto({ descripcion: "Remeras", monto: 6200, porParticipante: true, estado: "pendiente", pagado: false }),
  gasto({ descripcion: "Idea descartada", monto: 90000, estado: "rechazado", motivoRechazo: "No hace falta" }),
]

const INGRESOS: Ingreso[] = [
  {
    id: "sponsor-1",
    descripcion: "Sponsor Bicicletería López",
    monto: 300000,
    categoria: "sponsor",
    estado: "cobrado",
    fecha: "2026-09-20T12:00:00.000Z",
    comprobante: null,
    creadoPor: null,
    notas: "Mitad ahora, mitad en noviembre",
    items: [],
  },
  {
    id: "sponsor-2",
    descripcion: "Sponsor Rueda Libre",
    monto: 150000,
    categoria: "sponsor",
    estado: "por_cobrar",
    fecha: "2026-10-05T12:00:00.000Z",
    comprobante: null,
    creadoPor: null,
    notas: null,
    items: [],
  },
  {
    id: "comisiones",
    descripcion: "Comisiones de Naranja X",
    monto: 1547.75,
    categoria: "comision",
    estado: "cobrado",
    fecha: "2026-10-18T12:00:00.000Z",
    comprobante: null,
    creadoPor: null,
    notas: null,
    items: [
      nuevoItemComision("2026-10-12", 1200.5),
      nuevoItemComision("2026-10-15", 300),
      nuevoItemComision("2026-10-18", 47.25, "comisión de la semana"),
    ],
  },
]

function inscripcion(nombre: string, extra: Partial<InscripcionPago> = {}): InscripcionPago {
  return {
    id: nombre,
    nombre,
    apellido: "Pérez",
    dni: "30111222",
    estado: "confirmada",
    montoPagado: PRECIO,
    pagoEstado: "pagado",
    pagoNota: null,
    discapacidad: false,
    ...extra,
  }
}

const RESUMEN: ResumenFinanciero = {
  confirmados: 40,
  inscriptosTotales: 52,
  conDiscapacidad: [],
  inscriptosConDiscapacidad: 0,
  ingresoInscripciones: 38 * PRECIO,
  ingresoInscripcionesProyectado: 52 * PRECIO,
  desglosePagos: {
    precioLista: { cantidad: 36, total: 36 * PRECIO },
    otroMonto: {
      cantidad: 2,
      total: 30000,
      items: [
        inscripcion("Ana", { montoPagado: 20000 }),
        inscripcion("Beto", { montoPagado: 10000 }),
      ],
    },
    sinPagar: { cantidad: 1, total: PRECIO, items: [inscripcion("Carla", { pagoEstado: "pendiente" })] },
    otraForma: {
      cantidad: 1,
      total: PRECIO,
      items: [
        inscripcion("Lore", {
          pagoEstado: "otro",
          pagoNota: "Pagó 700 uruguayos, Lore nos transfiere esa plata",
        }),
      ],
    },
    gratis: { cantidad: 3, items: [inscripcion("Nico", { pagoEstado: "gratis", montoPagado: 0 })] },
  },
  ingresosCobrados: 301547.75,
  ingresosPorCobrar: 150000,
  totalIngresos: 38 * PRECIO + 301547.75,
  totalIngresosProyectado: 52 * PRECIO + 451547.75,
  gastosAprobados: 450000 + 180000 + 8500 * 40,
  gastosAprobadosProyectado: 450000 + 180000 + 8500 * 52,
  gastosPendientes: 6200 * 40,
  gastosAprobadosPagados: 450000 + 8500 * 40,
  gastosAprobadosSinPagar: 180000,
  balance: 0,
  balanceProyectado: 0,
  plataEnBanco: 101547.75,
  pagosDiferentes: [],
  diferenciaPagos: -20000,
}

const NOTAS: NotaCaja[] = [
  {
    id: "n1",
    texto: "Falta la transferencia de Lore",
    resuelta: false,
    creadaPor: "equipo@grandteam.test",
    creadaEn: "2026-10-10T12:00:00.000Z",
  },
]

/** Guarda el PDF si se pidió con PDF_SALIDA, para poder abrirlo. */
function guardarSiSePidio(doc: import("jspdf").jsPDF, nombre: string) {
  const salida = process.env.PDF_SALIDA
  if (!salida) return
  const bytes = doc.output("arraybuffer")
  writeFileSync(join(salida, nombre), Buffer.from(bytes))
}

test("el PDF de finanzas se arma completo", async () => {
  const { doc, nombreArchivo } = await armarFinanzasPDF(
    GASTOS,
    INGRESOS,
    RESUMEN,
    RESUMEN.confirmados,
    PRECIO,
    NOTAS,
  )

  expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  expect(nombreArchivo).toMatch(/^grand-team-finanzas-\d{4}-\d{2}-\d{2}\.pdf$/)
  guardarSiSePidio(doc, "finanzas.pdf")
})

test("el PDF de la estimación se arma completo", async () => {
  const { doc, nombreArchivo } = await armarEstimacionPDF({
    cantidad: 150,
    precioBase: PRECIO,
    gastos: GASTOS,
    ingresosCobrados: RESUMEN.ingresosCobrados,
    ingresosPorCobrar: RESUMEN.ingresosPorCobrar,
    gratis: 3,
    contarGratis: true,
  })

  expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  expect(nombreArchivo).toContain("150-inscriptos")
  guardarSiSePidio(doc, "estimacion-con-gratis.pdf")
})

test("la estimación sin tener en cuenta las gratis también se arma", async () => {
  const { doc } = await armarEstimacionPDF({
    cantidad: 150,
    precioBase: PRECIO,
    gastos: GASTOS,
    ingresosCobrados: 0,
    ingresosPorCobrar: 0,
    gratis: 3,
    contarGratis: false,
  })

  expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  guardarSiSePidio(doc, "estimacion-sin-gratis.pdf")
})

test("sin gastos ni ingresos no explota (evento recién arrancado)", async () => {
  const vacio: ResumenFinanciero = {
    ...RESUMEN,
    confirmados: 0,
    inscriptosTotales: 0,
    conDiscapacidad: [],
    inscriptosConDiscapacidad: 0,
    ingresoInscripciones: 0,
    desglosePagos: {
      precioLista: { cantidad: 0, total: 0 },
      otroMonto: { cantidad: 0, total: 0, items: [] },
      sinPagar: { cantidad: 0, total: 0, items: [] },
      otraForma: { cantidad: 0, total: 0, items: [] },
      gratis: { cantidad: 0, items: [] },
    },
    totalIngresos: 0,
  }

  const finanzas = await armarFinanzasPDF([], [], vacio, 0, PRECIO, [])
  expect(finanzas.doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)

  const estimacion = await armarEstimacionPDF({
    cantidad: 0,
    precioBase: PRECIO,
    gastos: [],
    ingresosCobrados: 0,
    ingresosPorCobrar: 0,
    gratis: 0,
    contarGratis: false,
  })
  expect(estimacion.doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
})
