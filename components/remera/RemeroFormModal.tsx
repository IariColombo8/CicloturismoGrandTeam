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
import { Textarea } from "@/components/ui/textarea"
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
  Navigation,
} from "lucide-react"
import { TALLES_DISPONIBLES, type RemeraItem } from "@/types/database"
import { supabase } from "@/lib/supabase"

interface RemeroFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GeneroRemera = "hombre" | "mujer"
type DestinoEnvio = "domicilio" | "correo"
type RemeraItemConGenero = RemeraItem & { genero: GeneroRemera }
type RemeraItemPersistido = RemeraItem & { genero?: GeneroRemera }

interface DireccionEnvioForm {
  pais: "Argentina"
  provincia: string
  provinciaId: string
  ciudad: string
  localidadId: string
  barrio: string
  codigoPostal: string
  destinoEnvio: DestinoEnvio
  sucursalCorreo: string
  calle: string
  altura: string
  sinNumero: boolean
  piso: string
  departamento: string
  entreCalles: string
  lugarEntrega: string
  indicaciones: string
  latitud: number | null
  longitud: number | null
}

interface LocalidadOption {
  id: string
  nombre: string
  centroide?: { lat: number; lon: number } | null
}

interface GeorefLocalidadResponse {
  localidades?: Array<{
    id?: string
    nombre?: string
    centroide?: { lat?: number; lon?: number } | null
  }>
}

interface NominatimResult {
  lat?: string
  lon?: string
  address?: {
    postcode?: string
  }
}

const DIRECCION_INICIAL: DireccionEnvioForm = {
  pais: "Argentina",
  provincia: "",
  provinciaId: "",
  ciudad: "",
  localidadId: "",
  barrio: "",
  codigoPostal: "",
  destinoEnvio: "domicilio",
  sucursalCorreo: "",
  calle: "",
  altura: "",
  sinNumero: false,
  piso: "",
  departamento: "",
  entreCalles: "",
  lugarEntrega: "",
  indicaciones: "",
  latitud: null,
  longitud: null,
}

const PROVINCIAS_ARGENTINA = [
  { id: "06", nombre: "Buenos Aires" },
  { id: "10", nombre: "Catamarca" },
  { id: "22", nombre: "Chaco" },
  { id: "26", nombre: "Chubut" },
  { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
  { id: "14", nombre: "Córdoba" },
  { id: "18", nombre: "Corrientes" },
  { id: "30", nombre: "Entre Ríos" },
  { id: "34", nombre: "Formosa" },
  { id: "38", nombre: "Jujuy" },
  { id: "42", nombre: "La Pampa" },
  { id: "46", nombre: "La Rioja" },
  { id: "50", nombre: "Mendoza" },
  { id: "54", nombre: "Misiones" },
  { id: "58", nombre: "Neuquén" },
  { id: "62", nombre: "Río Negro" },
  { id: "66", nombre: "Salta" },
  { id: "70", nombre: "San Juan" },
  { id: "74", nombre: "San Luis" },
  { id: "78", nombre: "Santa Cruz" },
  { id: "82", nombre: "Santa Fe" },
  { id: "86", nombre: "Santiago del Estero" },
  { id: "94", nombre: "Tierra del Fuego" },
  { id: "90", nombre: "Tucumán" },
] as const

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
    pais?: string | null
    provincia?: string | null
    provincia_id?: string | null
    ciudad?: string | null
    localidad_id?: string | null
    barrio?: string | null
    codigo_postal?: string | null
    destino_envio?: DestinoEnvio | null
    sucursal_correo?: string | null
    calle?: string | null
    altura?: string | null
    sin_numero?: boolean | null
    piso?: string | null
    departamento?: string | null
    entre_calles?: string | null
    lugar_entrega?: string | null
    indicaciones_entrega?: string | null
    latitud?: number | null
    longitud?: number | null
    estado: string
    comprobante_url: string | null
  } | null
}

interface RemeraDraft {
  version: 1 | 2 | 3
  updatedAt: number
  step: number
  dni: string
  nombre: string
  telefono: string
  email: string
  items: RemeraItemPersistido[]
  envioTipo: "retiro" | "envio"
  direccion?: string
  direccionEnvio?: Partial<DireccionEnvioForm>
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

function normalizarDireccion(
  data?: Partial<DireccionEnvioForm> | null,
  direccionAnterior = "",
): DireccionEnvioForm {
  const provincia = data?.provincia?.trim() ?? ""
  const provinciaId =
    data?.provinciaId?.trim() ||
    PROVINCIAS_ARGENTINA.find((item) => item.nombre === provincia)?.id ||
    ""

  return {
    ...DIRECCION_INICIAL,
    ...(data ?? {}),
    pais: "Argentina",
    provincia,
    provinciaId,
    destinoEnvio: data?.destinoEnvio === "correo" ? "correo" : "domicilio",
    calle: data?.calle?.trim() || direccionAnterior.trim(),
    latitud:
      typeof data?.latitud === "number" && Number.isFinite(data.latitud)
        ? data.latitud
        : null,
    longitud:
      typeof data?.longitud === "number" && Number.isFinite(data.longitud)
        ? data.longitud
        : null,
  }
}

function direccionPrincipal(direccion: DireccionEnvioForm) {
  if (direccion.destinoEnvio === "correo") {
    return `Correo Argentino - ${direccion.sucursalCorreo.trim()}, ${direccion.ciudad.trim()}, ${direccion.provincia.trim()}`
      .replace(/\s+/g, " ")
      .slice(0, 300)
  }

  const numero = direccion.sinNumero ? "S/N" : direccion.altura.trim()
  return `${direccion.calle.trim()} ${numero}, ${direccion.ciudad.trim()}, ${direccion.provincia.trim()}`
    .replace(/\s+/g, " ")
    .slice(0, 300)
}

function direccionCompleta(direccion: DireccionEnvioForm) {
  if (direccion.destinoEnvio === "correo") {
    return [
      `Correo Argentino: ${direccion.sucursalCorreo}`,
      direccion.ciudad,
      direccion.provincia,
      `CP ${direccion.codigoPostal}`,
      direccion.pais,
    ]
      .filter(Boolean)
      .join(", ")
  }

  const partes = [
    `${direccion.calle} ${direccion.sinNumero ? "S/N" : direccion.altura}`,
    direccion.piso ? `Piso ${direccion.piso}` : "",
    direccion.departamento ? `Dpto. ${direccion.departamento}` : "",
    direccion.barrio ? `Barrio ${direccion.barrio}` : "",
    direccion.ciudad,
    direccion.provincia,
    `CP ${direccion.codigoPostal}`,
    direccion.pais,
  ].filter(Boolean)

  return partes.join(", ")
}

interface LeafletLatLng {
  lat: number
  lng: number
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker
  getLatLng: () => LeafletLatLng
  on: (event: string, callback: () => void) => LeafletMarker
  setLatLng: (latLng: [number, number]) => LeafletMarker
}

interface LeafletMap {
  invalidateSize: () => void
  on: (
    event: string,
    callback: (event: { latlng: LeafletLatLng }) => void,
  ) => LeafletMap
  remove: () => void
  setView: (latLng: [number, number], zoom: number) => LeafletMap
}

interface LeafletApi {
  map: (element: HTMLElement) => LeafletMap
  marker: (
    latLng: [number, number],
    options: { draggable: boolean },
  ) => LeafletMarker
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom: number },
  ) => { addTo: (map: LeafletMap) => void }
}

declare global {
  interface Window {
    L?: LeafletApi
  }
}

let leafletLoader: Promise<LeafletApi> | null = null

function cargarLeaflet() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet solo está disponible en el navegador"))
  }
  if (window.L) return Promise.resolve(window.L)
  if (leafletLoader) return leafletLoader

  leafletLoader = new Promise<LeafletApi>((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    const existente = document.getElementById("leaflet-js") as HTMLScriptElement | null
    if (existente) {
      existente.addEventListener("load", () => {
        if (window.L) resolve(window.L)
        else reject(new Error("Leaflet no quedó disponible"))
      })
      existente.addEventListener("error", () => reject(new Error("No se pudo cargar Leaflet")))
      return
    }

    const script = document.createElement("script")
    script.id = "leaflet-js"
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.async = true
    script.onload = () => {
      if (window.L) resolve(window.L)
      else reject(new Error("Leaflet no quedó disponible"))
    }
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet"))
    document.body.appendChild(script)
  })

  return leafletLoader
}

function MapaUbicacionEntrega({
  latitud,
  longitud,
  onChange,
}: {
  latitud: number | null
  longitud: number | null
  onChange: (latitud: number, longitud: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false

    void cargarLeaflet()
      .then((leaflet) => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const tieneUbicacion = latitud !== null && longitud !== null
        const centro: [number, number] = tieneUbicacion
          ? [latitud, longitud]
          : [-38.4161, -63.6167]
        const map = leaflet.map(containerRef.current).setView(
          centro,
          tieneUbicacion ? 15 : 4,
        )

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          })
          .addTo(map)

        const marker = leaflet.marker(centro, { draggable: true }).addTo(map)
        marker.on("dragend", () => {
          const punto = marker.getLatLng()
          onChangeRef.current(
            Number(punto.lat.toFixed(7)),
            Number(punto.lng.toFixed(7)),
          )
        })
        map.on("click", (event) => {
          marker.setLatLng([event.latlng.lat, event.latlng.lng])
          onChangeRef.current(
            Number(event.latlng.lat.toFixed(7)),
            Number(event.latlng.lng.toFixed(7)),
          )
        })

        mapRef.current = map
        markerRef.current = marker
        window.setTimeout(() => map.invalidateSize(), 150)
      })
      .catch(() => setMapError(true))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (
      latitud === null ||
      longitud === null ||
      !mapRef.current ||
      !markerRef.current
    ) {
      return
    }

    markerRef.current.setLatLng([latitud, longitud])
    mapRef.current.setView([latitud, longitud], 16)
    window.setTimeout(() => mapRef.current?.invalidateSize(), 50)
  }, [latitud, longitud])

  if (mapError) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
        No se pudo cargar el mapa. Podés continuar sin geolocalización.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
        aria-label="Mapa para marcar el lugar exacto de entrega"
      />
      <p className="text-xs text-zinc-500">
        Tocá el mapa o arrastrá el pin para marcar la ubicación exacta. Datos del
        mapa © OpenStreetMap.
      </p>
    </div>
  )
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
      Object.values(draft.direccionEnvio ?? {}).some(Boolean) ||
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
  const [direccionEnvio, setDireccionEnvio] = useState<DireccionEnvioForm>(
    DIRECCION_INICIAL,
  )
  const [localidades, setLocalidades] = useState<LocalidadOption[]>([])
  const [cargandoLocalidades, setCargandoLocalidades] = useState(false)
  const [cargandoCodigoPostal, setCargandoCodigoPostal] = useState(false)
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false)
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
    setDireccionEnvio(DIRECCION_INICIAL)
    setLocalidades([])
    setCargandoLocalidades(false)
    setCargandoCodigoPostal(false)
    setObteniendoUbicacion(false)
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
        (parsed?.version === 1 || parsed?.version === 2 || parsed?.version === 3) &&
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
      version: 3,
      updatedAt: Date.now(),
      step: currentStep,
      dni,
      nombre,
      telefono,
      email,
      items,
      envioTipo,
      direccion:
        envioTipo === "envio" ? direccionPrincipal(direccionEnvio) : "",
      direccionEnvio,
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
    direccionEnvio,
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
    setDireccionEnvio(
      normalizarDireccion(
        draftCandidate.direccionEnvio,
        draftCandidate.direccion ?? "",
      ),
    )
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
          setDireccionEnvio(
            normalizarDireccion(
              {
                pais: "Argentina",
                provincia: data.remera.provincia ?? "",
                provinciaId: data.remera.provincia_id ?? "",
                ciudad: data.remera.ciudad ?? "",
                localidadId: data.remera.localidad_id ?? "",
                barrio: data.remera.barrio ?? "",
                codigoPostal: data.remera.codigo_postal ?? "",
                destinoEnvio:
                  data.remera.destino_envio === "correo" ? "correo" : "domicilio",
                sucursalCorreo: data.remera.sucursal_correo ?? "",
                calle: data.remera.calle ?? "",
                altura: data.remera.altura ?? "",
                sinNumero: Boolean(data.remera.sin_numero),
                piso: data.remera.piso ?? "",
                departamento: data.remera.departamento ?? "",
                entreCalles: data.remera.entre_calles ?? "",
                lugarEntrega: data.remera.lugar_entrega ?? "",
                indicaciones: data.remera.indicaciones_entrega ?? "",
                latitud: data.remera.latitud ?? null,
                longitud: data.remera.longitud ?? null,
              },
              data.remera.direccion ?? "",
            ),
          )
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

  const actualizarDireccion = <K extends keyof DireccionEnvioForm>(
    campo: K,
    valor: DireccionEnvioForm[K],
  ) => {
    setDireccionEnvio((actual) => ({ ...actual, [campo]: valor }))
  }

  const cargarLocalidades = useCallback(
    async (provinciaId: string) => {
      if (!provinciaId) {
        setLocalidades([])
        return
      }

      setCargandoLocalidades(true)
      try {
        const params = new URLSearchParams({
          provincia: provinciaId,
          max: "5000",
          campos: "id,nombre,centroide",
        })
        const response = await fetch(
          `https://apis.datos.gob.ar/georef/api/localidades?${params.toString()}`,
        )
        if (!response.ok) throw new Error("No se pudieron cargar las localidades")

        const data = (await response.json()) as GeorefLocalidadResponse
        const opciones = (data.localidades ?? [])
          .filter((item) => item.id && item.nombre)
          .map((item) => ({
            id: item.id as string,
            nombre: item.nombre as string,
            centroide:
              typeof item.centroide?.lat === "number" &&
              typeof item.centroide?.lon === "number"
                ? { lat: item.centroide.lat, lon: item.centroide.lon }
                : null,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))

        setLocalidades(opciones)
        setDireccionEnvio((actual) => {
          if (actual.localidadId || !actual.ciudad) return actual
          const coincidencia = opciones.find(
            (item) =>
              item.nombre.localeCompare(actual.ciudad, "es", {
                sensitivity: "base",
              }) === 0,
          )
          return coincidencia
            ? { ...actual, localidadId: coincidencia.id }
            : actual
        })
      } catch {
        setLocalidades([])
        toast({
          title: "No pudimos cargar las localidades",
          description: "Reintentá en unos segundos.",
          variant: "destructive",
        })
      } finally {
        setCargandoLocalidades(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!open || envioTipo !== "envio" || !direccionEnvio.provinciaId) return
    void cargarLocalidades(direccionEnvio.provinciaId)
  }, [
    open,
    envioTipo,
    direccionEnvio.provinciaId,
    cargarLocalidades,
  ])

  const seleccionarProvincia = (provinciaId: string) => {
    const provincia = PROVINCIAS_ARGENTINA.find((item) => item.id === provinciaId)
    setLocalidades([])
    setDireccionEnvio((actual) => ({
      ...actual,
      provincia: provincia?.nombre ?? "",
      provinciaId,
      ciudad: "",
      localidadId: "",
      codigoPostal: "",
      latitud: null,
      longitud: null,
      sucursalCorreo: "",
    }))
  }

  const autocompletarCodigoPostal = useCallback(
    async (localidad: LocalidadOption, provincia: string) => {
      setCargandoCodigoPostal(true)
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          limit: "1",
          countrycodes: "ar",
          city: localidad.nombre,
          state: provincia,
          country: "Argentina",
        })
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { headers: { "Accept-Language": "es-AR,es;q=0.9" } },
        )
        if (!response.ok) return

        const results = (await response.json()) as NominatimResult[]
        const result = results[0]
        const latitud = result?.lat ? Number(result.lat) : localidad.centroide?.lat
        const longitud = result?.lon ? Number(result.lon) : localidad.centroide?.lon
        const codigoPostal = result?.address?.postcode?.trim().toUpperCase() ?? ""

        setDireccionEnvio((actual) => ({
          ...actual,
          codigoPostal: codigoPostal || actual.codigoPostal,
          latitud:
            typeof latitud === "number" && Number.isFinite(latitud)
              ? Number(latitud.toFixed(7))
              : actual.latitud,
          longitud:
            typeof longitud === "number" && Number.isFinite(longitud)
              ? Number(longitud.toFixed(7))
              : actual.longitud,
        }))
      } catch {
        // El código postal queda editable para que el usuario pueda completarlo.
      } finally {
        setCargandoCodigoPostal(false)
      }
    },
    [],
  )

  const seleccionarLocalidad = (localidadId: string) => {
    const localidad = localidades.find((item) => item.id === localidadId)
    if (!localidad) return

    setDireccionEnvio((actual) => ({
      ...actual,
      ciudad: localidad.nombre,
      localidadId,
      codigoPostal: "",
      latitud: localidad.centroide?.lat ?? actual.latitud,
      longitud: localidad.centroide?.lon ?? actual.longitud,
      sucursalCorreo: "",
    }))
    void autocompletarCodigoPostal(localidad, direccionEnvio.provincia)
  }

  const abrirBuscadorCorreo = () => {
    if (!direccionEnvio.ciudad || !direccionEnvio.provincia) {
      toast({
        title: "Seleccioná provincia y localidad",
        description: "Así podemos buscar una sucursal cercana.",
        variant: "destructive",
      })
      return
    }

    const consulta = encodeURIComponent(
      `Correo Argentino ${direccionEnvio.ciudad} ${direccionEnvio.provincia}`,
    )
    const centro =
      direccionEnvio.latitud !== null && direccionEnvio.longitud !== null
        ? `/@${direccionEnvio.latitud},${direccionEnvio.longitud},14z`
        : ""
    window.open(
      `https://www.google.com/maps/search/${consulta}${centro}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  const obtenerGeolocalizacion = () => {
    if (!("geolocation" in navigator)) {
      toast({
        title: "Geolocalización no disponible",
        description: "Tu dispositivo o navegador no permite obtener la ubicación.",
        variant: "destructive",
      })
      return
    }

    setObteniendoUbicacion(true)
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setDireccionEnvio((actual) => ({
          ...actual,
          latitud: Number(posicion.coords.latitude.toFixed(7)),
          longitud: Number(posicion.coords.longitude.toFixed(7)),
        }))
        setObteniendoUbicacion(false)
        toast({ title: "Ubicación agregada al pedido" })
      },
      () => {
        setObteniendoUbicacion(false)
        toast({
          title: "No pudimos obtener tu ubicación",
          description: "Podés continuar completando la dirección manualmente.",
          variant: "destructive",
        })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
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
      if (envioTipo === "envio") {
        const comunes: Array<[string, string]> = [
          [direccionEnvio.provincia, "Seleccioná la provincia"],
          [direccionEnvio.ciudad, "Seleccioná la localidad"],
          [direccionEnvio.codigoPostal, "Ingresá el código postal"],
        ]
        const faltanteComun = comunes.find(([valor]) => !valor.trim())
        if (faltanteComun) {
          toast({ title: faltanteComun[1], variant: "destructive" })
          return false
        }

        if (!/^[A-Za-z0-9 -]{4,10}$/.test(direccionEnvio.codigoPostal.trim())) {
          toast({
            title: "Código postal inválido",
            description: "Revisalo; podés editar el valor autocompletado.",
            variant: "destructive",
          })
          return false
        }

        if (direccionEnvio.destinoEnvio === "correo") {
          if (!direccionEnvio.sucursalCorreo.trim()) {
            toast({
              title: "Indicá la sucursal de Correo Argentino",
              description: "Usá el buscador y escribí la sucursal elegida.",
              variant: "destructive",
            })
            return false
          }
        } else {
          const domicilioObligatorio: Array<[string, string]> = [
            [direccionEnvio.calle, "Ingresá la calle"],
            [direccionEnvio.lugarEntrega, "Indicá el lugar de entrega"],
            [direccionEnvio.indicaciones, "Agregá indicaciones para la entrega"],
          ]
          const faltanteDomicilio = domicilioObligatorio.find(
            ([valor]) => !valor.trim(),
          )
          if (faltanteDomicilio) {
            toast({ title: faltanteDomicilio[1], variant: "destructive" })
            return false
          }

          if (!direccionEnvio.sinNumero && !direccionEnvio.altura.trim()) {
            toast({
              title: "Ingresá la altura o marcá S/N",
              variant: "destructive",
            })
            return false
          }
        }
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
          direccion:
            envioTipo === "envio" ? direccionPrincipal(direccionEnvio) : "",
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

      const { error: direccionError } = await supabase.rpc(
        "guardar_entrega_remera_v2",
        {
          p_dni: dni.trim(),
          p_email: email.trim().toLowerCase(),
          p_es_envio: envioTipo === "envio",
          p_destino_envio: direccionEnvio.destinoEnvio,
          p_pais: "Argentina",
          p_provincia: direccionEnvio.provincia.trim(),
          p_provincia_id: direccionEnvio.provinciaId.trim(),
          p_ciudad: direccionEnvio.ciudad.trim(),
          p_localidad_id: direccionEnvio.localidadId.trim(),
          p_barrio: direccionEnvio.barrio.trim(),
          p_codigo_postal: direccionEnvio.codigoPostal.trim(),
          p_sucursal_correo: direccionEnvio.sucursalCorreo.trim(),
          p_calle: direccionEnvio.calle.trim(),
          p_altura: direccionEnvio.altura.trim(),
          p_sin_numero: direccionEnvio.sinNumero,
          p_piso: direccionEnvio.piso.trim(),
          p_departamento: direccionEnvio.departamento.trim(),
          p_entre_calles: direccionEnvio.entreCalles.trim(),
          p_lugar_entrega: direccionEnvio.lugarEntrega.trim(),
          p_indicaciones_entrega: direccionEnvio.indicaciones.trim(),
          p_latitud: direccionEnvio.latitud,
          p_longitud: direccionEnvio.longitud,
        },
      )

      if (direccionError) {
        console.error("Error guardando la dirección estructurada:", direccionError)
        throw new Error(
          "El pedido se registró, pero faltó guardar la dirección completa. Aplicá la migración SQL y volvé a enviarlo.",
        )
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
              {pedidoPrevio
                ? "Modificar pedido de remera"
                : "Pedir remera del evento"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Paso {currentStep}/{TOTAL_STEPS} · Tu avance se guarda
              automáticamente.
            </DialogDescription>
          </DialogHeader>

          {!draftDecisionMade && draftCandidate ? (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 space-y-4">
              <div className="flex gap-3">
                <Save className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    Encontramos un pedido a medio completar
                  </p>
                  <p className="text-sm text-zinc-300 mt-1">
                    Quedaste en el paso {clampStep(draftCandidate.step)}/
                    {TOTAL_STEPS} · {formatDraftDate(draftCandidate.updatedAt)}
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
                event.preventDefault();
                if (currentStep === TOTAL_STEPS) void handleSubmit();
                else avanzarPaso();
              }}
              className="space-y-5 mt-2"
            >
              <div
                className="grid grid-cols-4 gap-2"
                aria-label={`Paso ${currentStep} de ${TOTAL_STEPS}`}
              >
                {Array.from(
                  { length: TOTAL_STEPS },
                  (_, index) => index + 1,
                ).map((step) => (
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
                    <h3 className="text-lg font-semibold text-white">
                      Tus datos
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Los usaremos para identificar el pedido y contactarte.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-400" />
                      DNI
                    </Label>
                    <div className="relative">
                      <Input
                        value={dni}
                        onChange={(event) =>
                          handleDniChange(event.target.value)
                        }
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
                      <p className="text-xs text-green-400">
                        ✓ Participante registrado en el evento
                      </p>
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
                      placeholder="+54 9 3442 65-4257"
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
                    <p className="text-xs text-zinc-500">
                      El email quedará asociado al pedido.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Remeras y entrega
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Elegí si es modelo de mujer o de hombre, el talle, la
                      cantidad y la entrega.
                    </p>
                  </div>

                  <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3">
                    <p className="flex items-start gap-2 text-sm font-semibold text-yellow-300">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Por favor, lea bien la tabla de talles antes de
                      seleccionar. Los talles pueden variar entre el modelo de
                      mujer y el de hombre.
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
                            <SelectItem
                              value="hombre"
                              className="text-white focus:bg-zinc-700"
                            >
                              Hombre
                            </SelectItem>
                            <SelectItem
                              value="mujer"
                              className="text-white focus:bg-zinc-700"
                            >
                              Mujer
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={item.talle}
                          onValueChange={(value) =>
                            actualizarItem(index, "talle", value)
                          }
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
                            actualizarItem(
                              index,
                              "cantidad",
                              Number(event.target.value),
                            )
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
                        Envío en Argentina
                      </button>
                    </div>
                  </div>

                  {envioTipo === "envio" && (
                    <div className="space-y-4 rounded-xl border border-yellow-400/20 bg-black/20 p-3 sm:p-4">
                      <div>
                        <h4 className="font-semibold text-yellow-400">
                          Datos de entrega
                        </h4>
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-yellow-200/90">
                          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          Solo realizamos envíos dentro de Argentina. No se
                          entregan pedidos en Uruguay ni en otros países.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-300">¿Dónde querés recibirla?</Label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              actualizarDireccion("destinoEnvio", "domicilio")
                            }
                            className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                              direccionEnvio.destinoEnvio === "domicilio"
                                ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                            }`}
                          >
                            Envío a domicilio
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              actualizarDireccion("destinoEnvio", "correo")
                            }
                            className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                              direccionEnvio.destinoEnvio === "correo"
                                ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                            }`}
                          >
                            Enviar al correo más cercano
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-zinc-300">País</Label>
                          <Input
                            value="Argentina"
                            readOnly
                            className="cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-zinc-300">Provincia *</Label>
                          <Select
                            value={direccionEnvio.provinciaId}
                            onValueChange={seleccionarProvincia}
                          >
                            <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                              <SelectValue placeholder="Seleccionar provincia" />
                            </SelectTrigger>
                            <SelectContent className="border-zinc-700 bg-zinc-800">
                              {PROVINCIAS_ARGENTINA.map((provincia) => (
                                <SelectItem
                                  key={provincia.id}
                                  value={provincia.id}
                                  className="text-white focus:bg-zinc-700"
                                >
                                  {provincia.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-zinc-300">Localidad *</Label>
                          <Select
                            value={direccionEnvio.localidadId}
                            onValueChange={seleccionarLocalidad}
                            disabled={
                              !direccionEnvio.provinciaId || cargandoLocalidades
                            }
                          >
                            <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                              <SelectValue
                                placeholder={
                                  cargandoLocalidades
                                    ? "Cargando localidades..."
                                    : "Seleccionar localidad"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="max-h-72 border-zinc-700 bg-zinc-800">
                              {localidades.map((localidad) => (
                                <SelectItem
                                  key={localidad.id}
                                  value={localidad.id}
                                  className="text-white focus:bg-zinc-700"
                                >
                                  {localidad.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!cargandoLocalidades &&
                            direccionEnvio.provinciaId &&
                            localidades.length === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  void cargarLocalidades(
                                    direccionEnvio.provinciaId,
                                  )
                                }
                                className="text-xs text-yellow-400 hover:underline"
                              >
                                Reintentar carga de localidades
                              </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-zinc-300">
                            Código postal *
                            {cargandoCodigoPostal && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
                            )}
                          </Label>
                          <Input
                            value={direccionEnvio.codigoPostal}
                            onChange={(event) =>
                              actualizarDireccion(
                                "codigoPostal",
                                event.target.value.toUpperCase().slice(0, 10),
                              )
                            }
                            placeholder="Se completa al elegir localidad"
                            className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400"
                          />
                          <p className="text-xs text-zinc-500">
                            Se intenta autocompletar, pero podés corregirlo.
                          </p>
                        </div>
                      </div>

                      {direccionEnvio.destinoEnvio === "domicilio" ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-zinc-300">Barrio</Label>
                            <Input
                              value={direccionEnvio.barrio}
                              onChange={(event) =>
                                actualizarDireccion("barrio", event.target.value)
                              }
                              placeholder="Opcional"
                              className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                            <div className="space-y-1.5">
                              <Label className="text-zinc-300">Calle *</Label>
                              <Input
                                value={direccionEnvio.calle}
                                onChange={(event) =>
                                  actualizarDireccion("calle", event.target.value)
                                }
                                placeholder="9 de Julio"
                                className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-zinc-300">Altura *</Label>
                              <Input
                                value={
                                  direccionEnvio.sinNumero
                                    ? "S/N"
                                    : direccionEnvio.altura
                                }
                                onChange={(event) =>
                                  actualizarDireccion("altura", event.target.value)
                                }
                                disabled={direccionEnvio.sinNumero}
                                inputMode="numeric"
                                placeholder="1234"
                                className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400 disabled:opacity-60"
                              />
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                                <input
                                  type="checkbox"
                                  checked={direccionEnvio.sinNumero}
                                  onChange={(event) => {
                                    actualizarDireccion(
                                      "sinNumero",
                                      event.target.checked,
                                    )
                                    if (event.target.checked) {
                                      actualizarDireccion("altura", "")
                                    }
                                  }}
                                  className="h-4 w-4 accent-yellow-400"
                                />
                                La dirección es S/N
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-zinc-300">Piso</Label>
                              <Input
                                value={direccionEnvio.piso}
                                onChange={(event) =>
                                  actualizarDireccion("piso", event.target.value)
                                }
                                placeholder="Opcional"
                                className="border-zinc-700 bg-zinc-800 text-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-zinc-300">Departamento</Label>
                              <Input
                                value={direccionEnvio.departamento}
                                onChange={(event) =>
                                  actualizarDireccion(
                                    "departamento",
                                    event.target.value,
                                  )
                                }
                                placeholder="Opcional"
                                className="border-zinc-700 bg-zinc-800 text-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-zinc-300">Entre calles</Label>
                              <Input
                                value={direccionEnvio.entreCalles}
                                onChange={(event) =>
                                  actualizarDireccion(
                                    "entreCalles",
                                    event.target.value,
                                  )
                                }
                                placeholder="Opcional"
                                className="border-zinc-700 bg-zinc-800 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-zinc-300">
                              Lugar de entrega *
                            </Label>
                            <Input
                              value={direccionEnvio.lugarEntrega}
                              onChange={(event) =>
                                actualizarDireccion(
                                  "lugarEntrega",
                                  event.target.value,
                                )
                              }
                              placeholder="Casa, portería, comercio, trabajo..."
                              className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-zinc-300">
                              Indicaciones de entrega *
                            </Label>
                            <Textarea
                              value={direccionEnvio.indicaciones}
                              onChange={(event) =>
                                actualizarDireccion(
                                  "indicaciones",
                                  event.target.value,
                                )
                              }
                              rows={3}
                              placeholder="Color del frente, timbre, horario o referencias para encontrar el domicilio."
                              className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-3">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">
                              Sucursal de Correo Argentino
                            </p>
                            <p className="text-xs text-zinc-500">
                              Buscá la más cercana, elegila y escribí su nombre o
                              dirección para evitar confusiones.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={abrirBuscadorCorreo}
                            className="w-full border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 sm:w-auto"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Buscar correo cercano en el mapa
                          </Button>
                          <div className="space-y-1.5">
                            <Label className="text-zinc-300">
                              Sucursal elegida *
                            </Label>
                            <Input
                              value={direccionEnvio.sucursalCorreo}
                              onChange={(event) =>
                                actualizarDireccion(
                                  "sucursalCorreo",
                                  event.target.value,
                                )
                              }
                              placeholder="Ej.: Correo Argentino - Sucursal Centro, San Martín 123"
                              className="border-zinc-700 bg-zinc-800 text-white focus:border-yellow-400"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">
                              {direccionEnvio.destinoEnvio === "correo"
                                ? "Ubicación de la sucursal"
                                : "Ubicación exacta del domicilio"}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Podés usar tu ubicación y después mover el pin.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={obtenerGeolocalizacion}
                            disabled={obteniendoUbicacion}
                            className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                          >
                            {obteniendoUbicacion ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Navigation className="mr-2 h-4 w-4" />
                            )}
                            Usar mi ubicación
                          </Button>
                        </div>

                        <MapaUbicacionEntrega
                          latitud={direccionEnvio.latitud}
                          longitud={direccionEnvio.longitud}
                          onChange={(latitud, longitud) =>
                            setDireccionEnvio((actual) => ({
                              ...actual,
                              latitud,
                              longitud,
                            }))
                          }
                        />

                        {direccionEnvio.latitud !== null &&
                          direccionEnvio.longitud !== null && (
                            <p className="text-xs text-green-400">
                              ✓ Pin registrado: {direccionEnvio.latitud},{" "}
                              {direccionEnvio.longitud}
                            </p>
                          )}
                      </div>

                      <p className="flex items-start gap-1.5 text-xs text-yellow-400/90">
                        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        El envío tiene un costo adicional; nos vamos a contactar
                        para confirmarlo.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Pago</h3>
                    <p className="text-sm text-zinc-400">
                      Realizá la transferencia y adjuntá el comprobante.
                    </p>
                  </div>

                  {aliasInfo && (
                    <div className="rounded-lg bg-zinc-800/50 border border-yellow-400/20 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Datos de pago
                      </p>
                      <p className="text-sm text-zinc-300 whitespace-pre-line">
                        {aliasInfo}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-yellow-400" />
                      Comprobante de pago{" "}
                      <span className="text-zinc-500 text-xs">
                        (JPG, PNG o PDF, máx. 5 MB)
                      </span>
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast({
                            title: "El archivo es demasiado grande (máx. 5 MB)",
                            variant: "destructive",
                          });
                          return;
                        }
                        setComprobante(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-zinc-700 rounded-lg py-5 text-sm text-zinc-400 hover:border-yellow-400/50 hover:text-zinc-300 transition-colors"
                    >
                      {comprobante ? (
                        <span className="text-green-400">
                          ✓ {comprobante.name}
                        </span>
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
                    <h3 className="text-lg font-semibold text-white">
                      Revisá tu pedido
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Confirmá que todo esté correcto antes de enviarlo.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 divide-y divide-zinc-700 text-sm">
                    <div className="p-3">
                      <p className="text-zinc-500">Persona</p>
                      <p className="text-white font-medium">{nombre}</p>
                      <p className="text-zinc-300">
                        DNI {dni} · {telefono}
                      </p>
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
                        {envioTipo === "retiro"
                          ? "Retiro en el evento"
                          : `Envío: ${direccionCompleta(direccionEnvio)}`}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-zinc-500">Comprobante</p>
                      <p className="text-white">
                        {comprobante?.name ??
                          (pedidoPrevio
                            ? "Se conserva el comprobante anterior"
                            : "Sin adjuntar")}
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
            <DialogTitle className="text-yellow-400">
              Tabla de talles
            </DialogTitle>
            <DialogDescription className="text-yellow-200 font-semibold">
              Por favor, lea bien la tabla de talles y verifique el modelo de
              mujer o de hombre antes de confirmar.
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
  );
}
