// Exportacion de gastos e ingresos a PDF y Excel.
// Las librerias se importan de forma dinamica (dynamic import) para no engordar
// el bundle inicial: solo se cargan cuando el usuario realmente descarga algo.
import type { Gasto, Ingreso } from "./tipos"
import { formatARS, totalGasto } from "./tipos"
import type { ResumenFinanciero } from "./useFinanzas"

const NOMBRE_ARCHIVO_BASE = "grand-team-finanzas"

const ETIQUETA_ESTADO_GASTO: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
}

function etiquetaPago(gasto: Gasto): string {
  if (gasto.estado !== "aprobado") return "-"
  return gasto.pagado ? "Pagado" : "Sin pagar"
}

function fechaLegible(fecha: string | null): string {
  return fecha ? new Date(fecha).toLocaleDateString("es-AR") : "-"
}

// Paleta calcada de la web (fondo negro/gris + acentos de color), para que el PDF
// se vea como una foto del dashboard en vez de una planilla gris de toda la vida.
type RGB = [number, number, number]
const BG_PAGINA: RGB = [17, 24, 39] // gray-900
const BG_TARJETA: RGB = [31, 41, 55] // gray-800
const BG_FILA_PAR: RGB = [24, 32, 45] // levemente mas claro que el fondo
const BORDE: RGB = [55, 65, 81] // gray-700
const TEXTO_GRIS: RGB = [156, 163, 175] // gray-400
const TEXTO_BLANCO: RGB = [229, 231, 235] // gray-200
const DORADO: RGB = [250, 204, 21] // yellow-400
const VERDE: RGB = [34, 197, 94] // green-500
const ESMERALDA: RGB = [52, 211, 153] // emerald-400
const ROJO: RGB = [248, 113, 113] // red-400
const ROJO_FUERTE: RGB = [239, 68, 68] // red-500
const NARANJA: RGB = [251, 146, 60] // orange-400

interface TarjetaResumen {
  titulo: string
  valor: string
  color: RGB
}

function armarTarjetas(resumen: ResumenFinanciero): TarjetaResumen[] {
  return [
    { titulo: "Ingresos", valor: formatARS(resumen.totalIngresos), color: VERDE },
    {
      titulo: "Plata en el BNA",
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

/** Reduce el tamaño de fuente hasta que el texto entre en el ancho disponible. */
function tamañoQueEntra(doc: import("jspdf").jsPDF, texto: string, anchoMax: number, inicial: number): number {
  let tamaño = inicial
  doc.setFontSize(tamaño)
  while (tamaño > 8 && doc.getTextWidth(texto) > anchoMax) {
    tamaño -= 1
    doc.setFontSize(tamaño)
  }
  return tamaño
}

/** Pinta el fondo oscuro de toda la página actual. */
function pintarFondoPagina(doc: import("jspdf").jsPDF): void {
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  doc.setFillColor(...BG_PAGINA)
  doc.rect(0, 0, ancho, alto, "F")
}

/** Dibuja las 4 tarjetas del mini-dashboard, con acento de color como en la web. */
function dibujarTarjetas(
  doc: import("jspdf").jsPDF,
  tarjetas: TarjetaResumen[],
  startY: number,
  marginX: number,
  anchoPagina: number,
): number {
  const gap = 10
  const cardWidth = (anchoPagina - marginX * 2 - gap * 3) / 4
  const cardHeight = 58

  tarjetas.forEach((tarjeta, i) => {
    const x = marginX + i * (cardWidth + gap)

    doc.setFillColor(...BG_TARJETA)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 5, 5, "F")

    // Barra de acento a la izquierda, como el border-l de las cards en la web.
    doc.setFillColor(...tarjeta.color)
    doc.roundedRect(x, startY, 4, cardHeight, 2, 2, "F")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...TEXTO_GRIS)
    doc.text(tarjeta.titulo, x + 12, startY + 18)

    doc.setFont("helvetica", "bold")
    const tamaño = tamañoQueEntra(doc, tarjeta.valor, cardWidth - 20, 15)
    doc.setFontSize(tamaño)
    doc.setTextColor(...tarjeta.color)
    doc.text(tarjeta.valor, x + 12, startY + 40)
  })

  return startY + cardHeight
}

/** Color de texto para el badge de estado de un gasto. */
function colorEstadoGasto(estado: string): RGB {
  if (estado === "aprobado") return VERDE
  if (estado === "rechazado") return ROJO_FUERTE
  return DORADO // pendiente
}

/** Color de texto para si un gasto aprobado ya se pagó o no. */
function colorPago(texto: string): RGB {
  if (texto === "Pagado") return VERDE
  if (texto === "Sin pagar") return NARANJA
  return TEXTO_GRIS
}

/** Color de texto para el badge de estado de un ingreso. */
function colorEstadoIngreso(estado: string): RGB {
  return estado === "cobrado" ? VERDE : DORADO
}

/** Genera y descarga un PDF con el resumen financiero y el detalle de gastos e ingresos, con la estética (oscura, con tarjetas de color) de la página. */
export async function exportarFinanzasPDF(
  gastos: Gasto[],
  ingresos: Ingreso[],
  resumen: ResumenFinanciero,
  confirmados: number,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const marginX = 40

  // El fondo se repinta por cada pagina nueva que agregue autoTable (willDrawPage).
  // La pagina 1 la pintamos a mano porque el header/tarjetas se dibujan antes de
  // que arranque la primera tabla.
  let ultimaPaginaPintada = 1
  pintarFondoPagina(doc)

  const fechaGeneracion = new Date().toLocaleString("es-AR")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...DORADO)
  doc.text("Grand Team Bike 2026", marginX, 42)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(...TEXTO_GRIS)
  doc.text("Finanzas", marginX, 58)

  doc.setFontSize(8)
  doc.text(`Generado el ${fechaGeneracion}`, anchoPagina - marginX, 42, { align: "right" })

  const tarjetas = armarTarjetas(resumen)
  const yDespuesTarjetas = dibujarTarjetas(doc, tarjetas, 72, marginX, anchoPagina)

  const estiloTabla = {
    theme: "grid" as const,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      textColor: TEXTO_BLANCO,
      lineColor: BORDE,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: BG_TARJETA,
      textColor: DORADO,
      fontStyle: "bold" as const,
      lineColor: BORDE,
    },
    alternateRowStyles: { fillColor: BG_FILA_PAR },
    bodyStyles: { fillColor: BG_PAGINA },
    willDrawPage: () => {
      const paginaActual = doc.getNumberOfPages()
      if (paginaActual > ultimaPaginaPintada) {
        pintarFondoPagina(doc)
        ultimaPaginaPintada = paginaActual
      }
    },
  }

  // Detalle de gastos.
  const filasGastos = gastos.map((g) => [
    g.descripcion,
    g.categoria,
    formatARS(totalGasto(g, confirmados)),
    ETIQUETA_ESTADO_GASTO[g.estado] || g.estado,
    etiquetaPago(g),
    fechaLegible(g.fecha),
  ])

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...DORADO)
  doc.text("Gastos", marginX, yDespuesTarjetas + 22)

  autoTable(doc, {
    ...estiloTabla,
    startY: yDespuesTarjetas + 30,
    head: [["Descripción", "Categoría", "Monto", "Estado", "Pago", "Fecha"]],
    body: filasGastos.length > 0 ? filasGastos : [["Sin gastos registrados", "", "", "", "", ""]],
    didParseCell: (data) => {
      if (data.section !== "body" || filasGastos.length === 0) return
      if (data.column.index === 2) {
        data.cell.styles.textColor = ROJO
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 3) {
        data.cell.styles.textColor = colorEstadoGasto(gastos[data.row.index]?.estado || "pendiente")
      } else if (data.column.index === 4) {
        data.cell.styles.textColor = colorPago(String(data.cell.raw))
      }
    },
  })

  const yDespuesGastos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22

  // Detalle de ingresos.
  const filasIngresos = ingresos.map((i) => [
    i.descripcion,
    i.categoria,
    formatARS(i.monto),
    i.estado === "cobrado" ? "Cobrado" : "Por cobrar",
    fechaLegible(i.fecha),
  ])

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...DORADO)
  doc.text("Ingresos", marginX, yDespuesGastos)

  autoTable(doc, {
    ...estiloTabla,
    startY: yDespuesGastos + 8,
    head: [["Descripción", "Categoría", "Monto", "Estado", "Fecha"]],
    body: filasIngresos.length > 0 ? filasIngresos : [["Sin ingresos registrados", "", "", "", ""]],
    didParseCell: (data) => {
      if (data.section !== "body" || filasIngresos.length === 0) return
      if (data.column.index === 2) {
        data.cell.styles.textColor = VERDE
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 3) {
        data.cell.styles.textColor = colorEstadoIngreso(ingresos[data.row.index]?.estado || "por_cobrar")
      }
    },
  })

  doc.save(`${NOMBRE_ARCHIVO_BASE}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/** Genera y descarga un Excel (.xlsx) con resumen, gastos e ingresos en hojas separadas. */
export async function exportarFinanzasExcel(
  gastos: Gasto[],
  ingresos: Ingreso[],
  resumen: ResumenFinanciero,
  confirmados: number,
): Promise<void> {
  const XLSX = await import("xlsx")

  const tarjetas = armarTarjetas(resumen)
  const hojaResumen = XLSX.utils.json_to_sheet(
    tarjetas.map((c) => ({ Indicador: c.titulo, Valor: c.valor })),
  )

  const hojaGastos = XLSX.utils.json_to_sheet(
    gastos.map((g) => ({
      Descripción: g.descripcion,
      Categoría: g.categoria,
      Monto: totalGasto(g, confirmados),
      Estado: ETIQUETA_ESTADO_GASTO[g.estado] || g.estado,
      Pago: etiquetaPago(g),
      Fecha: fechaLegible(g.fecha),
      "Creado por": g.creadoPor || "",
    })),
  )

  const hojaIngresos = XLSX.utils.json_to_sheet(
    ingresos.map((i) => ({
      Descripción: i.descripcion,
      Categoría: i.categoria,
      Monto: i.monto,
      Estado: i.estado === "cobrado" ? "Cobrado" : "Por cobrar",
      Fecha: fechaLegible(i.fecha),
      Notas: i.notas || "",
    })),
  )

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen")
  XLSX.utils.book_append_sheet(libro, hojaGastos, "Gastos")
  XLSX.utils.book_append_sheet(libro, hojaIngresos, "Ingresos")

  XLSX.writeFile(libro, `${NOMBRE_ARCHIVO_BASE}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
