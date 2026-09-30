"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, ExternalLink, Pencil } from "lucide-react"
import { Paginacion } from "./Paginacion"
import { esLocalhost, formatARS, mensajeError, parseMonto, type Ingreso } from "./tipos"

const PAGE_SIZE = 15

interface IngresosTableProps {
  ingresos: Ingreso[]
  puedeEliminar: boolean
  onEliminar: (id: string) => void
  onMarcarCobrado: (id: string) => void
  onGuardado?: () => Promise<void>
}

function abrirComprobante(url: string | null) {
  if (url && (url.startsWith("https://") || url.startsWith("data:"))) {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

export function IngresosTable({ ingresos, puedeEliminar, onEliminar, onMarcarCobrado, onGuardado }: IngresosTableProps) {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [editando, setEditando] = useState<Ingreso | null>(null)
  const [editDescripcion, setEditDescripcion] = useState("")
  const [editMonto, setEditMonto] = useState("")
  const [editCategoria, setEditCategoria] = useState("otro")
  const [editNotas, setEditNotas] = useState("")
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const puedeEditar = esLocalhost()
  const pageItems = ingresos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const abrirEdicion = (ingreso: Ingreso) => {
    setEditando(ingreso)
    setEditDescripcion(ingreso.descripcion)
    setEditMonto(String(ingreso.monto))
    setEditCategoria(ingreso.categoria)
    setEditNotas(ingreso.notas || "")
  }

  const cerrarEdicion = () => setEditando(null)

  const handleGuardarEdicion = async () => {
    if (!editando) return
    const montoNumero = parseMonto(editMonto)
    if (!editDescripcion || !Number.isFinite(montoNumero) || montoNumero <= 0) {
      toast({ title: "Error", description: "Completá descripción y un monto mayor a cero", variant: "destructive" })
      return
    }
    setGuardandoEdicion(true)
    try {
      const { error } = await supabase
        .from("ingresos")
        .update({
          descripcion: editDescripcion,
          monto: montoNumero,
          categoria: editCategoria,
          notas: editNotas || null,
        })
        .eq("id", editando.id)
      if (error) throw error
      toast({ title: "Ingreso actualizado" })
      cerrarEdicion()
      if (onGuardado) await onGuardado()
    } catch (err) {
      console.error("Error editando ingreso:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    } finally {
      setGuardandoEdicion(false)
    }
  }

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
              <TableHead className="text-yellow-400 hidden sm:table-cell">Estado</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((ingreso) => (
              <TableRow key={ingreso.id} className="border-gray-700">
                <TableCell className="text-white font-medium whitespace-normal break-words max-w-[38vw] sm:max-w-none text-xs sm:text-sm px-2 sm:px-4 py-2">
                  {ingreso.descripcion}
                  {ingreso.notas && <span className="block text-[10px] sm:text-xs text-gray-500">{ingreso.notas}</span>}
                  <span className="block text-[10px] text-gray-500 capitalize sm:hidden">{ingreso.categoria}</span>
                  <span className="block sm:hidden mt-1">
                    {ingreso.estado === "cobrado" ? (
                      <Badge className="bg-green-500/20 text-green-500 text-[10px]">Cobrado</Badge>
                    ) : (
                      <Badge className="bg-yellow-400/20 text-yellow-400 text-[10px]">Por cobrar</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-gray-400 capitalize hidden sm:table-cell">{ingreso.categoria}</TableCell>
                <TableCell className="text-green-400 font-bold text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 py-2">
                  +{formatARS(ingreso.monto)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm hidden md:table-cell">
                  {ingreso.fecha ? new Date(ingreso.fecha).toLocaleDateString("es-AR") : "N/A"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {ingreso.estado === "cobrado" ? (
                    <Badge className="bg-green-500/20 text-green-500">Cobrado</Badge>
                  ) : (
                    <Badge className="bg-yellow-400/20 text-yellow-400">Por cobrar</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right px-1.5 sm:px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {ingreso.comprobante && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 text-blue-400 bg-transparent px-1.5 sm:px-3"
                        onClick={() => abrirComprobante(ingreso.comprobante)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {ingreso.estado === "por_cobrar" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 bg-transparent text-xs px-1.5 sm:px-3"
                        onClick={() => onMarcarCobrado(ingreso.id)}
                      >
                        Cobrar
                      </Button>
                    )}
                    {puedeEditar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 text-blue-400 bg-transparent px-1.5 sm:px-3"
                        onClick={() => abrirEdicion(ingreso)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {puedeEliminar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 bg-transparent px-1.5 sm:px-3"
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

      {/* Edición (solo localhost) */}
      <Dialog open={editando !== null} onOpenChange={(open) => !open && cerrarEdicion()}>
        <DialogContent className="bg-gray-800 border-blue-500/30 max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Editar Ingreso</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modo edición (solo disponible en localhost) — permite corregir un ingreso ya registrado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Descripción *</Label>
              <Input
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Monto (ARS) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={editMonto}
                onChange={(e) => setEditMonto(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Categoría *</Label>
              <Select value={editCategoria} onValueChange={setEditCategoria}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="donacion">Donación</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="remera">Remeras</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Notas (opcional)</Label>
              <Textarea
                value={editNotas}
                onChange={(e) => setEditNotas(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cerrarEdicion} className="border-gray-600 text-gray-300">
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarEdicion}
              disabled={guardandoEdicion}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
