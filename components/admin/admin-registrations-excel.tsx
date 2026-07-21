"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Registration {
  id: string
  nombres?: string
  apellidos?: string
  dni?: string
  email?: string
  telefono?: string
  ciudad?: string
  estado?: string
  precio?: string
  grupoCiclistas?: string
  esCeliaco?: string
  grupoSanguineo?: string
  condicionSalud?: string
  telefonoEmergencia?: string
  fechaNacimiento?: string
  genero?: string
  localidad?: string
  categoria?: string
  recorrido?: string
  metodoPago?: string
  numeroReferencia?: string
  [key: string]: any
}

interface AdminRegistrationsExcelProps {
  registrations: Registration[]
}

export function AdminRegistrationsExcel({ registrations }: AdminRegistrationsExcelProps) {
  const exportToExcel = () => {
    // Preparar datos para Excel
    const dataToExport = registrations.map((reg) => ({
      Nombre: `${reg.nombres || ""} ${reg.apellidos || ""}`.trim(),
      DNI: reg.dni || "",
      Email: reg.email || "",
      Teléfono: reg.telefono || "",
      Ciudad: reg.ciudad || reg.localidad || "",
      Estado: reg.estado || "pendiente",
      Precio: reg.precio || "",
      "Grupo Ciclistas": reg.grupoCiclistas || "",
      "Es Celíaco": reg.esCeliaco || "",
      "Grupo Sanguíneo": reg.grupoSanguineo || "",
      "Condición Salud": reg.condicionSalud || "",
      "Tel. Emergencia": reg.telefonoEmergencia || "",
      "Fecha Nacimiento": reg.fechaNacimiento || "",
      Género: reg.genero || "",
      Categoría: reg.categoria || "",
      Recorrido: reg.recorrido || "",
      "Método Pago": reg.metodoPago || "",
      "Nº Referencia": reg.numeroReferencia || "",
    }))

    // Crear CSV
    const headers = Object.keys(dataToExport[0] || {})
    const csvContent = [
      headers.join(","),
      ...dataToExport.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row]
            const stringValue = String(value || "")
            return `"${stringValue.replace(/"/g, '""')}"` // Escapar comillas
          })
          .join(","),
      ),
    ].join("\n")

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `inscripciones-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button
      onClick={exportToExcel}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-zinc-800 border-yellow-400/20 text-yellow-400 hover:bg-zinc-700"
    >
      <Download className="w-4 h-4" />
      Exportar Excel
    </Button>
  )
}
