// Utilidades para exportar datos a CSV
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
    País: inscripcion.paisTelefono || "",
    Localidad: inscripcion.localidad || "",
    "Talle Remera": inscripcion.talleRemera || "",
    "Grupo Sanguíneo": inscripcion.grupoSanguineo || "",
    Alergias: inscripcion.tieneAlergias === "si" ? inscripcion.alergias : "No",
    "Condición de Salud": inscripcion.tieneProblemasSalud === "si" ? inscripcion.condicionSalud : "No",
    "Contacto Emergencia": `${inscripcion.nombreEmergencia || ""} - ${inscripcion.telefonoEmergencia || ""}`,
    "Método Pago": inscripcion.metodoPago || "",
    "N° Referencia": inscripcion.numeroReferencia || "",
    Estado: (inscripcion.estado as string) || "pendiente",
    "Fecha Inscripción": (inscripcion.fechaInscripcion as { seconds?: number })?.seconds
      ? new Date(((inscripcion.fechaInscripcion as { seconds: number }).seconds) * 1000).toLocaleDateString("es-AR")
      : "",
  }
}
