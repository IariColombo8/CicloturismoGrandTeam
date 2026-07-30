"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, Pencil, RotateCcw, X } from "lucide-react"
import { Paginacion } from "./Paginacion"
import { formatARS, montoEfectivo, type InscripcionPago } from "./tipos"

const PAGE_SIZE = 15

interface PagosTableProps {
  inscripciones: InscripcionPago[]
  precioBase: number
  puedeEditar: boolean
  onGuardar: (id: string, montoPagado: number | null) => Promise<void>
  mensajeVacio: string
}

/** Listado de inscriptos con el monto que abonó cada uno, editable por admin. */
export function PagosTable({
  inscripciones,
  precioBase,
  puedeEditar,
  onGuardar,
  mensajeVacio,
}: PagosTableProps) {
  const [page, setPage] = useState(1)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [valorEdicion, setValorEdicion] = useState("")
  const [guardando, setGuardando] = useState(false)

  const pageItems = inscripciones.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (inscripciones.length === 0) {
    return <div className="text-center py-8 text-gray-400">{mensajeVacio}</div>
  }

  const iniciarEdicion = (inscripcion: InscripcionPago) => {
    setEditandoId(inscripcion.id)
    setValorEdicion(String(montoEfectivo(inscripcion, precioBase)))
  }

  const guardar = async (id: string, monto: number | null) => {
    setGuardando(true)
    try {
      await onGuardar(id, monto)
      setEditandoId(null)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-gray-700 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-700">
            <TableRow>
              <TableHead className="text-yellow-400">Inscripto</TableHead>
              <TableHead className="text-yellow-400 hidden sm:table-cell">DNI</TableHead>
              <TableHead className="text-yellow-400">Pagó</TableHead>
              <TableHead className="text-yellow-400 hidden md:table-cell">Diferencia</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((insc) => {
              const pagado = montoEfectivo(insc, precioBase)
              const diferencia = pagado - precioBase
              const enEdicion = editandoId === insc.id

              return (
                <TableRow key={insc.id} className="border-gray-700">
                  <TableCell className="text-white font-medium">
                    {insc.nombre} {insc.apellido}
                    <span className="block text-xs text-gray-500 sm:hidden">DNI {insc.dni || "-"}</span>
                  </TableCell>
                  <TableCell className="text-gray-400 hidden sm:table-cell">{insc.dni || "-"}</TableCell>
                  <TableCell>
                    {enEdicion ? (
                      <Input
                        type="number"
                        value={valorEdicion}
                        onChange={(e) => setValorEdicion(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white h-8 w-28"
                      />
                    ) : (
                      <span className={diferencia === 0 ? "text-white font-bold" : "text-orange-400 font-bold"}>
                        {formatARS(pagado)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {diferencia === 0 ? (
                      <Badge className="bg-green-500/20 text-green-500">Completo</Badge>
                    ) : (
                      <Badge className={diferencia < 0 ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}>
                        {diferencia > 0 ? "+" : "-"}
                        {formatARS(Math.abs(diferencia))}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!puedeEditar ? null : enEdicion ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={guardando}
                          className="border-green-500/50 text-green-400 bg-transparent"
                          onClick={() => {
                            const numero = Number.parseFloat(valorEdicion)
                            if (Number.isFinite(numero) && numero >= 0) guardar(insc.id, numero)
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={guardando}
                          className="border-gray-600 text-gray-300 bg-transparent"
                          onClick={() => setEditandoId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/50 text-blue-400 bg-transparent"
                          onClick={() => iniciarEdicion(insc)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {insc.montoPagado !== null && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Volver al precio base"
                            className="border-gray-600 text-gray-300 bg-transparent"
                            onClick={() => guardar(insc.id, null)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Paginacion page={page} pageSize={PAGE_SIZE} total={inscripciones.length} onChange={setPage} />
    </div>
  )
}
