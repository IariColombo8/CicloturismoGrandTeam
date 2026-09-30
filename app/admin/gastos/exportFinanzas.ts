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

interface ResumenCard {
  titulo: string
  valor: string
}

function armarResumenCards(resumen: ResumenFinanciero): ResumenCard[] {
  return [
    { titulo: "Ingresos", valor: formatARS(resumen.totalIngresos) },
    { titulo: "Plata en el BNA", valor: `${resumen.plataEnBanco < 0 ? "-" : ""}${formatARS(Math.abs(resumen.plataEnBanco))}` },
    { titulo: "Gastos Aprobados", valor: formatARS(resumen.gastosAprobados) },
    { titulo: "Balance", valor: `${resumen.balance < 0 ? "-" : ""}${formatARS(Math.abs(resumen.balance))}` },
  ]
}

/** Genera y descarga un PDF con el resumen financiero y el detalle de gastos e ingresos. */
export async function exportarFinanzasPDF(
  gastos: Gasto[],
  ingresos: Ingreso[],
  resumen: ResumenFinanciero,
  confirmados: number,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const fechaGeneracion = new Date().toLocaleString("es-AR")

  doc.setFontSize(16)
  doc.text("Grand Team Bike 2026 — Finanzas", 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado el ${fechaGeneracion}`, 40, 56)
  doc.setTextColor(0)

  // Resumen: los 4 indicadores en una sola fila.
  const cards = armarResumenCards(resumen)
  autoTable(doc, {
    startY: 70,
    head: [cards.map((c) => c.titulo)],
    body: [cards.map((c) => c.valor)],
    theme: "grid",
    styles: { halign: "center", fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 215, 0] },
  })

  const yDespuesResumen = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  // Detalle de gastos.
  const filasGastos = gastos.map((g) => [
    g.descripcion,
    g.categoria,
    formatARS(totalGasto(g, confirmados)),
    ETIQUETA_ESTADO_GASTO[g.estado] || g.estado,
    etiquetaPago(g),
    fechaLegible(g.fecha),
  ])

  doc.setFontSize(12)
  doc.text("Gastos", 40, yDespuesResumen)
  autoTable(doc, {
    startY: yDespuesResumen + 8,
    head: [["Descripción", "Categoría", "Monto", "Estado", "Pago", "Fecha"]],
    body: filasGastos.length > 0 ? filasGastos : [["Sin gastos registrados", "", "", "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 215, 0] },
    margin: { left: 40, right: 40 },
  })

  const yDespuesGastos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  // Detalle de ingresos.
  const filasIngresos = ingresos.map((i) => [
    i.descripcion,
    i.categoria,
    formatARS(i.monto),
    i.estado === "cobrado" ? "Cobrado" : "Por cobrar",
    fechaLegible(i.fecha),
  ])

  doc.setFontSize(12)
  doc.text("Ingresos", 40, yDespuesGastos)
  autoTable(doc, {
    startY: yDespuesGastos + 8,
    head: [["Descripción", "Categoría", "Monto", "Estado", "Fecha"]],
    body: filasIngresos.length > 0 ? filasIngresos : [["Sin ingresos registrados", "", "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 215, 0] },
    margin: { left: 40, right: 40 },
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

  const cards = armarResumenCards(resumen)
  const hojaResumen = XLSX.utils.json_to_sheet(
    cards.map((c) => ({ Indicador: c.titulo, Valor: c.valor })),
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
