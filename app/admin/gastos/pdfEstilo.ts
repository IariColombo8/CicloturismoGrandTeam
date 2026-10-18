// Estetica compartida de los PDF de finanzas (el informe completo y la
// estimacion de inscriptos).
//
// La paleta esta calcada de la web (fondo negro/gris + acentos de color) para
// que el PDF se vea como una foto del panel en vez de una planilla gris de toda
// la vida. Vive aparte porque la usan dos informes: cuando estaba dentro de
// exportFinanzas.ts, el segundo PDF iba a terminar con su propia copia.
//
// jsPDF entra siempre por dynamic import (es una libreria pesada): aca solo se
// usa su tipo, que no arrastra codigo al bundle.

export type RGB = [number, number, number]

export const BG_PAGINA: RGB = [17, 24, 39] // gray-900
export const BG_TARJETA: RGB = [31, 41, 55] // gray-800
export const BG_FILA_PAR: RGB = [24, 32, 45] // levemente mas claro que el fondo
export const BORDE: RGB = [55, 65, 81] // gray-700
export const TEXTO_GRIS: RGB = [156, 163, 175] // gray-400
export const TEXTO_BLANCO: RGB = [229, 231, 235] // gray-200
export const DORADO: RGB = [250, 204, 21] // yellow-400
export const VERDE: RGB = [34, 197, 94] // green-500
export const ESMERALDA: RGB = [52, 211, 153] // emerald-400
export const ROJO: RGB = [248, 113, 113] // red-400
export const ROJO_FUERTE: RGB = [239, 68, 68] // red-500
export const NARANJA: RGB = [251, 146, 60] // orange-400

export interface TarjetaResumen {
  titulo: string
  valor: string
  color: RGB
}

/** Reduce el tamaño de fuente hasta que el texto entre en el ancho disponible. */
export function tamañoQueEntra(
  doc: import("jspdf").jsPDF,
  texto: string,
  anchoMax: number,
  inicial: number,
): number {
  let tamaño = inicial
  doc.setFontSize(tamaño)
  while (tamaño > 8 && doc.getTextWidth(texto) > anchoMax) {
    tamaño -= 1
    doc.setFontSize(tamaño)
  }
  return tamaño
}

/** Pinta el fondo oscuro de toda la página actual. */
export function pintarFondoPagina(doc: import("jspdf").jsPDF): void {
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  doc.setFillColor(...BG_PAGINA)
  doc.rect(0, 0, ancho, alto, "F")
}

/** Titulo del evento, bajada y fecha de generacion. Devuelve la Y de abajo. */
export function dibujarCabecera(
  doc: import("jspdf").jsPDF,
  bajada: string,
  marginX: number,
  anchoPagina: number,
): number {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...DORADO)
  doc.text("Grand Team Bike 2026", marginX, 42)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(...TEXTO_GRIS)
  doc.text(bajada, marginX, 58)

  doc.setFontSize(8)
  doc.text(`Generado el ${new Date().toLocaleString("es-AR")}`, anchoPagina - marginX, 42, {
    align: "right",
  })

  return 58
}

/** Dibuja las tarjetas del mini-dashboard, con acento de color como en la web. */
export function dibujarTarjetas(
  doc: import("jspdf").jsPDF,
  tarjetas: TarjetaResumen[],
  startY: number,
  marginX: number,
  anchoPagina: number,
): number {
  const gap = 10
  const columnas = Math.max(1, tarjetas.length)
  const cardWidth = (anchoPagina - marginX * 2 - gap * (columnas - 1)) / columnas
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

/** Titulo de una seccion ("Gastos", "Ingresos"). */
export function dibujarTituloSeccion(
  doc: import("jspdf").jsPDF,
  texto: string,
  marginX: number,
  y: number,
): void {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...DORADO)
  doc.text(texto, marginX, y)
}

/**
 * Estilo de las tablas, con el fondo oscuro repintado en cada pagina nueva que
 * agregue autoTable. La pagina 1 la pinta quien arma el PDF, porque la cabecera
 * se dibuja antes de que arranque la primera tabla.
 */
export function crearEstiloTabla(doc: import("jspdf").jsPDF, marginX: number) {
  let ultimaPaginaPintada = 1
  return {
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
}

/** Y donde termino la ultima tabla dibujada. */
export function yDespuesDeTabla(doc: import("jspdf").jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}
