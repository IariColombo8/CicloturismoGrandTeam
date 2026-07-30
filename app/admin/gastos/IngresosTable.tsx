"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, ExternalLink } from "lucide-react"
import { Paginacion } from "./Paginacion"
import { formatARS, type Ingreso } from "./tipos"

const PAGE_SIZE = 15

interface IngresosTableProps {
  ingresos: Ingreso[]
  puedeEliminar: boolean
  onEliminar: (id: string) => void
  onMarcarCobrado: (id: string) => void
}

function abrirComprobante(url: string | null) {
  if (url && (url.startsWith("https://") || url.startsWith("data:"))) {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

export function IngresosTable({ ingresos, puedeEliminar, onEliminar, onMarcarCobrado }: IngresosTableProps) {
  const [page, setPage] = useState(1)
  const pageItems = ingresos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (ingresos.length === 0) {
    return <div className="text-center py-8 text-gray-400">Todavía no hay ingresos registrados</div>
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-gray-700 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-700">
            <TableRow>
              <TableHead className="text-yellow-400">Descripción</TableHead>
              <TableHead className="text-yellow-400 hidden sm:table-cell">Categoría</TableHead>
              <TableHead className="text-yellow-400">Monto</TableHead>
              <TableHead className="text-yellow-400 hidden md:table-cell">Fecha</TableHead>
              <TableHead className="text-yellow-400">Estado</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((ingreso) => (
              <TableRow key={ingreso.id} className="border-gray-700">
                <TableCell className="text-white font-medium">
                  {ingreso.descripcion}
                  {ingreso.notas && <span className="block text-xs text-gray-500">{ingreso.notas}</span>}
                  <span className="block text-xs text-gray-500 capitalize sm:hidden">{ingreso.categoria}</span>
                </TableCell>
                <TableCell className="text-gray-400 capitalize hidden sm:table-cell">{ingreso.categoria}</TableCell>
                <TableCell className="text-green-400 font-bold">+{formatARS(ingreso.monto)}</TableCell>
                <TableCell className="text-gray-400 text-sm hidden md:table-cell">
                  {ingreso.fecha ? new Date(ingreso.fecha).toLocaleDateString("es-AR") : "N/A"}
                </TableCell>
                <TableCell>
                  {ingreso.estado === "cobrado" ? (
                    <Badge className="bg-green-500/20 text-green-500">Cobrado</Badge>
                  ) : (
                    <Badge className="bg-yellow-400/20 text-yellow-400">Por cobrar</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {ingreso.comprobante && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 text-blue-400 bg-transparent"
                        onClick={() => abrirComprobante(ingreso.comprobante)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {ingreso.estado === "por_cobrar" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 bg-transparent text-xs"
                        onClick={() => onMarcarCobrado(ingreso.id)}
                      >
                        Cobrar
                      </Button>
                    )}
                    {puedeEliminar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 bg-transparent"
                        onClick={() => onEliminar(ingreso.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginacion page={page} pageSize={PAGE_SIZE} total={ingresos.length} onChange={setPage} />
    </div>
  )
}
