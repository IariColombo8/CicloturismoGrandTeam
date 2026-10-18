"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, List, TrendingDown, TrendingUp, Users } from "lucide-react"
import { Paginacion } from "./Paginacion"
import { ListaModal } from "./ListaModal"
import { CLASE_BADGE, estadoMovimiento, formatARS, type Gasto, type Movimiento } from "./tipos"

const PAGE_SIZE = 15

export type FiltroTipo = "todos" | "gasto" | "ingreso"
// Un gasto aprobado se filtra por "pagado" o "por_pagar": ver estadoGastoVisible.
export type FiltroEstado =
  | "todos"
  | "pagado"
  | "por_pagar"
  | "pendiente"
  | "rechazado"
  | "cobrado"
  | "por_cobrar"

interface MovimientosTableProps {
  movimientos: Movimiento[]
  onVerGasto: (gasto: Gasto) => void
  filtroTipo: FiltroTipo
  filtroEstado: FiltroEstado
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pagado: "Pagado",
  por_pagar: "Por pagar",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  cobrado: "Cobrado",
  por_cobrar: "Por cobrar",
  confirmado: "Confirmado",
}

/**
 * Badge de una fila. Los gastos aprobados dicen "Pagado" o "Por pagar" (que es
 * lo unico que cambia de uno a otro), los ingresos "Cobrado" o "Por cobrar".
 */
function badgeEstado(mov: Movimiento) {
  const estado = estadoMovimiento(mov)
  const texto = ETIQUETA_ESTADO[estado] || estado
  switch (estado) {
    case "pagado":
    case "cobrado":
    case "confirmado":
      return <Badge className={CLASE_BADGE.verde}>{texto}</Badge>
    case "por_pagar":
      return <Badge className={CLASE_BADGE.naranja}>{texto}</Badge>
    case "pendiente":
    case "por_cobrar":
      return <Badge className={CLASE_BADGE.amarillo}>{texto}</Badge>
    case "rechazado":
      return <Badge className={CLASE_BADGE.rojo}>{texto}</Badge>
    default:
      return <Badge>{texto}</Badge>
  }
}

/** Vista unificada de toda la plata del evento, filtrada por tipo y estado (controlado desde afuera). */
export function MovimientosTable({ movimientos, onVerGasto, filtroTipo, filtroEstado }: MovimientosTableProps) {
  const [page, setPage] = useState(1)
  // Lista de nombres de una fila calculada, cuando se toca "Ver".
  const [lista, setLista] = useState<{ titulo: string; items: string[] } | null>(null)

  const filtrados = useMemo(() => {
    return movimientos.filter((mov) => {
      const pasaTipo = filtroTipo === "todos" || mov.tipo === filtroTipo
      const pasaEstado = filtroEstado === "todos" || estadoMovimiento(mov) === filtroEstado
      return pasaTipo && pasaEstado
    })
  }, [movimientos, filtroTipo, filtroEstado])

  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="mt-2 space-y-2">
      {filtrados.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No hay movimientos con estos filtros</div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-700 overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-700">
                <TableRow>
                  <TableHead className="text-yellow-400">Concepto</TableHead>
                  <TableHead className="text-yellow-400 hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="text-yellow-400">Monto</TableHead>
                  <TableHead className="text-yellow-400 hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-yellow-400 hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="text-yellow-400 text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((mov) => (
                  <TableRow key={`${mov.tipo}-${mov.id}`} className="border-gray-700">
                    <TableCell className="text-white font-medium whitespace-normal break-words max-w-[40vw] sm:max-w-none px-2 sm:px-4 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {mov.tipo === "ingreso" ? (
                          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 shrink-0" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm break-words">{mov.descripcion}</span>
                        {mov.origen?.porParticipante && (
                          <Badge className="bg-blue-500/20 text-blue-400 whitespace-nowrap text-[10px]">
                            <Users className="w-3 h-3 mr-1" />x persona
                          </Badge>
                        )}
                      </div>
                      {mov.detalle && <span className="block text-[10px] sm:text-xs text-gray-500">{mov.detalle}</span>}
                      <span className="block text-[10px] text-gray-500 capitalize sm:hidden">{mov.categoria}</span>
                      <span className="block sm:hidden mt-1">{badgeEstado(mov)}</span>
                    </TableCell>
                    <TableCell className="text-gray-400 capitalize hidden sm:table-cell">{mov.categoria}</TableCell>
                    <TableCell
                      className={`font-bold whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4 py-2 ${mov.monto >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {mov.monto >= 0 ? "+" : "-"}
                      {formatARS(Math.abs(mov.monto))}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm hidden md:table-cell">
                      {mov.fecha ? new Date(mov.fecha).toLocaleDateString("es-AR") : "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{badgeEstado(mov)}</TableCell>
                    <TableCell className="text-right px-1 sm:px-4 py-2">
                      {mov.origen ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/50 text-blue-400 bg-transparent px-1.5 sm:px-2"
                          onClick={() => onVerGasto(mov.origen as Gasto)}
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      ) : (
                        mov.listado && (
                          <Button
                            size="sm"
                            variant="outline"
                            title={`Ver los ${mov.listado.items.length} inscriptos`}
                            className="border-blue-500/50 text-blue-400 bg-transparent px-1.5 sm:px-2"
                            onClick={() => setLista(mov.listado!)}
                          >
                            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Paginacion page={page} pageSize={PAGE_SIZE} total={filtrados.length} onChange={setPage} />
        </>
      )}

      <ListaModal
        abierto={lista !== null}
        onCerrar={() => setLista(null)}
        titulo={lista?.titulo || ""}
        descripcion={lista ? `${lista.items.length} inscriptos` : undefined}
        items={lista?.items || []}
      />
    </div>
  )
}
