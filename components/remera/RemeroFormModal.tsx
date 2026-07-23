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
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Save,
} from "lucide-react"
import { TALLES_DISPONIBLES, type RemeraItem } from "@/types/database"

interface RemeroFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GeneroRemera = "hombre" | "mujer"
type RemeraItemConGenero = RemeraItem & { genero: GeneroRemera }
type RemeraItemPersistido = RemeraItem & { genero?: GeneroRemera }

interface LookupResult {
  participante: {
    nombre: string
    telefono: string
    email: string
    estaRegistrado: boolean
  } | null
  remera: {
    items: RemeraItemPersistido[]
    envio_tipo: "retiro" | "envio"
    direccion: string | null
    email: string | null
    estado: string
    comprobante_url: string | null
  } | null
}

interface RemeraDraft {
  version: 1
  updatedAt: number
  step: number
  dni: string
  nombre: string
  telefono: string
  email: string
  items: RemeraItemPersistido[]
  envioTipo: "retiro" | "envio"
  direccion: string
  estaRegistrado: boolean
  pedidoPrevio: boolean
  hadComprobante: boolean
}

const DRAFT_KEY = "grand-team-remera-draft-v1"
const DRAFT_MAX_AGE = 30 * 24 * 60 * 60 * 1000
const TOTAL_STEPS = 4

const INITIAL_ITEMS: RemeraItemConGenero[] = [
  { genero: "hombre", talle: "M", cantidad: 1 },
]

function normalizarItems(
  items: RemeraItemPersistido[] | null | undefined,
): RemeraItemConGenero[] {
  if (!items?.length) return INITIAL_ITEMS

  return items.map((item) => ({
    ...item,
    genero: item.genero === "mujer" ? "mujer" : "hombre",
  }))
}

function etiquetaGenero(genero: GeneroRemera) {
  return genero === "mujer" ? "Mujer" : "Hombre"
}

function clampStep(step: number) {
  return Math.min(TOTAL_STEPS, Math.max(1, Math.trunc(step || 1)))
}

function formatDraftDate(timestamp: number) {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, "0")
  const month = date.toLocaleDateString("es-AR", { month: "long" })
  const time = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${day}-${month} a las ${time}`
}

function isMeaningfulDraft(draft: RemeraDraft) {
  return Boolean(
    draft.dni ||
      draft.nombre ||
      draft.telefono ||
      draft.email ||
      draft.direccion ||
      draft.step > 1 ||
      draft.items.length > 1 ||
      draft.items[0]?.talle !== "M" ||
      draft.items[0]?.cantidad !== 1,
  )
}

export default function RemeroFormModal({ open, onOpenChange }: RemeroFormModalProps) {
  const { toast } = useToast()

  const [dni, setDni] = useState("")
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [items, setItems] = useState<RemeraItemConGenero[]>(INITIAL_ITEMS)
  const [envioTipo, setEnvioTipo] = useState<"retiro" | "envio">("retiro")
  const [direccion, setDireccion] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [aliasInfo, setAliasInfo] = useState("")
  const [precio, setPrecio] = useState("")
  const [tallesDisponibles, setTallesDisponibles] = useState<string[]>([...TALLES_DISPONIBLES])
  const [sizeChartImageUrl, setSizeChartImageUrl] = useState("")
  const [sizeChartOpen, setSizeChartOpen] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [draftCandidate, setDraftCandidate] = useState<RemeraDraft | null>(null)
  const [draftDecisionMade, setDraftDecisionMade] = useState(false)
  const [estaRegistrado, setEstaRegistrado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [pedidoPrevio, setPedidoPrevio] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = useCallback(() => {
    setDni("")
    setNombre("")
    setTelefono("")
    setEmail("")
    setItems(INITIAL_ITEMS)
    setEnvioTipo("retiro")
    setDireccion("")
    setComprobante(null)
    setCurrentStep(1)
    setEstaRegistrado(false)
    setBuscando(false)
    setEnviando(false)
    setExito(false)
    setPedidoPrevio(false)
  }, [])

  useEffect(() => {
    if (!open) return

    fetch("/api/remera/settings")
      .then((response) => response.json())
      .then((data) => {
        setAliasInfo(data.aliasInfo ?? "")
        setPrecio(data.price ?? "")
        setSizeChartImageUrl(data.sizeChartImageUrl ?? "")
        if (Array.isArray(data.talles) && data.talles.length > 0) {
          setTallesDisponibles(data.talles)
        }
      })
      .catch(() => {})

    try {
      const stored = window.localStorage.getItem(DRAFT_KEY)
      if (!stored) {
        setDraftCandidate(null)
        setDraftDecisionMade(true)
        return
      }

      const parsed = JSON.parse(stored) as RemeraDraft
      const isValid =
        parsed?.version === 1 &&
        typeof parsed.updatedAt === "number" &&
        Date.now() - parsed.updatedAt <= DRAFT_MAX_AGE &&
        Array.isArray(parsed.items)

      if (!isValid || !isMeaningfulDraft(parsed)) {
        window.localStorage.removeItem(DRAFT_KEY)
        setDraftCandidate(null)
        setDraftDecisionMade(true)
        return
      }

      setDraftCandidate(parsed)
      setDraftDecisionMade(false)
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
      setDraftCandidate(null)
      setDraftDecisionMade(true)
    }
  }, [open])

  useEffect(() => {
    if (open) return
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)
    resetForm()
    setDraftCandidate(null)
    setDraftDecisionMade(false)
  }, [open, resetForm])

  useEffect(() => {
    if (!open || !draftDecisionMade || exito) return

    const draft: RemeraDraft = {
      version: 1,
      updatedAt: Date.now(),
      step: currentStep,
      dni,
      nombre,
      telefono,
      email,
      items,
      envioTipo,
      direccion,
      estaRegistrado,
      pedidoPrevio,
      hadComprobante: Boolean(comprobante),
    }

    const timer = window.setTimeout(() => {
      if (isMeaningfulDraft(draft)) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } else {
        window.localStorage.removeItem(DRAFT_KEY)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [
    open,
    draftDecisionMade,
    exito,
    currentStep,
    dni,
    nombre,
    telefono,
    email,
    items,
    envioTipo,
    direccion,
    estaRegistrado,
    pedidoPrevio,
    comprobante,
  ])

  const empezarDeCero = () => {
    window.localStorage.removeItem(DRAFT_KEY)
    resetForm()
    setDraftCandidate(null)
    setDraftDecisionMade(true)
  }

  const retomarDraft = () => {
    if (!draftCandidate) return

    setDni(draftCandidate.dni ?? "")
    setNombre(draftCandidate.nombre ?? "")
    setTelefono(draftCandidate.telefono ?? "")
    setEmail(draftCandidate.email ?? "")
    setItems(normalizarItems(draftCandidate.items))
    setEnvioTipo(draftCandidate.envioTipo === "envio" ? "envio" : "retiro")
    setDireccion(draftCandidate.direccion ?? "")
    setEstaRegistrado(Boolean(draftCandidate.estaRegistrado))
    setPedidoPrevio(Boolean(draftCandidate.pedidoPrevio))
    setCurrentStep(clampStep(draftCandidate.step))
    setComprobante(null)
    setDraftCandidate(null)
    setDraftDecisionMade(true)

    if (draftCandidate.hadComprobante && !draftCandidate.pedidoPrevio) {
      toast({
        title: "Volvimos a cargar tu avance",
        description: "Por seguridad, tenés que volver a adjuntar el comprobante.",
      })
    }
  }

  const buscarPorDni = useCallback(
    async (valorDni: string) => {
      if (valorDni.length < 7 || valorDni.length > 8) return
      setBuscando(true)

      try {
        const response = await fetch(`/api/remera/lookup?dni=${valorDni}`)
        if (!response.ok) return

        const data: LookupResult = await response.json()

        setEstaRegistrado(Boolean(data.participante))
        setPedidoPrevio(Boolean(data.remera))

        if (data.participante) {
          setNombre(data.participante.nombre)
          setTelefono(data.participante.telefono)
          if (data.participante.email) setEmail(data.participante.email)
        }

        if (data.remera) {
          setItems(normalizarItems(data.remera.items))
          setEnvioTipo(data.remera.envio_tipo)
          setDireccion(data.remera.direccion ?? "")
          if (data.remera.email) setEmail(data.remera.email)
          toast({
            title: "Ya tenés un pedido registrado",
            description: "Podés modificarlo y guardarlo nuevamente.",
          })
        }
      } catch {
        // Si falla el lookup, el usuario puede continuar completando manualmente.
      } finally {
        setBuscando(false)
      }
    },
    [toast],
  )

  const handleDniChange = (value: string) => {
    const soloNumeros = value.replace(/\D/g, "").slice(0, 8)
    setDni(soloNumeros)
    setEstaRegistrado(false)
    setPedidoPrevio(false)

    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)
    if (soloNumeros.length >= 7) {
      lookupTimerRef.current = setTimeout(() => buscarPorDni(soloNumeros), 400)
    }
  }

  const agregarTalle = () => {
    setItems((previous) => [
      ...previous,
      { genero: "hombre", talle: tallesDisponibles[0] ?? "M", cantidad: 1 },
    ])
  }

  const actualizarItem = (
    index: number,
    field: keyof RemeraItemConGenero,
    value: string | number,
  ) => {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  const eliminarItem = (index: number) => {
    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
  }

  const archivoABase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!/^\d{7,8}$/.test(dni)) {
        toast({
          title: "DNI inválido",
          description: "Ingresá un DNI de 7 u 8 dígitos.",
          variant: "destructive",
        })
        return false
      }
      if (!nombre.trim()) {
        toast({ title: "Ingresá tu nombre y apellido", variant: "destructive" })
        return false
      }
      if (!telefono.trim()) {
        toast({ title: "Ingresá tu teléfono", variant: "destructive" })
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        toast({ title: "Ingresá un email válido", variant: "destructive" })
        return false
      }
    }

    if (step === 2) {
      if (
        items.length === 0 ||
        items.some(
          (item) =>
            !item.talle ||
            item.cantidad < 1 ||
            !["hombre", "mujer"].includes(item.genero),
        )
      ) {
        toast({ title: "Revisá los talles y cantidades", variant: "destructive" })
        return false
      }
      if (envioTipo === "envio" && !direccion.trim()) {
        toast({ title: "Ingresá la dirección de entrega", variant: "destructive" })
        return false
      }
    }

    if (step === 3 && !comprobante && !pedidoPrevio) {
      toast({
        title: "Comprobante requerido",
        description: "Adjuntá el comprobante antes de continuar.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const avanzarPaso = () => {
    if (!validateStep(currentStep)) return
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1))
  }

  const volverPaso = () => {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  const handleSubmit = async () => {
    if (![1, 2, 3].every(validateStep)) return

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

      const response = await fetch("/api/remera/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: dni.trim(),
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim().toLowerCase(),
          items,
          envio_tipo: envioTipo,
          direccion: envioTipo === "envio" ? direccion.trim() : "",
          estaRegistrado,
          comprobante_base64,
          comprobante_mime,
          comprobante_extension,
        }),
      })

      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo registrar el pedido")
      }

      window.localStorage.removeItem(DRAFT_KEY)
      setExito(true)
    } catch (error) {
      toast({
        title: "Error al enviar el pedido",
        description:
          error instanceof Error ? error.message : "Intentá de nuevo en unos momentos.",
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
              Tu pedido y tu email quedaron registrados correctamente. El equipo se pondrá en
              contacto para coordinar la entrega.
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
              Paso {currentStep}/{TOTAL_STEPS} · Tu avance se guarda automáticamente.
            </DialogDescription>
          </DialogHeader>

          {!draftDecisionMade && draftCandidate ? (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 space-y-4">
              <div className="flex gap-3">
                <Save className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Encontramos un pedido a medio completar</p>
                  <p className="text-sm text-zinc-300 mt-1">
                    Quedaste en el paso {clampStep(draftCandidate.step)}/{TOTAL_STEPS} ·{" "}
                    {formatDraftDate(draftCandidate.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={empezarDeCero}
                  className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Empezar de cero
                </Button>
                <Button
                  type="button"
                  onClick={retomarDraft}
                  className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
                >
                  Retomar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (currentStep === TOTAL_STEPS) void handleSubmit()
                else avanzarPaso()
              }}
              className="space-y-5 mt-2"
            >
              <div className="grid grid-cols-4 gap-2" aria-label={`Paso ${currentStep} de ${TOTAL_STEPS}`}>
                {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full ${step <= currentStep ? "bg-yellow-400" : "bg-zinc-700"}`}
                  />
                ))}
              </div>

              {precio && (
                <div className="flex items-center gap-2 text-yellow-400 font-semibold">
                  <Tag className="w-4 h-4" />
                  Precio: {precio}
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Tus datos</h3>
                    <p className="text-sm text-zinc-400">Los usaremos para identificar el pedido y contactarte.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-400" />
                      DNI
                    </Label>
                    <div className="relative">
                      <Input
                        value={dni}
                        onChange={(event) => handleDniChange(event.target.value)}
                        placeholder="12345678"
                        inputMode="numeric"
                        maxLength={8}
                        autoFocus
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

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Nombre y apellido</Label>
                    <Input
                      value={nombre}
                      onChange={(event) => setNombre(event.target.value)}
                      placeholder="Juan Pérez"
                      readOnly={estaRegistrado}
                      className={`bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400 ${estaRegistrado ? "opacity-70 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Teléfono</Label>
                    <Input
                      value={telefono}
                      onChange={(event) => setTelefono(event.target.value)}
                      placeholder="+54 9 3442 123456"
                      className="bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-yellow-400" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      className="bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400"
                    />
                    <p className="text-xs text-zinc-500">El email quedará asociado al pedido.</p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Remeras y entrega</h3>
                    <p className="text-sm text-zinc-400">Elegí si es modelo de mujer o de hombre, el talle, la cantidad y la entrega.</p>
                  </div>

                  <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3">
                    <p className="flex items-start gap-2 text-sm font-semibold text-yellow-300">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Por favor, lea bien la tabla de talles antes de seleccionar. Los talles pueden variar entre el modelo de mujer y el de hombre.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300 flex items-center gap-2">
                        <Package className="w-4 h-4 text-yellow-400" />
                        Modelo y talle
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

                    {items.map((item, index) => (
                      <div
                        key={`${index}-${item.genero}-${item.talle}`}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_5rem_auto] gap-2 items-center rounded-lg border border-zinc-800 bg-zinc-950/30 p-2"
                      >
                        <Select
                          value={item.genero}
                          onValueChange={(value) =>
                            actualizarItem(
                              index,
                              "genero",
                              value === "mujer" ? "mujer" : "hombre",
                            )
                          }
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder="Modelo" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="hombre" className="text-white focus:bg-zinc-700">
                              Hombre
                            </SelectItem>
                            <SelectItem value="mujer" className="text-white focus:bg-zinc-700">
                              Mujer
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={item.talle}
                          onValueChange={(value) => actualizarItem(index, "talle", value)}
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder="Talle" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {tallesDisponibles.map((talle) => (
                              <SelectItem
                                key={talle}
                                value={talle}
                                className="text-white focus:bg-zinc-700"
                              >
                                Talle {talle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={item.cantidad}
                          onChange={(event) =>
                            actualizarItem(index, "cantidad", Number(event.target.value))
                          }
                          aria-label={`Cantidad para ${etiquetaGenero(item.genero)} talle ${item.talle}`}
                          className="w-full sm:w-20 bg-zinc-800 border-zinc-700 text-white text-center"
                        />

                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarItem(index)}
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

                  {envioTipo === "envio" && (
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300">Dirección de entrega</Label>
                      <Input
                        value={direccion}
                        onChange={(event) => setDireccion(event.target.value)}
                        placeholder="Calle 123, Piso 4, Dpto A, Ciudad"
                        className="bg-zinc-800 border-zinc-700 text-white focus:border-yellow-400"
                      />
                      <p className="flex items-start gap-1.5 text-xs text-yellow-400/90">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        El envío tiene un costo adicional; nos vamos a contactar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Pago</h3>
                    <p className="text-sm text-zinc-400">Realizá la transferencia y adjuntá el comprobante.</p>
                  </div>

                  {aliasInfo && (
                    <div className="rounded-lg bg-zinc-800/50 border border-yellow-400/20 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Datos de pago
                      </p>
                      <p className="text-sm text-zinc-300 whitespace-pre-line">{aliasInfo}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-yellow-400" />
                      Comprobante de pago{" "}
                      <span className="text-zinc-500 text-xs">(JPG, PNG o PDF, máx. 5 MB)</span>
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) {
                          toast({
                            title: "El archivo es demasiado grande (máx. 5 MB)",
                            variant: "destructive",
                          })
                          return
                        }
                        setComprobante(file)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-zinc-700 rounded-lg py-5 text-sm text-zinc-400 hover:border-yellow-400/50 hover:text-zinc-300 transition-colors"
                    >
                      {comprobante ? (
                        <span className="text-green-400">✓ {comprobante.name}</span>
                      ) : pedidoPrevio ? (
                        "Podés conservar el comprobante anterior o adjuntar uno nuevo"
                      ) : (
                        "Click para adjuntar comprobante"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Revisá tu pedido</h3>
                    <p className="text-sm text-zinc-400">Confirmá que todo esté correcto antes de enviarlo.</p>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 divide-y divide-zinc-700 text-sm">
                    <div className="p-3">
                      <p className="text-zinc-500">Persona</p>
                      <p className="text-white font-medium">{nombre}</p>
                      <p className="text-zinc-300">DNI {dni} · {telefono}</p>
                      <p className="text-yellow-400 break-all">{email}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-zinc-500">Remeras</p>
                      <p className="text-white">
                        {items
                          .map(
                            (item) =>
                              `${etiquetaGenero(item.genero)} · talle ${item.talle} × ${item.cantidad}`,
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-zinc-500">Entrega</p>
                      <p className="text-white">
                        {envioTipo === "retiro" ? "Retiro en el evento" : `Envío: ${direccion}`}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-zinc-500">Comprobante</p>
                      <p className="text-white">
                        {comprobante?.name ?? (pedidoPrevio ? "Se conserva el comprobante anterior" : "Sin adjuntar")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={volverPaso}
                    disabled={enviando}
                    className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Atrás
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500 font-semibold h-11"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando pedido...
                    </>
                  ) : currentStep < TOTAL_STEPS ? (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : pedidoPrevio ? (
                    "Actualizar pedido"
                  ) : (
                    "Enviar pedido"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Tabla de talles</DialogTitle>
            <DialogDescription className="text-yellow-200 font-semibold">
              Por favor, lea bien la tabla de talles y verifique el modelo de mujer o de hombre antes de confirmar.
            </DialogDescription>
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
