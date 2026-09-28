"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { CheckCircle, XCircle, Trash2, Pencil } from "lucide-react"
import { esLocalhost, formatARS, mensajeError, parseMonto, totalGasto, type Gasto } from "./tipos"

interface GastoDetalleModalProps {
  gasto: Gasto | null
  onClose: () => void
  esAdmin: boolean
  confirmados: number
  userEmail: string
  getStatusBadge: (estado: string) => React.ReactNode
  onCambio: () => Promise<void>
}

export function GastoDetalleModal({
  gasto,
  onClose,
  esAdmin,
  confirmados,
  userEmail,
  getStatusBadge,
  onCambio,
}: GastoDetalleModalProps) {
  const { toast } = useToast()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [editando, setEditando] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [editDescripcion, setEditDescripcion] = useState("")
  const [editMonto, setEditMonto] = useState("")
  const [editPorParticipante, setEditPorParticipante] = useState(false)
  const [editCategoria, setEditCategoria] = useState("otro")

  const puedeEditar = esLocalhost()

  useEffect(() => {
    if (gasto) {
      setEditDescripcion(gasto.descripcion)
      setEditMonto(String(gasto.monto))
      setEditPorParticipante(gasto.porParticipante)
      setEditCategoria(gasto.categoria)
      setEditando(false)
    }
  }, [gasto])

  if (!gasto) return null

  const cerrarTodo = async () => {
    setConfirmarEliminar(false)
    setRechazando(false)
    setMotivoRechazo("")
    setEditando(false)
    onClose()
    await onCambio()
  }

  const handleGuardarEdicion = async () => {
    if (!editDescripcion || !editMonto) {
      toast({ title: "Error", description: "Completá descripción y monto", variant: "destructive" })
      return
    }
    setGuardandoEdicion(true)
    try {
      const { error } = await supabase
        .from("gastos")
        .update({
          descripcion: editDescripcion,
          monto: parseMonto(editMonto),
          por_participante: editPorParticipante,
          categoria: editCategoria,
        })
        .eq("id", gasto.id)
      if (error) throw error
      toast({ title: "Gasto actualizado" })
      await cerrarTodo()
    } catch (err) {
      console.error("Error editando gasto:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const handleAprobar = async () => {
    try {
      const { error } = await supabase
        .from("gastos")
        .update({
          estado: "aprobado",
          aprobado_por: userEmail,
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq("id", gasto.id)
      if (error) throw error
      toast({ title: "Gasto aprobado" })
      await cerrarTodo()
    } catch (err) {
      console.error("Error aprobando gasto:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  const handleRechazar = async () => {
    try {
      const { error } = await supabase
        .from("gastos")
        .update({
          estado: "rechazado",
          motivo_rechazo: motivoRechazo,
          aprobado_por: userEmail,
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq("id", gasto.id)
      if (error) throw error
      toast({ title: "Gasto rechazado" })
      await cerrarTodo()
    } catch (err) {
      console.error("Error rechazando gasto:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  const handleTogglePagado = async (nuevoPagado: boolean) => {
    try {
      const { error } = await supabase.from("gastos").update({ pagado: nuevoPagado }).eq("id", gasto.id)
      if (error) throw error
      toast({ title: nuevoPagado ? "Marcado como pagado" : "Marcado como sin pagar" })
      await cerrarTodo()
    } catch (err) {
      console.error("Error actualizando pago del gasto:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  const handleEliminar = async () => {
    try {
      const { error } = await supabase.from("gastos").delete().eq("id", gasto.id)
      if (error) throw error
      toast({ title: "Gasto eliminado" })
      await cerrarTodo()
    } catch (err) {
      console.error("Error eliminando gasto:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  const abrirComprobante = () => {
    const url = gasto.comprobante
    if (url && (url.startsWith("https://") || url.startsWith("data:"))) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="bg-gray-800 border-yellow-400/20 max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Detalle del Gasto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editando ? (
              <div className="space-y-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-xs text-blue-300">
                  Modo edición (solo disponible en localhost) — permite corregir gastos ya aprobados o rechazados.
                </p>
                <div>
                  <Label className="text-gray-300">Descripción *</Label>
                  <Input
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700/40 p-3">
                  <div>
                    <Label className="text-gray-200">Gasto por participante</Label>
                    <p className="text-xs text-gray-400">El monto se multiplica por la cantidad de inscriptos</p>
                  </div>
                  <Switch checked={editPorParticipante} onCheckedChange={setEditPorParticipante} />
                </div>
                <div>
                  <Label className="text-gray-300">
                    {editPorParticipante ? "Monto por persona (ARS) *" : "Monto total (ARS) *"}
                  </Label>
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
                      <SelectItem value="equipamiento">Equipamiento</SelectItem>
                      <SelectItem value="premios">Premios</SelectItem>
                      <SelectItem value="logística">Logística</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="alimentación">Alimentación</SelectItem>
                      <SelectItem value="lugar">Lugar / Predio</SelectItem>
                      <SelectItem value="seguro">Seguro</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setEditando(false)}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardarEdicion}
                    disabled={guardandoEdicion}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Descripción</Label>
                  <p className="text-white font-medium">{gasto.descripcion}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Total</Label>
                  <p className="text-white font-bold text-xl">
                    {formatARS(totalGasto(gasto, confirmados))}
                  </p>
                  {gasto.porParticipante && (
                    <p className="text-xs text-blue-400">
                      {formatARS(gasto.monto)} por persona × {confirmados} confirmados
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-400">Categoría</Label>
                  <p className="text-white capitalize">{gasto.categoria}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Estado</Label>
                  {getStatusBadge(gasto.estado)}
                </div>
                <div>
                  <Label className="text-gray-400">Creado por</Label>
                  <p className="text-white text-sm">{gasto.creadoPor}</p>
                  <p className="text-gray-500 text-xs capitalize">({gasto.rolCreador})</p>
                </div>
                <div>
                  <Label className="text-gray-400">Fecha</Label>
                  <p className="text-white text-sm">
                    {gasto.fecha ? new Date(gasto.fecha).toLocaleDateString("es-AR") : "N/A"}
                  </p>
                </div>
              </div>
            )}

            {!editando && esAdmin && gasto.estado === "aprobado" && (
              <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700/40 p-3">
                <div>
                  <Label className="text-gray-200">¿Ya se pagó?</Label>
                  <p className="text-xs text-gray-400">
                    Desmarcá si es un gasto aprobado que todavía no se abonó (se paga a último momento).
                  </p>
                </div>
                <Switch checked={gasto.pagado} onCheckedChange={handleTogglePagado} />
              </div>
            )}

            {!editando && gasto.comprobante && (
              <div>
                <Label className="text-gray-400">Comprobante</Label>
                <Button variant="link" className="text-yellow-400" onClick={abrirComprobante}>
                  Ver comprobante
                </Button>
              </div>
            )}

            {gasto.estado === "rechazado" && gasto.motivoRechazo && (
              <div>
                <Label className="text-gray-400">Motivo de Rechazo</Label>
                <p className="text-red-400">{gasto.motivoRechazo}</p>
              </div>
            )}
          </div>

          {!editando && (
            <DialogFooter className="flex flex-wrap gap-2">
              {esAdmin && gasto.estado === "pendiente" && (
                <>
                  <Button onClick={handleAprobar} className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button onClick={() => setRechazando(true)} variant="destructive">
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </>
              )}

              {puedeEditar && (
                <Button
                  onClick={() => setEditando(true)}
                  variant="outline"
                  className="border-blue-500 text-blue-400"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar (localhost)
                </Button>
              )}

              {esAdmin && (
                <Button
                  onClick={() => setConfirmarEliminar(true)}
                  variant="outline"
                  className="border-red-500 text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <Dialog open={confirmarEliminar} onOpenChange={() => setConfirmarEliminar(false)}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar eliminación</DialogTitle>
            <DialogDescription className="text-gray-400">
              ¿Estás seguro de que querés eliminar este gasto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmarEliminar(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminar}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Motivo de rechazo */}
      <Dialog
        open={rechazando}
        onOpenChange={() => {
          setRechazando(false)
          setMotivoRechazo("")
        }}
      >
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Rechazar gasto</DialogTitle>
            <DialogDescription className="text-gray-400">
              Indicá el motivo del rechazo (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRechazando(false)
                setMotivoRechazo("")
              }}
              className="border-gray-600 text-gray-300"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
