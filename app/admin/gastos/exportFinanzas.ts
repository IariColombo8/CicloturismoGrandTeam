// Exportacion de gastos e ingresos a PDF y Excel.
// Las librerias se importan de forma dinamica (dynamic import) para no engordar
// el bundle inicial: solo se cargan cuando el usuario realmente descarga algo.
import type { Gasto, Ingreso, NotaCaja, TonoEstado } from "./tipos"
import { estadoGastoVisible, formatARS, ordenarGastosPorPago, totalGasto } from "./tipos"
import type { ResumenFinanciero } from "./useFinanzas"
import { ETIQUETA_PLATA } from "@/lib/finanzas/cuenta"
import { descripcionComisiones, fechaCorta, ordenarComisiones } from "@/lib/finanzas/comisiones"
import {
  crearEstiloTabla,
  dibujarCabecera,
  dibujarTarjetas,
  dibujarTituloSeccion,
  pintarFondoPagina,
  yDespuesDeTabla,
  DORADO,
  ESMERALDA,
  NARANJA,
  ROJO,
  ROJO_FUERTE,
  TEXTO_GRIS,
  VERDE,
  type RGB,
  type TarjetaResumen,
} from "./pdfEstilo"

const NOMBRE_ARCHIVO_BASE = "grand-team-finanzas"

// El estado de un gasto se lee "Pagado" / "Por pagar" (ver estadoGastoVisible):
// estan aprobados todos, asi que la columna "Aprobado" + la columna "Pago"
// decian dos veces lo mismo y ahora es una sola.
function etiquetaEstadoGasto(gasto: Gasto): string {
  return estadoGastoVisible(gasto).texto
}

function fechaLegible(fecha: string | null): string {
  return fecha ? new Date(fecha).toLocaleDateString("es-AR") : "-"
}

/** Fila de la tabla de ingresos, ya lista para el PDF y para el Excel. */
interface FilaIngreso {
  descripcion: string
  categoria: string
  monto: number
  /** "cobrado" | "por_cobrar", para pintar el estado. */
  estado: string
  fecha: string
  /** Observacion del ingreso (solo la usa el Excel). */
  notas?: string
}

/** "13 inscriptos" / "1 inscripto". */
function cuantos(cantidad: number): string {
  return `${cantidad} inscripto${cantidad === 1 ? "" : "s"}`
}

/**
 * Filas de ingreso por inscripciones, desglosadas por situacion de pago.
 * El PDF mostraba solo los ingresos cargados a mano, asi que la plata de las
 * inscripciones (que es la mayor parte) no aparecia en ningun lado.
 *
 * `conNombres` decide si se lista quien compone cada fila: en el PDF va corto
 * (como en pantalla), porque 16 nombres en una celda hacen ilegible la tabla;
 * en el Excel van completos, que para eso es una planilla de trabajo.
 */
function filasInscripciones(
  resumen: ResumenFinanciero,
  precioBase: number,
  conNombres: boolean,
): FilaIngreso[] {
  const d = resumen.desglosePagos
  const filas: FilaIngreso[] = []

  /** Agrega los nombres a la descripcion solo si corresponde. */
  const con = (base: string, nombres: string[]): string =>
    conNombres && nombres.length > 0 ? `${base}: ${nombres.join(", ")}` : base

  if (d.precioLista.cantidad > 0) {
    filas.push({
      descripcion: `Inscripciones que pagaron ${formatARS(precioBase)} (${cuantos(
        d.precioLista.cantidad,
      )})`,
      categoria: "inscripciones",
      monto: d.precioLista.total,
      estado: "cobrado",
      fecha: "-",
    })
  }

  if (d.otroMonto.cantidad > 0) {
    filas.push({
      descripcion: con(
        `Inscripciones que pagaron otro monto (${cuantos(d.otroMonto.cantidad)})`,
        d.otroMonto.items.map((i) => `${i.nombre} ${i.apellido} ${formatARS(i.montoPagado ?? 0)}`),
      ),
      categoria: "inscripciones",
      monto: d.otroMonto.total,
      estado: "cobrado",
      fecha: "-",
    })
  }

  if (d.sinPagar.cantidad > 0) {
    filas.push({
      descripcion: con(
        `Confirmados que todavia no pagaron (${cuantos(d.sinPagar.cantidad)})`,
        d.sinPagar.items.map((i) => `${i.nombre} ${i.apellido}`),
      ),
      categoria: "inscripciones",
      monto: d.sinPagar.total,
      estado: "por_cobrar",
      fecha: "-",
    })
  }

  if (d.otraForma.cantidad > 0) {
    filas.push({
      descripcion: con(
        `Pagaron de otra forma, no entro a la caja (${cuantos(d.otraForma.cantidad)})`,
        d.otraForma.items.map(
          (i) => `${i.nombre} ${i.apellido}${i.pagoNota ? ` (${i.pagoNota})` : ""}`,
        ),
      ),
      categoria: "inscripciones",
      monto: d.otraForma.total,
      estado: "por_cobrar",
      fecha: "-",
    })
  }

  if (d.gratis.cantidad > 0) {
    filas.push({
      descripcion: con(
        `Inscripciones sin cargo (${cuantos(d.gratis.cantidad)})`,
        d.gratis.items.map((i) => `${i.nombre} ${i.apellido}`),
      ),
      categoria: "inscripciones",
      monto: 0,
      estado: "cobrado",
      fecha: "-",
    })
  }

  return filas
}

/** Lo cobrado arriba, lo que falta cobrar abajo. */
function ordenarIngresos(filas: FilaIngreso[]): FilaIngreso[] {
  return [...filas].sort(
    (a, b) => (a.estado === "cobrado" ? 0 : 1) - (b.estado === "cobrado" ? 0 : 1),
  )
}

/**
 * Ingresos cargados a mano, en el mismo formato que las filas de inscripciones.
 *
 * El acumulador de comisiones de Naranja X va en UNA fila: el total y desde
 * cuando. Imprimir cada acreditacion seria media pagina de montos de $300 que
 * no le dicen nada a nadie; el detalle dia por dia esta en el panel y en la
 * hoja "Comisiones" del Excel.
 */
function filasIngresosManuales(ingresos: Ingreso[]): FilaIngreso[] {
  return ingresos.map((i) => ({
    descripcion: descripcionComisiones(i.descripcion, i.items),
    categoria: i.categoria,
    monto: i.monto,
    estado: i.estado,
    // El acumulador no tiene una fecha sola: la que importa es desde cuando.
    fecha: i.items.length > 0 ? "-" : fechaLegible(i.fecha),
    notas: i.notas || "",
  }))
}

function armarTarjetas(resumen: ResumenFinanciero): TarjetaResumen[] {
  return [
    { titulo: "Ingresos", valor: formatARS(resumen.totalIngresos), color: VERDE },
    {
      titulo: ETIQUETA_PLATA,
      valor: `${resumen.plataEnBanco < 0 ? "-" : ""}${formatARS(Math.abs(resumen.plataEnBanco))}`,
      color: resumen.plataEnBanco < 0 ? ROJO_FUERTE : ESMERALDA,
    },
    { titulo: "Gastos Aprobados", valor: formatARS(resumen.gastosAprobados), color: ROJO },
    {
      titulo: "Balance",
      valor: `${resumen.balance < 0 ? "-" : ""}${formatARS(Math.abs(resumen.balance))}`,
      color: resumen.balance < 0 ? ROJO_FUERTE : DORADO,
    },
  ]
}

/** Los mismos colores que el badge de la pantalla, en RGB para el PDF. */
const COLOR_TONO: Record<TonoEstado, RGB> = {
  verde: VERDE,
  naranja: NARANJA,
  amarillo: DORADO,
  rojo: ROJO_FUERTE,
}

/** Color de texto para el estado de un gasto ("Pagado" / "Por pagar"). */
function colorEstadoGasto(gasto: Gasto | undefined): RGB {
  if (!gasto) return TEXTO_GRIS
  return COLOR_TONO[estadoGastoVisible(gasto).tono]
}

/** Color de texto para el badge de estado de un ingreso. */
function colorEstadoIngreso(estado: string): RGB {
  return estado === "cobrado" ? VERDE : DORADO
}

/**
 * Arma el PDF de finanzas y lo devuelve sin guardarlo, con su nombre de
 * archivo. Separado de la descarga para poder generarlo en un test.
 */
export async function armarFinanzasPDF(
  gastos: Gasto[],
  ingresos: Ingreso[],
  resumen: ResumenFinanciero,
  confirmados: number,
  precioBase: number,
  notas: NotaCaja[] = [],
): Promise<{ doc: import("jspdf").jsPDF; nombreArchivo: string }> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const marginX = 40

  // El fondo se repinta por cada pagina nueva que agregue autoTable (lo hace el
  // willDrawPage del estilo). La pagina 1 se pinta a mano porque la cabecera y
  // las tarjetas se dibujan antes de que arranque la primera tabla.
  pintarFondoPagina(doc)
  dibujarCabecera(doc, "Finanzas", marginX, anchoPagina)

  const tarjetas = armarTarjetas(resumen)
  const yDespuesTarjetas = dibujarTarjetas(doc, tarjetas, 72, marginX, anchoPagina)

  const estiloTabla = crearEstiloTabla(doc, marginX)

  // Detalle de gastos: pagados arriba, sin pagar abajo.
  const gastosOrdenados = ordenarGastosPorPago(gastos)
  const filasGastos = gastosOrdenados.map((g) => [
    g.descripcion,
    g.categoria,
    formatARS(totalGasto(g, confirmados, resumen.conDiscapacidad?.length ?? 0)),
    etiquetaEstadoGasto(g),
    fechaLegible(g.fecha),
  ])

  dibujarTituloSeccion(doc, "Gastos", marginX, yDespuesTarjetas + 22)

  autoTable(doc, {
    ...estiloTabla,
    startY: yDespuesTarjetas + 30,
    head: [["Descripción", "Categoría", "Monto", "Estado", "Fecha"]],
    body: filasGastos.length > 0 ? filasGastos : [["Sin gastos registrados", "", "", "", ""]],
    didParseCell: (data) => {
      if (data.section !== "body" || filasGastos.length === 0) return
      if (data.column.index === 2) {
        data.cell.styles.textColor = ROJO
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 3) {
        data.cell.styles.textColor = colorEstadoGasto(gastosOrdenados[data.row.index])
      }
    },
  })

  const yDespuesGastos = yDespuesDeTabla(doc) + 22

  // Detalle de ingresos: primero las inscripciones (que son la mayor parte de
  // la plata) y despues los ingresos cargados a mano.
  // Sin nombres: la tabla del PDF se lee como la pantalla ("13 inscriptos").
  // Y ordenado: lo cobrado arriba, lo que falta cobrar abajo.
  const ingresosTodos = ordenarIngresos([
    ...filasInscripciones(resumen, precioBase, false),
    ...filasIngresosManuales(ingresos),
  ])
  const filasIngresos = ingresosTodos.map((i) => [
    i.descripcion,
    i.categoria,
    formatARS(i.monto),
    i.estado === "cobrado" ? "Cobrado" : "Por cobrar",
    i.fecha,
  ])

  // Fila de cierre con lo efectivamente cobrado (inscripciones + otros).
  if (ingresosTodos.length > 0) {
    filasIngresos.push(["TOTAL COBRADO", "", formatARS(resumen.totalIngresos), "", ""])
  }

  dibujarTituloSeccion(doc, "Ingresos", marginX, yDespuesGastos)

  autoTable(doc, {
    ...estiloTabla,
    startY: yDespuesGastos + 8,
    head: [["Descripción", "Categoría", "Monto", "Estado", "Fecha"]],
    body: filasIngresos.length > 0 ? filasIngresos : [["Sin ingresos registrados", "", "", "", ""]],
    didParseCell: (data) => {
      if (data.section !== "body" || ingresosTodos.length === 0) return

      // Ultima fila: el total, en dorado y negrita.
      const esTotal = data.row.index === ingresosTodos.length
      if (esTotal) {
        data.cell.styles.textColor = DORADO
        data.cell.styles.fontStyle = "bold"
        return
      }

      if (data.column.index === 2) {
        data.cell.styles.textColor = VERDE
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 3) {
        data.cell.styles.textColor = colorEstadoIngreso(
          ingresosTodos[data.row.index]?.estado || "por_cobrar",
        )
      }
    },
  })

  // Notas de caja: lo que no entra en ninguna tabla pero hay que recordar.
  const notasVisibles = notas.filter((n) => n.texto.trim())
  if (notasVisibles.length > 0) {
    const yDespuesIngresos = yDespuesDeTabla(doc) + 22
    dibujarTituloSeccion(doc, "Notas de caja", marginX, yDespuesIngresos)

    autoTable(doc, {
      ...estiloTabla,
      startY: yDespuesIngresos + 8,
      head: [["Nota", "Estado", "Fecha"]],
      body: notasVisibles.map((n) => [
        n.texto,
        n.resuelta ? "Resuelta" : "Pendiente",
        fechaLegible(n.creadaEn),
      ]),
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 1) return
        data.cell.styles.textColor = notasVisibles[data.row.index]?.resuelta ? VERDE : NARANJA
      },
    })
  }

  return {
    doc,
    nombreArchivo: `${NOMBRE_ARCHIVO_BASE}-${new Date().toISOString().slice(0, 10)}.pdf`,
  }
}

/** Genera y descarga un PDF con el resumen financiero y el detalle de gastos e ingresos, con la estética (oscura, con tarjetas de color) de la página. */
export async function exportarFinanzasPDF(
  gastos: Gasto[],
  ingresos: Ingreso[],
  resumen: ResumenFinanciero,
  confirmados: number,
  precioBase: number,
  notas: NotaCaja[] = [],
): Promise<void> {
  const { doc, nombreArchivo } = await armarFinanzasPDF(
    gastos,
    ingresos,
    resumen,
    confirmados,
    precioBase,
    notas,
  )
  doc.save(nombreArchivo)
}

/** Genera y descarga un Excel (.xlsx) con resumen, gastos e ingresos en hojas separadas. */
export async function exportarFinanzasExcel(
  gastos: Gasto[],
  ingresos: Ingreso[],
  resumen: ResumenFinanciero,
  confirmados: number,
  precioBase: number,
  notas: NotaCaja[] = [],
): Promise<void> {
  const XLSX = await import("xlsx")

  const d = resumen.desglosePagos
  const tarjetas = armarTarjetas(resumen)
  const hojaResumen = XLSX.utils.json_to_sheet([
    ...tarjetas.map((c) => ({ Indicador: c.titulo, Valor: c.valor })),
    { Indicador: "", Valor: "" },
    {
      Indicador: `Pagaron ${formatARS(precioBase)}`,
      Valor: `${d.precioLista.cantidad} · ${formatARS(d.precioLista.total)}`,
    },
    {
      Indicador: "Pagaron otro monto",
      Valor: `${d.otroMonto.cantidad} · ${formatARS(d.otroMonto.total)}`,
    },
    {
      Indicador: "Confirmados sin pagar",
      Valor: `${d.sinPagar.cantidad} · falta ${formatARS(d.sinPagar.total)}`,
    },
    {
      Indicador: "Pagaron de otra forma (no entro a la caja)",
      Valor: `${d.otraForma.cantidad} · ${formatARS(d.otraForma.total)}`,
    },
    { Indicador: "Inscripciones sin cargo", Valor: `${d.gratis.cantidad}` },
    {
      Indicador: "Personas con discapacidad (no pagan el lugar del evento)",
      Valor: `${resumen.conDiscapacidad?.length ?? 0}`,
    },
  ])

  // Mismo orden que el PDF: pagados arriba, sin pagar abajo.
  const hojaGastos = XLSX.utils.json_to_sheet(
    ordenarGastosPorPago(gastos).map((g) => ({
      Descripción: g.descripcion,
      Categoría: g.categoria,
      Monto: totalGasto(g, confirmados, resumen.conDiscapacidad?.length ?? 0),
      Estado: etiquetaEstadoGasto(g),
      Fecha: fechaLegible(g.fecha),
      "Creado por": g.creadoPor || "",
    })),
  )

  // Cobrado arriba, por cobrar abajo. Las inscripciones van primero dentro de
  // cada grupo (son la mayor parte de la plata) y aca si llevan los nombres:
  // es una planilla para trabajar, no un informe.
  const hojaIngresos = XLSX.utils.json_to_sheet(
    ordenarIngresos([
      ...filasInscripciones(resumen, precioBase, true),
      ...filasIngresosManuales(ingresos),
    ]).map((i) => ({
      Descripción: i.descripcion,
      Categoría: i.categoria,
      Monto: i.monto,
      Estado: i.estado === "cobrado" ? "Cobrado" : "Por cobrar",
      Fecha: i.fecha,
      Notas: i.notas || "",
    })),
  )

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen")
  XLSX.utils.book_append_sheet(libro, hojaGastos, "Gastos")
  XLSX.utils.book_append_sheet(libro, hojaIngresos, "Ingresos")

  // Hoja aparte con las comisiones dia por dia. En el PDF esto va resumido en
  // una fila; el Excel es la planilla de trabajo, asi que aca sí va el detalle.
  const comisiones = ingresos.filter((i) => i.items.length > 0)
  if (comisiones.length > 0) {
    const hojaComisiones = XLSX.utils.json_to_sheet(
      comisiones.flatMap((i) =>
        ordenarComisiones(i.items).map((item) => ({
          Ingreso: i.descripcion,
          Fecha: fechaCorta(item.fecha),
          Monto: item.monto,
          Nota: item.nota || "",
        })),
      ),
    )
    XLSX.utils.book_append_sheet(libro, hojaComisiones, "Comisiones")
  }

  const notasVisibles = notas.filter((n) => n.texto.trim())
  if (notasVisibles.length > 0) {
    const hojaNotas = XLSX.utils.json_to_sheet(
      notasVisibles.map((n) => ({
        Nota: n.texto,
        Estado: n.resuelta ? "Resuelta" : "Pendiente",
        Fecha: fechaLegible(n.creadaEn),
        "Cargada por": n.creadaPor || "",
      })),
    )
    XLSX.utils.book_append_sheet(libro, hojaNotas, "Notas de caja")
  }

  XLSX.writeFile(libro, `${NOMBRE_ARCHIVO_BASE}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
