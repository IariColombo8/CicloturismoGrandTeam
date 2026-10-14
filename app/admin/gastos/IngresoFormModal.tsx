"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { claveBorrador, useBorradorFormulario } from "@/hooks/useBorradorFormulario"
import BannerBorrador from "@/components/admin/BannerBorrador"
import DialogoSalirSinGuardar from "@/components/admin/DialogoSalirSinGuardar"
import { mensajeError, parseMonto } from "./tipos"

interface BorradorIngreso {
  descripcion: string
  monto: string
  categoria: string
  yaCobrado: boolean
  notas: string
}

interface IngresoFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
  userRole: string
  onGuardado: () => Promise<void>
}

export function IngresoFormModal({
  open,
  onOpenChange,
  userEmail,
  userRole,
  onGuardado,
}: IngresoFormModalProps) {
  const { toast } = useToast()

  const [descripcion, setDescripcion] = useState("")
  const [monto, setMonto] = useState("")
  const [categoria, setCategoria] = useState("sponsor")
  const [yaCobrado, setYaCobrado] = useState(true)
  const [notas, setNotas] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)

  const limpiar = () => {
    setDescripcion("")
    setMonto("")
    setCategoria("sponsor")
    setYaCobrado(true)
    setNotas("")
    setComprobante(null)
  }

  // Borrador: cerrar el modal (o la pestaña) no borra lo que se estaba cargando.
  // El comprobante no se guarda: un archivo no entra en el localStorage.
  const datosBorrador = useMemo<BorradorIngreso>(
    () => ({ descripcion, monto, categoria, yaCobrado, notas }),
    [descripcion, monto, categoria, yaCobrado, notas],
  )
  const hayCambios =
    open &&
    (descripcion.trim() !== "" ||
      monto.trim() !== "" ||
      notas.trim() !== "" ||
      categoria !== "sponsor" ||
      !yaCobrado)

  const { borrador, guardarAhora, descartarBorrador, ocultarAviso } =
    useBorradorFormulario<BorradorIngreso>({
      clave: open ? claveBorrador("ingreso", "nuevo") : null,
      datos: open ? datosBorrador : null,
      hayCambios,
    })

  const retomarBorrador = () => {
    if (!borrador) return
    setDescripcion(borrador.datos.descripcion)
    setMonto(borrador.datos.monto)
    setCategoria(borrador.datos.categoria)
    setYaCobrado(borrador.datos.yaCobrado)
    setNotas(borrador.datos.notas)
    ocultarAviso()
  }

  const intentarCerrar = () => {
    if (guardando) return
    if (hayCambios) {
      setConfirmarSalida(true)
      return
    }
    onOpenChange(false)
  }

  const handleGuardar = async () => {
    const montoNumero = parseMonto(monto)
    if (!descripcion || !Number.isFinite(montoNumero) || montoNumero <= 0) {
      toast({
        title: "Error",
        description: "Ingresá una descripción y un monto mayor a cero",
        variant: "destructive",
      })
      return
    }

    setGuardando(true)
    try {
      let comprobanteUrl: string | null = null

      if (comprobante) {
        const filePath = `ingresos/${Date.now()}_${comprobante.name}`
        const { error: uploadError } = await supabase.storage
          .from("comprobantes")
          .upload(filePath, comprobante)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(filePath)
        comprobanteUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("ingresos").insert({
        evento_id: "2026",
        descripcion,
        monto: montoNumero,
        categoria,
        estado: yaCobrado ? "cobrado" : "por_cobrar",
        fecha: new Date().toISOString(),
        comprobante: comprobanteUrl,
        creado_por: userEmail,
        rol_creador: userRole,
        notas: notas || null,
      })
      if (error) throw error

      toast({
        title: "Ingreso registrado",
        description: yaCobrado ? "Se sumó al total de ingresos" : "Quedó marcado como por cobrar",
      })

      descartarBorrador()
      limpiar()
      onOpenChange(false)
      await onGuardado()
    } catch (err) {
      console.error("Error creando ingreso:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : intentarCerrar())}>
      <DialogContent
        className="bg-gray-800 border-green-500/30 max-w-[calc(100vw-2rem)] sm:max-w-lg"
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          intentarCerrar()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-green-400">Registrar Ingreso</DialogTitle>
          <DialogDescription className="text-gray-400">
            Sponsors, donaciones o cualquier otra plata que entra. Las inscripciones confirmadas se
            suman automáticamente.
          </DialogDescription>
        </DialogHeader>

        {borrador && (
          <BannerBorrador
            guardadoEn={borrador.guardadoEn}
            onRetomar={retomarBorrador}
            onDescartar={descartarBorrador}
            titulo="Tenias un ingreso a medio cargar"
          />
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Descripción *</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Sponsor Bicicletería López"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Monto (ARS) *</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="500000 o 500000,50"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Categoría *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
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

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700/40 p-3">
            <div>
              <Label className="text-gray-200">Ya está cobrado</Label>
              <p className="text-xs text-gray-400">
                Si está apagado se registra como comprometido pero no ingresado
              </p>
            </div>
            <Switch checked={yaCobrado} onCheckedChange={setYaCobrado} />
          </div>

          <div>
            <Label className="text-gray-300">Notas (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles del acuerdo, contacto, fecha de pago..."
              className="bg-gray-700 border-gray-600 text-white"
            />
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
          <Button variant="outline" onClick={intentarCerrar}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={guardando} className="bg-green-600 text-white hover:bg-green-700">
            Registrar Ingreso
          </Button>
        </DialogFooter>

        <DialogoSalirSinGuardar
          abierto={confirmarSalida}
          onSeguirEditando={() => setConfirmarSalida(false)}
          onGuardarYSalir={() => {
            guardarAhora()
            limpiar()
            setConfirmarSalida(false)
            onOpenChange(false)
          }}
          onDescartar={() => {
            descartarBorrador()
            limpiar()
            setConfirmarSalida(false)
            onOpenChange(false)
          }}
          descripcion="Tenes un ingreso a medio cargar. Podes guardarlo como borrador y completarlo despues."
        />
      </DialogContent>
    </Dialog>
  )
}
