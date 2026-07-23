"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  MapPin,
  Package,
  CreditCard,
  User,
  Tag,
  Mail,
  Maximize2,
  Info,
} from "lucide-react"
import { TALLES_DISPONIBLES, type RemeraItem } from "@/types/database"

interface RemeroFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LookupResult {
  participante: { nombre: string; telefono: string; estaRegistrado: boolean } | null
  remera: {
    items: RemeraItem[]
    envio_tipo: "retiro" | "envio"
    direccion: string | null
    estado: string
    comprobante_url: string | null
  } | null
}

export default function RemeroFormModal({ open, onOpenChange }: RemeroFormModalProps) {
  const { toast } = useToast()

  // Campos del formulario
  const [dni, setDni] = useState("")
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [items, setItems] = useState<RemeraItem[]>([{ talle: "M", cantidad: 1 }])
  const [envioTipo, setEnvioTipo] = useState<"retiro" | "envio">("retiro")
  const [direccion, setDireccion] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [aliasInfo, setAliasInfo] = useState("")
  const [precio, setPrecio] = useState("")
  const [tallesDisponibles, setTallesDisponibles] = useState<string[]>([...TALLES_DISPONIBLES])
  const [sizeChartImageUrl, setSizeChartImageUrl] = useState("")
  const [sizeChartOpen, setSizeChartOpen] = useState(false)

  // Estado de flujo
  const [estaRegistrado, setEstaRegistrado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [pedidoPrevio, setPedidoPrevio] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar alias de pago, precio y talles disponibles al abrir
  useEffect(() => {
    if (!open) return
    fetch("/api/remera/settings")
      .then((r) => r.json())
      .then((d) => {
        setAliasInfo(d.aliasInfo ?? "")
        setPrecio(d.price ?? "")
        setSizeChartImageUrl(d.sizeChartImageUrl ?? "")
        if (Array.isArray(d.talles) && d.talles.length > 0) setTallesDisponibles(d.talles)
      })
      .catch(() => {})
  }, [open])

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setDni("")
      setNombre("")
      setTelefono("")
      setEmail("")
      setItems([{ talle: "M", cantidad: 1 }])
      setEnvioTipo("retiro")
      setDireccion("")
      setComprobante(null)
      setEstaRegistrado(false)
      setBuscando(false)
      setEnviando(false)
      setExito(false)
      setPedidoPrevio(false)
    }
  }, [open])

  // Auto-lookup al detectar DNI completo (7-8 dígitos)
  const buscarPorDni = useCallback(async (valorDni: string) => {
    if (valorDni.length < 7 || valorDni.length > 8) return
    setBuscando(true)
    try {
      const res = await fetch(`/api/remera/lookup?dni=${valorDni}`)
      const data: LookupResult = await res.json()

      if (data.participante) {
        setNombre(data.participante.nombre)
        setTelefono(data.participante.telefono)
        setEstaRegistrado(true)
      }

      if (data.remera) {
        setPedidoPrevio(true)
        setItems(data.remera.items.length > 0 ? data.remera.items : [{ talle: "M", cantidad: 1 }])
        setEnvioTipo(data.remera.envio_tipo)
        setDireccion(data.remera.direccion ?? "")
        toast({
          title: "Ya tenés un pedido registrado",
          description: "Podés modificarlo y guardarlo de nuevo.",
        })
      }
    } catch {
      // Silencioso: si falla la búsqueda, el usuario completa manualmente
    } finally {
      setBuscando(false)
    }
  }, [toast])

  const handleDniChange = (value: string) => {
    const soloNumeros = value.replace(/\D/g, "").slice(0, 8)
    setDni(soloNumeros)

    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)

    if (soloNumeros.length >= 7) {
      lookupTimerRef.current = setTimeout(() => buscarPorDni(soloNumeros), 400)
    }
  }

  // Manejo de talles (sin límite: se puede pedir para varias personas/talles)
  const agregarTalle = () => {
    setItems((prev) => [...prev, { talle: tallesDisponibles[0] ?? "M", cantidad: 1 }])
  }

  const actualizarItem = (idx: number, campo: keyof RemeraItem, valor: string | number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, [campo]: valor } : item
      )
    )
  }

  const eliminarItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // Convertir archivo a base64
  const archivoABase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dni || dni.length < 7) {
      toast({ title: "DNI inválido", description: "Ingresá un DNI de 7 u 8 dígitos", variant: "destructive" })
      return
    }
    if (!nombre.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresá tu nombre completo", variant: "destructive" })
      return
    }
    if (!telefono.trim()) {
      toast({ title: "Teléfono requerido", description: "Ingresá tu teléfono de contacto", variant: "destructive" })
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Email inválido", description: "Ingresá un email válido", variant: "destructive" })
      return
    }
    if (items.length === 0) {
      toast({ title: "Seleccioná al menos un talle", variant: "destructive" })
      return
    }
    if (envioTipo === "envio" && !direccion.trim()) {
      toast({ title: "Dirección requerida para envío a domicilio", variant: "destructive" })
      return
    }
    if (!comprobante && !pedidoPrevio) {
      toast({ title: "Comprobante requerido", description: "Adjuntá el comprobante de pago", variant: "destructive" })
      return
    }

    setEnviando(true)

    try {
      let comprobante_base64: string | undefined
      let comprobante_mime: string | undefined
      let comprobante_extension: string | undefined

      if (comprobante) {
        comprobante_base64 = await archivoABase64(comprobante)
        comprobante_mime = comprobante.type
        const partes = comprobante.name.split(".")
        comprobante_extension = partes[partes.length - 1].toLowerCase()
      }

      const res = await fetch("/api/remera/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni,
          nombre,
          telefono,
          email,
          items,
          envio_tipo: envioTipo,
          direccion: envioTipo === "envio" ? direccion : undefined,
          estaRegistrado,
          comprobante_base64,
          comprobante_mime,
          comprobante_extension,
        }),
      })

      if (!res.ok) throw new Error("Error en el servidor")

      setExito(true)
    } catch {
      toast({
        title: "Error al enviar el pedido",
        description: "Intentá de nuevo en unos momentos.",
        variant: "destructive",
      })
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-900 border-yellow-400/20 text-white max-w-md">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle className="w-16 h-16 text-yellow-400" />
            <h2 className="text-2xl font-bold text-yellow-400">¡Pedido registrado!</h2>
            <p className="text-zinc-300">
              Tu pedido de remera fue enviado correctamente. El equipo se pondrá en contacto para coordinar la entrega.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="mt-2 bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-yellow-400/20 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 text-xl">
            {pedidoPrevio ? "Modificar pedido de remera" : "Pedir remera del evento"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Completá el formulario para registrar tu pedido. El pago se coordina por transferencia.
          </DialogDescription>
        </DialogHeader>

        {precio && (
          <div className="flex items-center gap-2 -mt-1 text-yellow-400 font-semibold">
            <Tag className="w-4 h-4" />
            Precio: {precio}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* DNI */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 flex items-center gap-2">
              <User className="w-4 h-4 text-yellow-400" />
              DNI
            </Label>
            <div className="relative">
              <Input
                value={dni}
                onChange={(e) => handleDniChange(e.target.value)}
                placeholder="12345678"
                inputMode="numeric"
                maxLength={8}
                required
                className="bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400"
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-yellow-400 animate-spin" />
              )}
            </div>
            {estaRegistrado && (
              <p className="text-xs text-green-400">✓ Participante registrado en el evento</p>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Nombre y apellido</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              readOnly={estaRegistrado}
              required
              className={`bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400 ${estaRegistrado ? "opacity-70 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Teléfono</Label>
            <Input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 9 3442 123456"
              readOnly={estaRegistrado}
              required
              className={`bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400 ${estaRegistrado ? "opacity-70 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-yellow-400" />
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400"
            />
          </div>

          {/* Talles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-yellow-400" />
                Talles
              </Label>
              {sizeChartImageUrl && (
                <button
                  type="button"
                  onClick={() => setSizeChartOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:underline"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Ver tabla de talles
                </button>
              )}
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select
                  value={item.talle}
                  onValueChange={(v) => actualizarItem(idx, "talle", v)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {tallesDisponibles.map((t) => (
                      <SelectItem key={t} value={t} className="text-white focus:bg-zinc-700">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                  className="w-20 bg-zinc-800 border-zinc-700 text-white text-center"
                />

                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarItem(idx)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarTalle}
              className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar talle
            </Button>
          </div>

          {/* Método de entrega */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-400" />
              Método de entrega
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEnvioTipo("retiro")}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  envioTipo === "retiro"
                    ? "bg-yellow-400/10 border-yellow-400 text-yellow-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                Retiro en evento
              </button>
              <button
                type="button"
                onClick={() => setEnvioTipo("envio")}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  envioTipo === "envio"
                    ? "bg-yellow-400/10 border-yellow-400 text-yellow-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                Envío a domicilio
              </button>
            </div>
          </div>

          {/* Dirección (solo para envío) */}
          {envioTipo === "envio" && (
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Dirección de entrega</Label>
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle 123, Piso 4, Dpto A, Ciudad"
                required
                className="bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400"
              />
              <p className="flex items-start gap-1.5 text-xs text-yellow-400/90">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                El envío tiene un costo adicional, nos vamos a contactar.
              </p>
            </div>
          )}

          {/* Datos de pago */}
          {aliasInfo && (
            <div className="rounded-lg bg-zinc-800/50 border border-yellow-400/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Datos de pago
              </p>
              <p className="text-sm text-zinc-300 whitespace-pre-line">{aliasInfo}</p>
            </div>
          )}

          {/* Comprobante */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Upload className="w-4 h-4 text-yellow-400" />
              Comprobante de pago{" "}
              <span className="text-zinc-500 text-xs">(JPG, PNG o PDF, máx 5 MB)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 5 * 1024 * 1024) {
                  toast({ title: "El archivo es demasiado grande (máx 5 MB)", variant: "destructive" })
                  return
                }
                setComprobante(file)
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed border-zinc-700 rounded-lg py-3 text-sm text-zinc-400 hover:border-yellow-400/50 hover:text-zinc-300 transition-colors"
            >
              {comprobante ? (
                <span className="text-green-400">✓ {comprobante.name}</span>
              ) : (
                "Click para adjuntar comprobante"
              )}
            </button>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={enviando}
            className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-semibold h-11"
          >
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando pedido...
              </>
            ) : pedidoPrevio ? (
              "Actualizar pedido"
            ) : (
              "Enviar pedido"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
      <DialogContent className="bg-zinc-900 border-yellow-400/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">Tabla de talles</DialogTitle>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sizeChartImageUrl}
          alt="Tabla de talles"
          className="w-full rounded-lg border border-zinc-700"
        />
      </DialogContent>
    </Dialog>
    </>
  )
}
