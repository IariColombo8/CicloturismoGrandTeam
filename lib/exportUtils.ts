// Utilidades para exportar datos a Excel/CSV
export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) return

  // Convertir datos a CSV
  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escapar valores que contengan comas o comillas
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  // Crear blob y descargar
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const formatInscripcionForExport = (inscripcion: any) => {
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
    Estado: inscripcion.estado || "pendiente",
    "Fecha Inscripción": inscripcion.fechaInscripcion?.seconds
      ? new Date(inscripcion.fechaInscripcion.seconds * 1000).toLocaleDateString("es-AR")
      : "",
  }
}
