// Utilidades para exportar datos a CSV
import { formatDate } from "@/lib/format"
export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...data.map((row) =>
      headers
        .map((header) => escapeCSV(row[header]))
        .join(","),
    ),
  ].join("\n")

  // Agregar BOM para que Excel reconozca UTF-8
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Escapar valores para CSV (comas, comillas, saltos de línea)
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Mantener alias para compatibilidad
export const exportToExcel = exportToCSV

export const formatInscripcionForExport = (inscripcion: Record<string, unknown>) => {
  return {
    "N° Inscripción": inscripcion.numeroInscripcion || "",
    Nombre: inscripcion.nombre || "",
    Apellido: inscripcion.apellido || "",
    DNI: inscripcion.dni || "",
    Email: inscripcion.email || "",
    Teléfono: inscripcion.telefono || "",
    "Fecha Nacimiento": inscripcion.fechaNacimiento || "",
    País: inscripcion.pais || "",
    Localidad: inscripcion.localidad || "",
    "Grupo Ciclistas": inscripcion.grupoCiclistas || "Sin grupo",
    "Es Celíaco": inscripcion.esCeliaco === "si" || inscripcion.esCeliaco === true ? "Sí" : inscripcion.esCeliaco === "no" || inscripcion.esCeliaco === false ? "No" : "",
    "Grupo Sanguíneo": String(inscripcion.grupoSanguineo || "").toUpperCase(),
    Alergias: inscripcion.tieneAlergias === "si" ? inscripcion.alergias : "No",
    "Condición de Salud": inscripcion.tieneProblemasSalud === "si" ? inscripcion.condicionSalud : "No",
    "Contacto Emergencia": `${inscripcion.nombreEmergencia || ""} - ${inscripcion.telefonoEmergencia || ""}`,
    "Método Pago": inscripcion.metodoPago || "",
    "N° Referencia": inscripcion.numeroReferencia || "",
    Estado: (inscripcion.estado as string) || "pendiente",
    "Fecha Inscripción": formatDate(inscripcion.fechaInscripcion as string | null | undefined),
  }
}

/**
 * Exporta filas a un Excel de verdad (.xlsx), no a un CSV.
 * El CSV se abria con las columnas corridas o los acentos rotos segun la
 * configuracion regional de Excel. `xlsx` se carga recien al exportar.
 */
export const exportToXLSX = async (
  data: Record<string, unknown>[],
  filename: string,
  nombreHoja = "Hoja1",
) => {
  if (!data || data.length === 0) return
  const XLSX = await import("xlsx")
  const hoja = XLSX.utils.json_to_sheet(data)
  // Ancho de cada columna segun el texto mas largo (con tope), para que se lea sin estirar.
  const headers = Object.keys(data[0] || {})
  hoja["!cols"] = headers.map((h) => ({
    wch: Math.min(
      50,
      Math.max(h.length, ...data.map((fila) => String(fila[h] ?? "").length)) + 2,
    ),
  }))
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31))
  XLSX.writeFile(libro, `${filename}.xlsx`)
}

/** "1951-11-24" -> "24/11/1951", sin pasar por Date (que corre un dia por la zona horaria). */
export const fechaISOaAR = (fecha: unknown): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha ?? "").trim())
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(fecha ?? "")
}
