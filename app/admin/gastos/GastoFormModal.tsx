"use client"

import { useState } from "react"
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
import { formatARS, mensajeError } from "./tipos"

interface GastoFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  esAdmin: boolean
  confirmados: number
  userEmail: string
  userRole: string
  onGuardado: () => Promise<void>
}

export function GastoFormModal({
  open,
  onOpenChange,
  esAdmin,
  confirmados,
  userEmail,
  userRole,
  onGuardado,
}: GastoFormModalProps) {
  const { toast } = useToast()

  const [descripcion, setDescripcion] = useState("")
  const [monto, setMonto] = useState("")
  const [porParticipante, setPorParticipante] = useState(false)
  const [categoria, setCategoria] = useState("equipamiento")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  const montoNumero = Number.parseFloat(monto)
  const previewTotal = Number.isFinite(montoNumero) ? montoNumero * confirmados : 0

  const limpiar = () => {
    setDescripcion("")
    setMonto("")
    setPorParticipante(false)
    setCategoria("equipamiento")
    setComprobante(null)
  }

  const handleGuardar = async () => {
    if (!descripcion || !monto) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setGuardando(true)
    try {
      let comprobanteUrl: string | null = null

      if (comprobante) {
        const filePath = `gastos/${Date.now()}_${comprobante.name}`
        const { error: uploadError } = await supabase.storage
          .from("comprobantes")
          .upload(filePath, comprobante)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(filePath)
        comprobanteUrl = urlData.publicUrl
      }

      const now = new Date().toISOString()
      const { error } = await supabase.from("gastos").insert({
        evento_id: "2026",
        descripcion,
        monto: Number.parseFloat(monto),
        por_participante: porParticipante,
        categoria,
        fecha: now,
        comprobante: comprobanteUrl,
        estado: esAdmin ? "aprobado" : "pendiente",
        creado_por: userEmail,
        rol_creador: userRole,
        aprobado_por: esAdmin ? userEmail : null,
        fecha_aprobacion: esAdmin ? now : null,
      })
      if (error) throw error

      toast({
        title: esAdmin ? "Gasto creado" : "Propuesta enviada",
        description: esAdmin
          ? "El gasto ha sido creado y aprobado automáticamente"
          : "Tu propuesta será revisada por un administrador",
      })

      limpiar()
      onOpenChange(false)
      await onGuardado()
    } catch (err) {
      console.error("Error creando gasto:", mensajeError(err), err)
      toast({
        title: "No se pudo crear el gasto",
        description: mensajeError(err),
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-yellow-400/20 max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">
            {esAdmin ? "Agregar Nuevo Gasto" : "Proponer Gasto"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {esAdmin
              ? "El gasto será aprobado automáticamente"
              : "Tu propuesta será revisada por un administrador"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Descripción *</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Lugar del evento"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700/40 p-3">
            <div>
              <Label className="text-gray-200">Gasto por participante</Label>
              <p className="text-xs text-gray-400">
                El monto se multiplica por la cantidad de inscriptos
              </p>
            </div>
            <Switch checked={porParticipante} onCheckedChange={setPorParticipante} />
          </div>

          <div>
            <Label className="text-gray-300">
              {porParticipante ? "Monto por persona (ARS) *" : "Monto total (ARS) *"}
            </Label>
            <Input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder={porParticipante ? "10000" : "40000"}
              className="bg-gray-700 border-gray-600 text-white"
            />
            {porParticipante && Number.isFinite(montoNumero) && montoNumero > 0 && (
              <p className="text-xs text-blue-400 mt-1">
                Total estimado hoy: {formatARS(montoNumero)} × {confirmados} confirmados ={" "}
                <strong>{formatARS(previewTotal)}</strong>
              </p>
            )}
          </div>

          <div>
            <Label className="text-gray-300">Categoría *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
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

          <div>
            <Label className="text-gray-300">Comprobante (opcional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setComprobante(e.target.files?.[0] || null)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black"
          >
            {esAdmin ? "Crear Gasto" : "Enviar Propuesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
