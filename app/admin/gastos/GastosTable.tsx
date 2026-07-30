"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Users } from "lucide-react"
import { Paginacion } from "./Paginacion"
import { formatARS, totalGasto, type Gasto } from "./tipos"

const PAGE_SIZE = 15

interface GastosTableProps {
  gastos: Gasto[]
  confirmados: number
  onView: (gasto: Gasto) => void
  getStatusBadge: (estado: string) => React.ReactNode
}

export function GastosTable({ gastos, confirmados, onView, getStatusBadge }: GastosTableProps) {
  const [page, setPage] = useState(1)
  const pageItems = gastos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (gastos.length === 0) {
    return <div className="text-center py-8 text-gray-400">No hay gastos en esta categoría</div>
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-gray-700 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-700">
            <TableRow>
              <TableHead className="text-yellow-400">Descripción</TableHead>
              <TableHead className="text-yellow-400 hidden sm:table-cell">Categoría</TableHead>
              <TableHead className="text-yellow-400">Total</TableHead>
              <TableHead className="text-yellow-400 hidden md:table-cell">Creado por</TableHead>
              <TableHead className="text-yellow-400">Estado</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((gasto) => (
              <TableRow key={gasto.id} className="border-gray-700">
                <TableCell className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <span>{gasto.descripcion}</span>
                    {gasto.porParticipante && (
                      <Badge className="bg-blue-500/20 text-blue-400 whitespace-nowrap">
                        <Users className="w-3 h-3 mr-1" />
                        x persona
                      </Badge>
                    )}
                  </div>
                  <span className="block text-xs text-gray-500 capitalize sm:hidden">{gasto.categoria}</span>
                </TableCell>
                <TableCell className="text-gray-400 capitalize hidden sm:table-cell">{gasto.categoria}</TableCell>
                <TableCell className="text-white font-bold">
                  {formatARS(totalGasto(gasto, confirmados))}
                  {gasto.porParticipante && (
                    <span className="block text-xs font-normal text-gray-500">
                      {formatARS(gasto.monto)} × {confirmados}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-gray-400 text-sm hidden md:table-cell">
                  {gasto.creadoPor}
                  <span className="block text-xs text-gray-500 capitalize">({gasto.rolCreador})</span>
                </TableCell>
                <TableCell>{getStatusBadge(gasto.estado)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/50 text-blue-400 bg-transparent"
                    onClick={() => onView(gasto)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginacion page={page} pageSize={PAGE_SIZE} total={gastos.length} onChange={setPage} />
    </div>
  )
}
