"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

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
  [key: string]: any
}

interface AdminRegistrationsPdfProps {
  registrations: Registration[]
}

export function AdminRegistrationsPdf({ registrations }: AdminRegistrationsPdfProps) {
  const [isLoading, setIsLoading] = useState(false)

  const exportToPDF = async () => {
    setIsLoading(true)
    try {
      // Crear documento HTML con estilos
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Reporte de Inscripciones</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; background: white; }
              h1 { color: #000; border-bottom: 3px solid #fbbf24; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #000; color: #fbbf24; padding: 12px; text-align: left; font-weight: bold; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .status-confirmada { color: #10b981; font-weight: bold; }
              .status-pendiente { color: #f59e0b; font-weight: bold; }
              .status-rechazada { color: #ef4444; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>📋 Reporte de Inscripciones - Cicloturismo Grand Team</h1>
            <p>Fecha: ${new Date().toLocaleDateString("es-AR")}</p>
            <p>Total de inscripciones: ${registrations.length}</p>
            
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Grupo Ciclistas</th>
                  <th>Celíaco</th>
                </tr>
              </thead>
              <tbody>
                ${registrations
                  .map(
                    (reg) => `
                  <tr>
                    <td>${reg.nombres || ""} ${reg.apellidos || ""}</td>
                    <td>${reg.email || ""}</td>
                    <td>${reg.telefono || ""}</td>
                    <td>${reg.ciudad || reg.localidad || ""}</td>
                    <td class="status-${reg.estado || "pendiente"}">${(reg.estado || "pendiente").toUpperCase()}</td>
                    <td>${reg.grupoCiclistas || ""}</td>
                    <td>${reg.esCeliaco || ""}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Este reporte fue generado automáticamente por el sistema de inscripciones.</p>
              <p>Cicloturismo Grand Team Bike - CdelU</p>
            </div>
          </body>
        </html>
      `

      // Crear ventana para imprimir
      const printWindow = window.open("", "", "height=600,width=800")
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        // Esperar a que cargue y luego imprimir
        setTimeout(() => {
          printWindow.print()
          // Descomentar para cerrar automáticamente después de imprimir
          // printWindow.close()
        }, 250)
      }
    } catch (error) {
      console.error("Error al exportar PDF:", error)
      alert("Error al exportar PDF")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={exportToPDF}
      disabled={isLoading}
      size="sm"
      className="flex items-center gap-2 bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700"
      variant="outline"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Exportar PDF
        </>
      )}
    </Button>
  )
}
