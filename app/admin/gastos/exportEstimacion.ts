// PDF de la estimacion: "si se inscriben N personas, ¿rinde?".
//
// Es el mismo informe que el de finanzas pero proyectado a la cantidad que se
// pone en el estimador, en vez de a los confirmados de hoy. Comparte la
// estetica (pdfEstilo.ts) y la cuenta (lib/finanzas/estimacion.ts), que es la
// misma que muestra la tarjeta en pantalla.
//
// Las librerias de PDF entran por dynamic import: solo se bajan cuando alguien
// realmente descarga algo.

import {
  calcularEstimacion,
  personasDelGasto,
  type EntradaEstimacion,
} from "@/lib/finanzas/estimacion"
import { formatARS, type Gasto } from "./tipos"
import {
  crearEstiloTabla,
  dibujarCabecera,
  dibujarTarjetas,
  dibujarTituloSeccion,
  pintarFondoPagina,
  yDespuesDeTabla,
  DORADO,
  ROJO,
  ROJO_FUERTE,
  TEXTO_GRIS,
  VERDE,
  type TarjetaResumen,
} from "./pdfEstilo"

const NOMBRE_ARCHIVO_BASE = "grand-team-estimacion"

export interface DatosEstimacionPDF extends Omit<EntradaEstimacion, "gastos"> {
  /** Los gastos completos: el PDF los lista uno por uno. */
  gastos: Gasto[]
}

/** "150 inscriptos" / "1 inscripto". */
function cuantos(cantidad: number): string {
  return `${cantidad} inscripto${cantidad === 1 ? "" : "s"}`
}

/**
 * Arma el PDF y lo devuelve sin guardarlo, con el nombre de archivo que le
 * corresponde. Separado de la descarga para poder generarlo en un test.
 */
export async function armarEstimacionPDF(
  datos: DatosEstimacionPDF,
): Promise<{ doc: import("jspdf").jsPDF; nombreArchivo: string }> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const est = calcularEstimacion(datos)

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const marginX = 40

  pintarFondoPagina(doc)
  dibujarCabecera(doc, `Estimación con ${cuantos(est.cantidad)}`, marginX, anchoPagina)

  const tarjetas: TarjetaResumen[] = [
    { titulo: "Inscriptos estimados", valor: String(est.cantidad), color: DORADO },
    { titulo: "Entra", valor: `+${formatARS(est.entra)}`, color: VERDE },
    { titulo: "Sale", valor: `-${formatARS(est.sale)}`, color: ROJO },
    {
      titulo: `Neto · ${est.veredicto}`,
      valor: `${est.neto < 0 ? "-" : "+"}${formatARS(Math.abs(est.neto))}`,
      color: est.neto < 0 ? ROJO_FUERTE : DORADO,
    },
  ]
  const yTarjetas = dibujarTarjetas(doc, tarjetas, 72, marginX, anchoPagina)

  const estiloTabla = crearEstiloTabla(doc, marginX)

  // --- Lo que entra -------------------------------------------------------
  dibujarTituloSeccion(doc, "Lo que entra", marginX, yTarjetas + 22)

  const filasEntra: string[][] = [
    [
      `Inscripciones que pagan (${cuantos(est.pagan)})`,
      `${est.pagan} × ${formatARS(datos.precioBase)}`,
      formatARS(est.entraInscripciones),
    ],
  ]

  if (est.gratisDescontados > 0) {
    filasEntra.push([
      `Inscripciones sin cargo (${cuantos(est.gratisDescontados)})`,
      "No pagan, pero cuentan en los gastos por persona",
      formatARS(0),
    ])
  } else if (datos.gratis > 0) {
    filasEntra.push([
      `Inscripciones sin cargo (${cuantos(datos.gratis)})`,
      "Calculado como si pagaran todos",
      "-",
    ])
  }

  if (datos.ingresosCobrados > 0) {
    filasEntra.push(["Otros ingresos ya cobrados", "Sponsors, donaciones, etc.", formatARS(datos.ingresosCobrados)])
  }
  if (datos.ingresosPorCobrar > 0) {
    filasEntra.push(["Otros ingresos por cobrar", "Comprometidos, todavía no entraron", formatARS(datos.ingresosPorCobrar)])
  }

  filasEntra.push(["TOTAL QUE ENTRA", "", formatARS(est.entra)])

  autoTable(doc, {
    ...estiloTabla,
    startY: yTarjetas + 30,
    head: [["Concepto", "Detalle", "Monto"]],
    body: filasEntra,
    columnStyles: { 2: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section !== "body") return
      const esTotal = data.row.index === filasEntra.length - 1
      if (esTotal) {
        data.cell.styles.textColor = DORADO
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 2) {
        data.cell.styles.textColor = VERDE
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 1) {
        data.cell.styles.textColor = TEXTO_GRIS
      }
    },
  })

  // --- Lo que sale --------------------------------------------------------
  const yEntra = yDespuesDeTabla(doc) + 22
  dibujarTituloSeccion(doc, "Lo que sale", marginX, yEntra)

  // Mismos gastos que la cuenta: aprobados y pendientes, sin los rechazados.
  const gastosVigentes = datos.gastos.filter((g) => g.estado !== "rechazado")
  const filasSale: string[][] = gastosVigentes.map((g) => {
    if (!g.porParticipante) return [g.descripcion, g.categoria, "Fijo", formatARS(g.monto)]
    const personas = personasDelGasto(g, est)
    const sinDiscapacidad = est.cantidad - personas
    return [
      g.descripcion,
      g.categoria,
      `${formatARS(g.monto)} × ${personas}${
        sinDiscapacidad > 0 ? ` (sin ${sinDiscapacidad} con discapacidad)` : ""
      }`,
      formatARS(g.monto * personas),
    ]
  })

  if (filasSale.length === 0) {
    filasSale.push(["Sin gastos cargados", "", "", formatARS(0)])
  }
  filasSale.push(["TOTAL QUE SALE", "", "", formatARS(est.sale)])

  autoTable(doc, {
    ...estiloTabla,
    startY: yEntra + 8,
    head: [["Gasto", "Categoría", "Cómo se calcula", "Monto"]],
    body: filasSale,
    columnStyles: { 3: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section !== "body") return
      const esTotal = data.row.index === filasSale.length - 1
      if (esTotal) {
        data.cell.styles.textColor = DORADO
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 3) {
        data.cell.styles.textColor = ROJO
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 2) {
        data.cell.styles.textColor = TEXTO_GRIS
      }
    },
  })

  // --- Resultado y criterios ---------------------------------------------
  const ySale = yDespuesDeTabla(doc) + 22
  dibujarTituloSeccion(doc, "Resultado", marginX, ySale)

  const filasResultado: string[][] = [
    ["Neto", `${est.neto < 0 ? "-" : "+"}${formatARS(Math.abs(est.neto))} · ${est.veredicto}`],
    ["Gastos fijos", formatARS(est.gastosFijos)],
    [
      "Gastos por persona",
      est.ahorroDiscapacidad > 0
        ? `${formatARS(est.montoPorParticipante)} × ${est.cantidad} - ${formatARS(
            est.ahorroDiscapacidad,
          )} del lugar de las personas con discapacidad = ${formatARS(est.gastosVariables)}`
        : `${formatARS(est.montoPorParticipante)} × ${est.cantidad} = ${formatARS(est.gastosVariables)}`,
    ],
    ["Cuesta cada inscripto", formatARS(est.costoPorPersona)],
    ["Precio que empata", formatARS(est.precioQueEmpata)],
    [
      "Inscripciones sin cargo",
      datos.gratis === 0
        ? "No hay cargadas"
        : datos.contarGratis
          ? `${cuantos(datos.gratis)}: se tuvieron en cuenta (no pagan, pero cuestan)`
          : `${cuantos(datos.gratis)}: NO se tuvieron en cuenta (se calculó como si pagaran)`,
    ],
    [
      "Personas con discapacidad",
      !datos.conDiscapacidad
        ? "No hay cargadas"
        : datos.contarDiscapacidad
          ? `${datos.conDiscapacidad}: se tuvieron en cuenta (no se paga por ellas el lugar; el resto sí)`
          : `${datos.conDiscapacidad}: NO se tuvieron en cuenta (se pagan todos los gastos por ellas)`,
    ],
    ["Gastos incluidos", "Aprobados y pendientes de aprobar (los rechazados quedan afuera)"],
  ]

  autoTable(doc, {
    ...estiloTabla,
    startY: ySale + 8,
    head: [["Dato", "Valor"]],
    body: filasResultado,
    didParseCell: (data) => {
      if (data.section !== "body") return
      if (data.row.index === 0) {
        data.cell.styles.textColor = est.neto < 0 ? ROJO_FUERTE : VERDE
        data.cell.styles.fontStyle = "bold"
      } else if (data.column.index === 1) {
        data.cell.styles.textColor = TEXTO_GRIS
      }
    },
  })

  // Aclaracion final: es una proyeccion, no la plata que hay.
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...TEXTO_GRIS)
  doc.text(
    "Proyección: supone que las inscripciones estimadas pagan el precio de lista. No es la plata que hay hoy en la cuenta.",
    marginX,
    yDespuesDeTabla(doc) + 16,
    { maxWidth: anchoPagina - marginX * 2 },
  )

  return {
    doc,
    nombreArchivo: `${NOMBRE_ARCHIVO_BASE}-${est.cantidad}-inscriptos-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`,
  }
}

/**
 * Genera y descarga el PDF de la estimacion para la cantidad proyectada.
 * `contarGratis` decide si las inscripciones sin cargo se descuentan de lo que
 * entra (no pagan, pero igual cuestan): el PDF lo deja escrito, para que un mes
 * despues se entienda con que criterio se hizo el numero.
 */
export async function exportarEstimacionPDF(datos: DatosEstimacionPDF): Promise<void> {
  const { doc, nombreArchivo } = await armarEstimacionPDF(datos)
  doc.save(nombreArchivo)
}
