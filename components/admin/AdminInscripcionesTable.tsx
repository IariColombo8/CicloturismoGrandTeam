"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, CheckCircle, XCircle, Download, Search, Filter, Clock } from "lucide-react"

interface Inscripcion {
  id: string
  nombreCompleto: string
  email: string
  telefono: string
  localidad: string
  estado: "pendiente" | "confirmada" | "rechazada"
  fechaInscripcion: Date
  grupoCiclistas?: string
  dni?: string
}

interface AdminInscripcionesTableProps {
  inscripciones: Inscripcion[]
  onViewDetails: (inscripcion: Inscripcion) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onExport: () => void
}

export default function AdminInscripcionesTable({
  inscripciones,
  onViewDetails,
  onApprove,
  onReject,
  onExport
}: AdminInscripcionesTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredInscripciones = inscripciones.filter(insc => {
    const matchesSearch = 
      insc.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insc.telefono?.includes(searchTerm) ||
      insc.dni?.includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || insc.estado === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (estado: string) => {
    const badges = {
      pendiente: (
        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>
      ),
      confirmada: (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmada
        </Badge>
      ),
      rechazada: (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Rechazada
        </Badge>
      )
    }
    return badges[estado] || badges.pendiente
  }

  if (inscripciones.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-gray-500">No hay inscripciones registradas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email, teléfono, DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="rechazada">Rechazada</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={onExport}
          variant="outline"
          className="border-green-500/50 text-green-600 hover:bg-green-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar ({filteredInscripciones.length})
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredInscripciones.length} de {inscripciones.length} inscripciones
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">Nombre</th>
              <th className="text-left p-4 font-semibold text-sm hidden md:table-cell">Email</th>
              <th className="text-left p-4 font-semibold text-sm hidden md:table-cell">Teléfono</th>
              <th className="text-left p-4 font-semibold text-sm hidden lg:table-cell">Localidad</th>
              <th className="text-left p-4 font-semibold text-sm">Estado</th>
              <th className="text-right p-4 font-semibold text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInscripciones.map((inscripcion) => (
              <tr
                key={inscripcion.id}
                className="hover:bg-gray-50 border-b transition-colors"
              >
                <td className="p-4">
                  <div>
                    <div className="font-medium">{inscripcion.nombreCompleto}</div>
                    <div className="md:hidden text-xs text-gray-500 mt-1">
                      {inscripcion.email}
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell text-gray-600 text-sm">
                  {inscripcion.email}
                </td>
                <td className="p-4 hidden md:table-cell text-gray-600 text-sm">
                  {inscripcion.telefono}
                </td>
                <td className="p-4 hidden lg:table-cell text-gray-600 text-sm">
                  {inscripcion.localidad}
                </td>
                <td className="p-4">
                  {getStatusBadge(inscripcion.estado)}
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                      onClick={() => onViewDetails(inscripcion)}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Ver</span>
                    </Button>
                    {inscripcion.estado === "pendiente" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                          onClick={() => onApprove(inscripcion.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          onClick={() => onReject(inscripcion.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInscripciones.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron inscripciones con los filtros aplicados
        </div>
      )}
    </div>
  )
}