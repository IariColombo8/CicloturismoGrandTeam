"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Users, CircleDollarSign } from "lucide-react"
import { Paginacion } from "./Paginacion"
import { formatARS, personasQuePagan, totalGasto, type Gasto } from "./tipos"

const PAGE_SIZE = 15

interface GastosTableProps {
  gastos: Gasto[]
  confirmados: number
  /** Confirmados con discapacidad (no pagan los gastos que no se les cobran). */
  conDiscapacidad?: number
  onView: (gasto: Gasto) => void
  /** Badge del estado del gasto: dice "Pagado" o "Por pagar". */
  getStatusBadge: (gasto: Gasto) => React.ReactNode
  onTogglePagado?: (gasto: Gasto) => void
}

export function GastosTable({
  gastos,
  confirmados,
  conDiscapacidad = 0,
  onView,
  getStatusBadge,
  onTogglePagado,
}: GastosTableProps) {
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
              <TableHead className="text-yellow-400 hidden sm:table-cell">Estado</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((gasto) => (
              <TableRow key={gasto.id} className="border-gray-700">
                <TableCell className="text-white font-medium whitespace-normal break-words max-w-[38vw] sm:max-w-none px-2 sm:px-4 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm break-words">{gasto.descripcion}</span>
                    {gasto.porParticipante && (
                      <Badge className="bg-blue-500/20 text-blue-400 whitespace-nowrap text-[10px]">
                        <Users className="w-3 h-3 mr-1" />
                        x persona
                      </Badge>
                    )}
                  </div>
                  <span className="block text-[10px] text-gray-500 capitalize sm:hidden">{gasto.categoria}</span>
                  {/* El badge ya dice "Pagado" o "Por pagar": antes había un
                      segundo badge "Aún no se pagó" que repetía lo mismo. */}
                  <span className="block sm:hidden mt-1">{getStatusBadge(gasto)}</span>
                </TableCell>
                <TableCell className="text-gray-400 capitalize hidden sm:table-cell">{gasto.categoria}</TableCell>
                <TableCell className="text-white font-bold text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 py-2">
                  {formatARS(totalGasto(gasto, confirmados, conDiscapacidad))}
                  {gasto.porParticipante && (
                    <span className="block text-[10px] sm:text-xs font-normal text-gray-500">
                      {formatARS(gasto.monto)} × {personasQuePagan(gasto, confirmados, conDiscapacidad)}
                      {personasQuePagan(gasto, confirmados, conDiscapacidad) < confirmados && (
                        <span className="block whitespace-normal">sin las personas con discapacidad</span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-gray-400 text-sm hidden md:table-cell">
                  {gasto.creadoPor}
                  <span className="block text-xs text-gray-500 capitalize">({gasto.rolCreador})</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{getStatusBadge(gasto)}</TableCell>
                <TableCell className="text-right px-1.5 sm:px-4 py-2">
                  <div className="flex justify-end gap-1 sm:gap-2">
                    {onTogglePagado && gasto.estado === "aprobado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={
                          gasto.pagado
                            ? "border-orange-500/50 text-orange-400 bg-transparent px-1.5 sm:px-3"
                            : "border-green-500/50 text-green-400 bg-transparent px-1.5 sm:px-3"
                        }
                        title={gasto.pagado ? "Marcar como por pagar" : "Marcar como pagado"}
                        onClick={() => onTogglePagado(gasto)}
                      >
                        <CircleDollarSign className="w-4 h-4 sm:hidden" />
                        <span className="hidden sm:inline">
                          {gasto.pagado ? "Marcar por pagar" : "Marcar pagado"}
                        </span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500/50 text-blue-400 bg-transparent px-1.5 sm:px-3"
                      onClick={() => onView(gasto)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
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
