"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  CARPETAS_EMAIL,
  type CarpetaEmail,
  type HiloCompleto,
  type ResumenHilo,
} from "@/lib/email/tipos"
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  PenSquare,
  RefreshCw,
  Reply,
  Search,
  Send,
  Shield,
  Trash2,
} from "lucide-react"

// El visor usa un iframe y solo hace falta al abrir un hilo.
const VisorMensaje = dynamic(() => import("@/components/admin/emails/VisorMensaje"), {
  ssr: false,
  loading: () => <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />,
})

const ModalRedactar = dynamic(() => import("@/components/admin/emails/ModalRedactar"), {
  ssr: false,
})

interface EstadoGmail {
  configurado: boolean
  faltantes: string[]
  casilla?: string
  mensaje?: string
}

/** Fecha corta para la lista; hoy muestra la hora, el resto el dia. */
function formatearFechaCorta(iso: string): string {
  if (!iso) return ""
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ""

  const ahora = new Date()
  const mismoDia =
    fecha.getDate() === ahora.getDate() &&
    fecha.getMonth() === ahora.getMonth() &&
    fecha.getFullYear() === ahora.getFullYear()

  if (mismoDia) {
    return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  }

  const mismoAnio = fecha.getFullYear() === ahora.getFullYear()
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    ...(mismoAnio ? {} : { year: "2-digit" }),
  })
}

function formatearFechaLarga(iso: string): string {
  if (!iso) return ""
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ""
  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatearTamanio(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminEmailsPage() {
  const router = useRouter()
  const { user, session, loading: authLoading } = useSupabaseContext()
  const { toast } = useToast()

  const token = session?.access_token

  const [estado, setEstado] = useState<EstadoGmail | null>(null)
  const [carpeta, setCarpeta] = useState<CarpetaEmail>("recibidos")
  const [busqueda, setBusqueda] = useState("")
  const [busquedaAplicada, setBusquedaAplicada] = useState("")

  const [hilos, setHilos] = useState<ResumenHilo[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denegado, setDenegado] = useState(false)

  const [hiloAbierto, setHiloAbierto] = useState<HiloCompleto | null>(null)
  const [cargandoHilo, setCargandoHilo] = useState(false)
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null)

  const [respuesta, setRespuesta] = useState("")
  const [respondiendo, setRespondiendo] = useState(false)
  const [accionEnCurso, setAccionEnCurso] = useState(false)
  const [redactarAbierto, setRedactarAbierto] = useState(false)

  const encabezados = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  )

  // --- Estado de la integracion -------------------------------------------
  const cargarEstado = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch("/api/email/estado", { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.status === 403) {
        setDenegado(true)
        return
      }
      setEstado(data as EstadoGmail)
    } catch {
      setEstado({ configurado: false, faltantes: [], mensaje: "Error de red al consultar el estado" })
    }
  }, [token])

  // --- Bandeja -------------------------------------------------------------
  const cargarHilos = useCallback(async () => {
    if (!token) return
    setCargandoLista(true)
    setError(null)
    try {
      const params = new URLSearchParams({ carpeta })
      if (busquedaAplicada) params.set("q", busquedaAplicada)

      const res = await fetch(`/api/email/inbox?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setDenegado(res.status === 403)
        setError(data.error || "No se pudieron cargar los correos")
        setHilos([])
        return
      }

      setHilos((data.hilos || []) as ResumenHilo[])
    } catch {
      setError("Error de red al cargar los correos")
    } finally {
      setCargandoLista(false)
    }
  }, [token, carpeta, busquedaAplicada])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login?returnUrl=/admin/emails")
      return
    }
    cargarEstado()
  }, [authLoading, user, router, cargarEstado])

  useEffect(() => {
    if (authLoading || !user) return
    if (estado && !estado.configurado) {
      setCargandoLista(false)
      return
    }
    if (estado?.configurado) cargarHilos()
  }, [authLoading, user, estado, cargarHilos])

  // --- Abrir un hilo -------------------------------------------------------
  const abrirHilo = useCallback(
    async (id: string) => {
      if (!token) return
      setIdSeleccionado(id)
      setCargandoHilo(true)
      setRespuesta("")
      try {
        const res = await fetch(`/api/email/thread?id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          toast({
            title: "No se pudo abrir el correo",
            description: data.error,
            variant: "destructive",
          })
          return
        }
        setHiloAbierto(data.hilo as HiloCompleto)
        // El servidor ya lo marco como leido: se refleja en la lista.
        setHilos((lista) => lista.map((h) => (h.id === id ? { ...h, noLeido: false } : h)))
      } catch {
        toast({ title: "Error de red al abrir el correo", variant: "destructive" })
      } finally {
        setCargandoHilo(false)
      }
    },
    [token, toast]
  )

  // --- Responder -----------------------------------------------------------
  const enviarRespuesta = async () => {
    if (!hiloAbierto || !respuesta.trim() || respondiendo) return
    setRespondiendo(true)
    try {
      const res = await fetch("/api/email/reply", {
        method: "POST",
        headers: encabezados,
        body: JSON.stringify({ threadId: hiloAbierto.id, texto: respuesta }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: "No se pudo enviar", description: data.error, variant: "destructive" })
        return
      }

      toast({ title: "Respuesta enviada" })
      setRespuesta("")
      await abrirHilo(hiloAbierto.id)
    } catch {
      toast({ title: "Error de red al enviar la respuesta", variant: "destructive" })
    } finally {
      setRespondiendo(false)
    }
  }

  // --- Acciones sobre el hilo ---------------------------------------------
  const ejecutarAccion = async (accion: string, threadId: string) => {
    if (accionEnCurso) return
    setAccionEnCurso(true)
    try {
      const res = await fetch("/api/email/acciones", {
        method: "POST",
        headers: encabezados,
        body: JSON.stringify({ threadId, accion }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: "No se pudo completar la accion", description: data.error, variant: "destructive" })
        return
      }

      const mensajes: Record<string, string> = {
        archivar: "Conversacion archivada",
        papelera: "Movido a la papelera",
        "no-leido": "Marcado como no leido",
        "a-recibidos": "Movido a Recibidos",
      }
      toast({ title: mensajes[accion] || "Hecho" })

      // Sale de la carpeta actual: se cierra el detalle y se refresca la lista.
      if (accion === "archivar" || accion === "papelera" || accion === "no-leido") {
        setHiloAbierto(null)
        setIdSeleccionado(null)
      }
      await cargarHilos()
    } catch {
      toast({ title: "Error de red", variant: "destructive" })
    } finally {
      setAccionEnCurso(false)
    }
  }

  // --- Redactar ------------------------------------------------------------
  const enviarNuevo = async (datos: {
    para: string
    asunto: string
    mensaje: string
    conPlantilla: boolean
    individual: boolean
  }): Promise<boolean> => {
    try {
      const cuerpo = datos.conPlantilla
        ? {
            para: datos.para,
            asunto: datos.asunto,
            plantilla: "generico",
            datos: { titulo: datos.asunto, mensaje: datos.mensaje },
            individual: datos.individual,
          }
        : {
            para: datos.para,
            asunto: datos.asunto,
            texto: datos.mensaje,
            individual: datos.individual,
          }

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: encabezados,
        body: JSON.stringify(cuerpo),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: "No se pudo enviar",
          description: data.error || "Revisa los destinatarios",
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Correo enviado",
        description: data.enviados > 1 ? `${data.enviados} destinatarios` : undefined,
      })
      return true
    } catch {
      toast({ title: "Error de red al enviar", variant: "destructive" })
      return false
    }
  }

  // --- Pantallas de borde --------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    )
  }

  if (denegado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black px-4">
        <Card className="max-w-md border-zinc-800 bg-zinc-900/80">
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h2 className="mb-1 text-lg font-bold text-white">Acceso restringido</h2>
            <p className="text-sm text-zinc-400">
              Solo los roles <span className="font-semibold text-yellow-400">admin</span> y{" "}
              <span className="font-semibold text-yellow-400">grandteam</span> pueden ver los correos.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hiloActual = hiloAbierto

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Header */}
      <div className="sticky top-20 z-10 border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-black text-white sm:text-3xl">
                <span className="gradient-text">Correos</span>
              </h1>
              <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                {estado?.casilla ? `Casilla ${estado.casilla}` : "Bandeja del evento"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setRedactarAbierto(true)}
                disabled={!estado?.configurado}
                className="bg-yellow-400 text-sm font-semibold text-black hover:bg-yellow-500"
              >
                <PenSquare className="mr-1.5 h-4 w-4" />
                Redactar
              </Button>
              <Button
                onClick={() => {
                  cargarEstado()
                  cargarHilos()
                }}
                variant="outline"
                className="border-zinc-700 text-sm text-zinc-300 hover:text-white"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Gmail sin configurar */}
        {estado && !estado.configurado && (
          <Card className="mb-6 border-yellow-400/30 bg-zinc-900/80">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                <div className="space-y-2 text-sm">
                  <h2 className="font-bold text-white">Gmail todavia no esta conectado</h2>
                  <p className="text-zinc-400">{estado.mensaje}</p>
                  {estado.faltantes.length > 0 && (
                    <ul className="list-inside list-disc text-zinc-500">
                      {estado.faltantes.map((v) => (
                        <li key={v}>
                          <code className="text-yellow-400/80">{v}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-zinc-500">
                    Pasos completos en <code className="text-yellow-400/80">docs/gmail-setup.md</code>:
                    crear las credenciales OAuth en Google Cloud Console, correr{" "}
                    <code className="text-yellow-400/80">npm run gmail:auth</code> y cargar las variables
                    en <code className="text-yellow-400/80">.env.local</code> y en Vercel.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {estado?.configurado && (
          <>
            {/* Carpetas + busqueda */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {CARPETAS_EMAIL.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCarpeta(c.id)
                      setHiloAbierto(null)
                      setIdSeleccionado(null)
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      carpeta === c.id
                        ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-400"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setBusquedaAplicada(busqueda.trim())
                }}
                className="flex gap-2 lg:w-80"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar en el correo"
                    className="border-zinc-800 bg-zinc-900 pl-9 text-white placeholder:text-zinc-600"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:text-white"
                >
                  Buscar
                </Button>
              </form>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-12">
              {/* Lista de hilos */}
              <div
                className={`lg:col-span-5 xl:col-span-4 ${hiloActual ? "hidden lg:block" : "block"}`}
              >
                <Card className="border-zinc-800 bg-zinc-900/60">
                  <CardContent className="p-0">
                    {cargandoLista ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                      </div>
                    ) : hilos.length === 0 ? (
                      <div className="px-4 py-16 text-center">
                        <Inbox className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
                        <p className="text-sm text-zinc-500">
                          {busquedaAplicada ? "Sin resultados para esa busqueda" : "No hay correos aca"}
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-zinc-800">
                        {hilos.map((hilo) => (
                          <li key={hilo.id}>
                            <button
                              onClick={() => abrirHilo(hilo.id)}
                              className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-800/50 ${
                                idSeleccionado === hilo.id ? "bg-zinc-800/70" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`truncate text-sm ${
                                    hilo.noLeido ? "font-bold text-white" : "text-zinc-300"
                                  }`}
                                >
                                  {hilo.de.nombre || hilo.de.email}
                                </span>
                                <span className="shrink-0 text-[11px] text-zinc-500">
                                  {formatearFechaCorta(hilo.fecha)}
                                </span>
                              </div>

                              <div className="mt-0.5 flex items-center gap-1.5">
                                {hilo.noLeido && (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                                )}
                                <span
                                  className={`truncate text-sm ${
                                    hilo.noLeido ? "font-semibold text-yellow-400/90" : "text-zinc-400"
                                  }`}
                                >
                                  {hilo.asunto}
                                </span>
                                {hilo.cantidadMensajes > 1 && (
                                  <span className="shrink-0 rounded bg-zinc-800 px-1.5 text-[10px] text-zinc-400">
                                    {hilo.cantidadMensajes}
                                  </span>
                                )}
                                {hilo.tieneAdjuntos && (
                                  <Paperclip className="h-3 w-3 shrink-0 text-zinc-500" />
                                )}
                              </div>

                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                                {hilo.snippet}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detalle del hilo */}
              <div
                className={`lg:col-span-7 xl:col-span-8 ${hiloActual ? "block" : "hidden lg:block"}`}
              >
                <Card className="border-zinc-800 bg-zinc-900/60">
                  <CardContent className="p-0">
                    {cargandoHilo ? (
                      <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                      </div>
                    ) : !hiloActual ? (
                      <div className="px-4 py-24 text-center">
                        <Mail className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
                        <p className="text-sm text-zinc-500">Elegi una conversacion para leerla</p>
                      </div>
                    ) : (
                      <>
                        {/* Barra de acciones */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setHiloAbierto(null)
                              setIdSeleccionado(null)
                            }}
                            className="text-zinc-400 hover:text-white lg:hidden"
                          >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Volver
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={accionEnCurso}
                            onClick={() => ejecutarAccion("no-leido", hiloActual.id)}
                            className="text-zinc-400 hover:text-white"
                          >
                            <MailOpen className="mr-1.5 h-4 w-4" />
                            No leido
                          </Button>

                          {carpeta !== "papelera" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={accionEnCurso}
                              onClick={() => ejecutarAccion("archivar", hiloActual.id)}
                              className="text-zinc-400 hover:text-white"
                            >
                              <Archive className="mr-1.5 h-4 w-4" />
                              Archivar
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={accionEnCurso}
                            onClick={() => ejecutarAccion("papelera", hiloActual.id)}
                            className="text-red-400/80 hover:text-red-300"
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Papelera
                          </Button>
                        </div>

                        <div className="p-4 sm:p-5">
                          <h2 className="mb-4 text-lg font-bold leading-snug text-white sm:text-xl">
                            {hiloActual.asunto}
                          </h2>

                          <div className="space-y-4">
                            {hiloActual.mensajes.map((mensaje) => (
                              <div
                                key={mensaje.id}
                                className="rounded-lg border border-zinc-800 bg-black/30 p-3 sm:p-4"
                              >
                                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                      {mensaje.de.nombre || mensaje.de.email}
                                      {mensaje.esEnviado && (
                                        <span className="ml-2 rounded bg-yellow-400/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                                          enviado
                                        </span>
                                      )}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">{mensaje.de.email}</p>
                                  </div>
                                  <span className="shrink-0 text-xs text-zinc-500">
                                    {formatearFechaLarga(mensaje.fecha)}
                                  </span>
                                </div>

                                <VisorMensaje html={mensaje.html} texto={mensaje.texto} />

                                {mensaje.adjuntos.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                                    {mensaje.adjuntos.map((adjunto) => (
                                      <a
                                        key={adjunto.id}
                                        href={`/api/email/adjunto?mensajeId=${encodeURIComponent(
                                          mensaje.id
                                        )}&adjuntoId=${encodeURIComponent(
                                          adjunto.id
                                        )}&nombre=${encodeURIComponent(
                                          adjunto.nombre
                                        )}&mimeType=${encodeURIComponent(adjunto.mimeType)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-yellow-400/40 hover:text-yellow-400"
                                      >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        <span className="max-w-[180px] truncate">{adjunto.nombre}</span>
                                        <span className="text-zinc-600">
                                          {formatearTamanio(adjunto.tamanio)}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Responder */}
                          {carpeta !== "papelera" && (
                            <div className="mt-5 rounded-lg border border-zinc-800 bg-black/30 p-3 sm:p-4">
                              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
                                <Reply className="h-4 w-4 text-yellow-400" />
                                Responder
                              </div>
                              <Textarea
                                value={respuesta}
                                onChange={(e) => setRespuesta(e.target.value)}
                                rows={5}
                                placeholder="Escribi tu respuesta..."
                                className="resize-y border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
                              />
                              <div className="mt-2 flex justify-end">
                                <Button
                                  onClick={enviarRespuesta}
                                  disabled={!respuesta.trim() || respondiendo}
                                  className="bg-yellow-400 font-semibold text-black hover:bg-yellow-500"
                                >
                                  {respondiendo ? (
                                    <>
                                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                      Enviando...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="mr-1.5 h-4 w-4" />
                                      Enviar respuesta
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {redactarAbierto && (
        <ModalRedactar
          abierto={redactarAbierto}
          onCerrar={() => setRedactarAbierto(false)}
          onEnviar={enviarNuevo}
        />
      )}
    </div>
  )
}
