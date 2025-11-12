// Utilidades para exportar datos a Excel
export const exportToExcel = (data: any[], filename: string) => {
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
    "Nombre Completo": inscripcion.nombreCompleto,
    DNI: inscripcion.dni,
    Email: inscripcion.email,
    Teléfono: inscripcion.telefono,
    Localidad: inscripcion.localidad,
    "Grupo Sanguíneo": inscripcion.grupoSanguineo,
    "Grupo Ciclista": inscripcion.grupoCiclista || "N/A",
    "Contacto Emergencia": `${inscripcion.contactoEmergencia?.nombre} - ${inscripcion.contactoEmergencia?.telefono}`,
    Estado: inscripcion.estado,
    "Fecha Inscripción": new Date(inscripcion.fechaInscripcion?.seconds * 1000).toLocaleDateString("es-AR"),
  }
}
