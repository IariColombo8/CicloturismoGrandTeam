"use client"

// Check-in del dia del evento.
//
// Toda la logica (registro atomico, busqueda, cola sin señal) esta en
// lib/checkin.ts, con tests en e2e/unit/checkin.spec.ts. Esta pantalla:
//
// - Precarga la lista de confirmadas (unas 230 filas, liviano) y la mantiene al
//   dia por realtime + un refresco cada 30 s. Asi la busqueda es instantanea
//   mientras se escribe y un QR se reconoce sin esperar a la red.
// - Registra con un UPDATE condicional: si 2, 3 o 5 celulares escanean a la
//   misma persona a la vez, la base registra a UNO solo y los demas ven
//   "YA REGISTRADO" con quien y a que hora.
// - Sin señal no frena la fila: guarda el registro en el celular y lo sube solo.

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  UserCheck,
  Clock,
  Search,
  Loader2,
  AlertTriangle,
  Medal,
  RefreshCw,
  WifiOff,
  CloudUpload,
  Undo2,
} from "lucide-react"
import { formatNumeroInscripcion } from "@/lib/numeroInscripcion"
import { LIMITE_MEDALLAS } from "@/hooks/useMedallasRestantes"
import { reproducirAviso } from "@/lib/sonidoAviso"
import {
  CAMPOS_CHECKIN,
  aplicarFila,
  buscarParticipantes,
  cancelarCheckIn,
  encolar,
  esErrorDeRed,
  estadisticasCheckIn,
  extraerToken,
  horaCorta,
  leerCola,
  nombreCompleto,
  normalizarTexto,
  registrarCheckIn,
  resultadoUnico,
  sincronizarCola,
  ultimosCheckIns,
  type FilaCheckIn,
  type PendienteCheckIn,
  type TipoResultado,
} from "@/lib/checkin"

const CLAVE_LISTA = "gtb-checkin-lista"
const CLAVE_COLA = "gtb-checkin-cola"
// El mismo QR leido de nuevo en este lapso se ignora (la camara lo ve varias
// veces por segundo mientras la persona lo tiene adelante).
const IGNORAR_MISMO_QR_MS = 4000

type TipoPantalla = TipoResultado | "procesando" | "guardado-sin-senal"

interface Resultado {
  tipo: TipoPantalla
  mensaje: string
  fila?: FilaCheckIn
}

/** Solo las columnas del check-in (lo que llega por realtime trae la fila entera). */
function recortar(fila: Record<string, unknown>): FilaCheckIn {
  return {
    id: String(fila.id),
    nombre: (fila.nombre as string) ?? null,
    apellido: (fila.apellido as string) ?? null,
    dni: (fila.dni as string) ?? null,
    numero_inscripcion: (fila.numero_inscripcion as number) ?? null,
    estado: (fila.estado as string) ?? null,
    checked_in: (fila.checked_in as boolean) ?? null,
    checked_in_at: (fila.checked_in_at as string) ?? null,
    checked_in_by: (fila.checked_in_by as string) ?? null,
    token_qr: (fila.token_qr as string) ?? null,
    grupo_ciclistas: (fila.grupo_ciclistas as string) ?? null,
    localidad: (fila.localidad as string) ?? null,
  }
}

function leerStorage(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
function escribirStorage(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin storage (modo privado): la pantalla igual funciona con señal.
  }
}

function vibrar(patron: number | number[]) {
  try {
    navigator.vibrate?.(patron)
  } catch {}
}

export default function CheckInPage() {
  const { user } = useSupabaseContext()
  const email = user?.email || "desconocido"

  const [lista, setLista] = useState<FilaCheckIn[]>([])
  const [cargando, setCargando] = useState(true)
  const [listaDesde, setListaDesde] = useState<string | null>(null) // hora de la ultima carga buena
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [cola, setCola] = useState<PendienteCheckIn[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [remotos, setRemotos] = useState<FilaCheckIn[]>([]) // fuera de la lista (no confirmadas)
  const [buscandoRemoto, setBuscandoRemoto] = useState(false)
  const [confirmarDeshacer, setConfirmarDeshacer] = useState<string | null>(null)
  const [deshaciendo, setDeshaciendo] = useState<string | null>(null)

  const listaRef = useRef<FilaCheckIn[]>([])
  const colaRef = useRef<PendienteCheckIn[]>([])
  const enCursoRef = useRef<Set<string>>(new Set())
  const ultimoQrRef = useRef<{ token: string; en: number } | null>(null)
  const emailRef = useRef(email)
  const scannerRef = useRef<Html5QrcodeType | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  emailRef.current = email

  const actualizarLista = useCallback((nueva: FilaCheckIn[]) => {
    listaRef.current = nueva
    setLista(nueva)
  }, [])

  const actualizarCola = useCallback((nueva: PendienteCheckIn[]) => {
    colaRef.current = nueva
    setCola(nueva)
    escribirStorage(CLAVE_COLA, JSON.stringify(nueva))
  }, [])

  /** Aplica una fila a la lista, respetando lo que todavia esta en la cola local. */
  const aplicar = useCallback(
    (fila: FilaCheckIn) => {
      const pendiente = colaRef.current.find((p) => p.id === fila.id)
      const final = pendiente && !fila.checked_in
        ? { ...fila, checked_in: true, checked_in_at: pendiente.cuando, checked_in_by: `${pendiente.quien} (sin señal)` }
        : fila
      actualizarLista(aplicarFila(listaRef.current, final))
    },
    [actualizarLista],
  )

  // ---------------------------------------------------------------------------
  // Carga de la lista
  // ---------------------------------------------------------------------------
  const cargarLista = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("participantes")
        .select(CAMPOS_CHECKIN)
        .eq("estado", "confirmada")
        .order("apellido", { ascending: true })
        .limit(5000)
      if (error) throw error
      let filas = ((data ?? []) as unknown as Record<string, unknown>[]).map(recortar)
      // Lo que esta en la cola local se sigue viendo como registrado.
      for (const p of colaRef.current) {
        filas = filas.map((f) =>
          f.id === p.id && !f.checked_in
            ? { ...f, checked_in: true, checked_in_at: p.cuando, checked_in_by: `${p.quien} (sin señal)` }
            : f,
        )
      }
      actualizarLista(filas)
      const ahora = new Date().toISOString()
      setListaDesde(ahora)
      setErrorCarga(null)
      escribirStorage(CLAVE_LISTA, JSON.stringify({ guardado: ahora, filas }))
    } catch (error) {
      setErrorCarga(
        esErrorDeRed(error)
          ? "Sin señal: se usa la última lista guardada en este celular."
          : `No se pudo cargar la lista: ${(error as { message?: string })?.message ?? "error desconocido"}`,
      )
    } finally {
      setCargando(false)
    }
  }, [actualizarLista])

  // Arranque: primero lo guardado (pantalla al instante, tambien sin señal) y
  // despues la lista fresca.
  useEffect(() => {
    const colaGuardada = leerCola(leerStorage(CLAVE_COLA))
    colaRef.current = colaGuardada
    setCola(colaGuardada)

    try {
      const guardada = JSON.parse(leerStorage(CLAVE_LISTA) ?? "null")
      if (guardada && Array.isArray(guardada.filas)) {
        actualizarLista(guardada.filas.map(recortar))
        setListaDesde(guardada.guardado ?? null)
        setCargando(false)
      }
    } catch {}

    setOnline(typeof navigator === "undefined" ? true : navigator.onLine)
  }, [actualizarLista])

  useEffect(() => {
    if (!user) return
    cargarLista()

    const channel = supabase
      .channel("checkin-participantes")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, (payload) => {
        const nueva = payload.new as Record<string, unknown> | null
        if (payload.eventType === "DELETE" || !nueva || !nueva.id) {
          cargarLista()
          return
        }
        const fila = recortar(nueva)
        const estaba = listaRef.current.some((f) => f.id === fila.id)
        if (fila.estado === "confirmada" || estaba) aplicar(fila)
      })
      .subscribe()

    // Red de seguridad por si se pierde algun aviso de realtime.
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) cargarLista()
    }, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(intervalo)
    }
  }, [user, cargarLista, aplicar])

  // ---------------------------------------------------------------------------
  // Cola sin señal
  // ---------------------------------------------------------------------------
  const subirCola = useCallback(async () => {
    if (colaRef.current.length === 0 || subiendo) return
    setSubiendo(true)
    try {
      const { restante, resueltos } = await sincronizarCola(supabase, colaRef.current)
      // Pudieron entrar pendientes nuevos mientras se subia.
      const idsOriginales = new Set([...restante, ...resueltos.map((r) => r.pendiente)].map((p) => p.id))
      const nuevos = colaRef.current.filter((p) => !idsOriginales.has(p.id))
      actualizarCola([...restante, ...nuevos])
      for (const { resultado: r } of resueltos) if (r.fila) aplicar(r.fila)
    } finally {
      setSubiendo(false)
    }
  }, [actualizarCola, aplicar, subiendo])

  useEffect(() => {
    const alVolver = () => {
      setOnline(true)
      subirCola()
      cargarLista()
    }
    const alIrse = () => setOnline(false)
    window.addEventListener("online", alVolver)
    window.addEventListener("offline", alIrse)
    const intervalo = setInterval(() => {
      if (colaRef.current.length > 0 && navigator.onLine) subirCola()
    }, 10_000)
    return () => {
      window.removeEventListener("online", alVolver)
      window.removeEventListener("offline", alIrse)
      clearInterval(intervalo)
    }
  }, [subirCola, cargarLista])

  useEffect(() => {
    if (user && cola.length > 0 && online) subirCola()
    // Solo al tener sesion (al abrir la pagina con pendientes de antes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ---------------------------------------------------------------------------
  // Registrar
  // ---------------------------------------------------------------------------
  const registrar = useCallback(
    async (fila: FilaCheckIn) => {
      const nombre = nombreCompleto(fila)

      if (enCursoRef.current.has(fila.id)) return // doble toque
      if (fila.checked_in) {
        vibrar([90, 60, 90])
        setResultado({
          tipo: "ya-registrado",
          mensaje: `${nombre} ya está registrado${fila.checked_in_at ? ` desde las ${horaCorta(fila.checked_in_at)}` : ""}${fila.checked_in_by ? ` (${fila.checked_in_by})` : ""}.`,
          fila,
        })
        return
      }
      if (fila.estado !== "confirmada") {
        vibrar([200])
        setResultado({
          tipo: "no-confirmada",
          mensaje: `La inscripción de ${nombre} está "${fila.estado ?? "sin estado"}". Solo se registran las confirmadas.`,
          fila,
        })
        return
      }

      enCursoRef.current.add(fila.id)
      setResultado({ tipo: "procesando", mensaje: nombre, fila })
      try {
        const cuando = new Date().toISOString()
        const r = await registrarCheckIn(supabase, fila.id, emailRef.current, cuando)

        if (r.tipo === "sin-conexion") {
          actualizarCola(encolar(colaRef.current, { id: fila.id, nombre, cuando, quien: emailRef.current }))
          aplicar({ ...fila, checked_in: true, checked_in_at: cuando, checked_in_by: `${emailRef.current} (sin señal)` })
          setOnline(false)
          reproducirAviso()
          vibrar(80)
          setResultado({
            tipo: "guardado-sin-senal",
            mensaje: `${nombre} quedó registrado en este celular. Se sube solo cuando vuelva la señal.`,
            fila,
          })
          return
        }

        if (r.fila) aplicar(r.fila)

        if (r.tipo === "exito") {
          reproducirAviso()
          vibrar(80)
          setResultado({ tipo: "exito", mensaje: nombre, fila: r.fila ?? fila })
        } else if (r.tipo === "ya-registrado") {
          vibrar([90, 60, 90])
          const f = r.fila ?? fila
          setResultado({
            tipo: "ya-registrado",
            mensaje: `${nombre} ya estaba registrado${f.checked_in_at ? ` desde las ${horaCorta(f.checked_in_at)}` : ""}${f.checked_in_by ? ` (${f.checked_in_by})` : ""}.`,
            fila: f,
          })
        } else if (r.tipo === "no-confirmada") {
          vibrar([200])
          setResultado({
            tipo: "no-confirmada",
            mensaje: `La inscripción de ${nombre} ya no está confirmada ("${r.fila?.estado ?? "?"}").`,
            fila: r.fila ?? fila,
          })
        } else if (r.tipo === "no-encontrado") {
          vibrar([200])
          setResultado({ tipo: "no-encontrado", mensaje: `La inscripción de ${nombre} ya no existe en la base.` })
        } else {
          vibrar([200])
          setResultado({ tipo: r.tipo, mensaje: r.detalle ?? "No se pudo registrar.", fila })
        }
      } finally {
        enCursoRef.current.delete(fila.id)
      }
    },
    [actualizarCola, aplicar],
  )

  const registrarRef = useRef(registrar)
  registrarRef.current = registrar

  /** Lo que leyo la camara. Va por ref: el callback del escaner se arma una vez. */
  const procesarQR = useCallback(async (leido: string) => {
    const token = extraerToken(leido)
    if (!token) return
    const ahora = Date.now()
    const ultimo = ultimoQrRef.current
    if (ultimo && ultimo.token === token && ahora - ultimo.en < IGNORAR_MISMO_QR_MS) return
    ultimoQrRef.current = { token, en: ahora }

    const local = listaRef.current.find((f) => (f.token_qr ?? "").toLowerCase() === token)
    if (local) {
      await registrarRef.current(local)
      return
    }

    // No esta en la lista de confirmadas: puede ser alguien confirmado recien o
    // una inscripcion no confirmada. Se pregunta a la base.
    setResultado({ tipo: "procesando", mensaje: "Buscando el QR…" })
    try {
      const { data, error } = await supabase.from("participantes").select(CAMPOS_CHECKIN).eq("token_qr", token).limit(1)
      if (error) throw error
      const fila = data && data[0] ? recortar(data[0] as unknown as Record<string, unknown>) : null
      if (!fila) {
        vibrar([200])
        setResultado({ tipo: "no-encontrado", mensaje: "Este QR no es de ninguna inscripción." })
        return
      }
      await registrarRef.current(fila)
    } catch (error) {
      vibrar([200])
      setResultado({
        tipo: esErrorDeRed(error) ? "sin-conexion" : "error",
        mensaje: esErrorDeRed(error)
          ? "Sin señal y este QR no está en la lista guardada. Buscá a la persona por nombre o DNI."
          : `No se pudo leer el QR: ${(error as { message?: string })?.message ?? "error"}`,
      })
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Camara
  // ---------------------------------------------------------------------------
  const iniciarScanner = useCallback(async () => {
    if (scannerRef.current) return
    setScanning(true)
    await new Promise((r) => setTimeout(r, 50))
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      const lector = new Html5Qrcode("qr-reader", {
        verbose: false,
        // Solo QR: no pierde tiempo buscando codigos de barras.
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        // En Android usa el lector nativo del navegador, mucho mas rapido.
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      })
      scannerRef.current = lector
      await lector.start(
        { facingMode: "environment" },
        {
          fps: 15,
          // Recuadro grande: el QR se lee aunque no este centrado.
          qrbox: (w: number, h: number) => {
            const lado = Math.max(150, Math.floor(Math.min(w, h) * 0.75))
            return { width: lado, height: lado }
          },
        },
        (texto) => {
          procesarQR(texto)
        },
        () => {},
      )
    } catch (error) {
      console.error("Error iniciando escáner:", error)
      scannerRef.current = null
      setScanning(false)
      setResultado({
        tipo: "error",
        mensaje: "No se pudo abrir la cámara. Revisá los permisos del navegador (o buscá por nombre/DNI).",
      })
    }
  }, [procesarQR])

  const detenerScanner = useCallback(async () => {
    const lector = scannerRef.current
    scannerRef.current = null
    if (lector) {
      try {
        await lector.stop()
        lector.clear()
      } catch {}
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      const lector = scannerRef.current
      if (lector) {
        lector.stop().then(() => lector.clear()).catch(() => {})
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Busqueda
  // ---------------------------------------------------------------------------
  const resultadosBusqueda = useMemo(() => buscarParticipantes(lista, busqueda, 30), [lista, busqueda])

  // Si no esta entre las confirmadas, se busca en toda la base (para poder
  // decir "esta pendiente" en vez de "no existe").
  useEffect(() => {
    setRemotos([])
    const texto = normalizarTexto(busqueda)
    if (!texto || resultadosBusqueda.length > 0 || !online) return
    const palabras = texto.split(" ").filter((p) => p.length >= 3)
    const soloDigitos = busqueda.replace(/[\s.\-#]/g, "")
    const clave = /^\d{3,}$/.test(soloDigitos) ? soloDigitos : palabras.sort((a, b) => b.length - a.length)[0]
    if (!clave) return
    let vigente = true
    const t = setTimeout(async () => {
      setBuscandoRemoto(true)
      try {
        const { data } = await supabase
          .from("participantes")
          .select(CAMPOS_CHECKIN)
          .neq("estado", "confirmada")
          .or(`nombre.ilike.%${clave}%,apellido.ilike.%${clave}%,dni.ilike.%${clave}%`)
          .limit(50)
        if (!vigente) return
        const filas = ((data ?? []) as unknown as Record<string, unknown>[]).map(recortar)
        setRemotos(buscarParticipantes(filas, busqueda, 10).map((r) => r.fila))
      } catch {
        // Es solo una ayuda: si falla, queda "no encontrado".
      } finally {
        if (vigente) setBuscandoRemoto(false)
      }
    }, 350)
    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [busqueda, resultadosBusqueda.length, online])

  const elegir = (fila: FilaCheckIn) => {
    setBusqueda("")
    setRemotos([])
    registrar(fila)
    inputRef.current?.focus()
  }

  const alEnter = () => {
    const unico = resultadoUnico(resultadosBusqueda)
    if (unico) elegir(unico)
  }

  // ---------------------------------------------------------------------------
  // Deshacer (dos toques, sin ventanas del navegador)
  // ---------------------------------------------------------------------------
  const deshacer = async (fila: FilaCheckIn) => {
    if (confirmarDeshacer !== fila.id) {
      setConfirmarDeshacer(fila.id)
      setTimeout(() => setConfirmarDeshacer((actual) => (actual === fila.id ? null : actual)), 4000)
      return
    }
    setConfirmarDeshacer(null)

    // Si todavia estaba en la cola local, alcanza con sacarlo de ahi.
    if (colaRef.current.some((p) => p.id === fila.id)) {
      actualizarCola(colaRef.current.filter((p) => p.id !== fila.id))
      actualizarLista(aplicarFila(listaRef.current, { ...fila, checked_in: false, checked_in_at: null, checked_in_by: null }))
      setResultado(null)
      return
    }

    setDeshaciendo(fila.id)
    try {
      const r = await cancelarCheckIn(supabase, fila.id)
      if (r.tipo === "exito" && r.fila) {
        aplicar(r.fila)
        setResultado({ tipo: "error", mensaje: `Se deshizo el registro de ${nombreCompleto(fila)}.` })
      } else {
        setResultado({
          tipo: "error",
          mensaje: r.tipo === "sin-conexion" ? "Sin señal: no se pudo deshacer. Probá de nuevo con señal." : r.detalle ?? "No se pudo deshacer.",
        })
      }
    } finally {
      setDeshaciendo(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Pantalla
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => estadisticasCheckIn(lista), [lista])
  const historial = useMemo(() => ultimosCheckIns(lista, 12), [lista])

  if (cargando && lista.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
        <p className="text-gray-400 text-sm">Cargando la lista de inscriptos…</p>
      </div>
    )
  }

  const r = resultado
  const colorTarjeta =
    !r
      ? "bg-black/30 border-zinc-700/50"
      : r.tipo === "procesando"
      ? "bg-black/50 border-yellow-400/40"
      : r.tipo === "exito" || r.tipo === "guardado-sin-senal"
      ? "bg-green-500/10 border-green-500/60"
      : r.tipo === "ya-registrado"
      ? "bg-yellow-500/10 border-yellow-500/60"
      : r.tipo === "no-confirmada"
      ? "bg-orange-500/10 border-orange-500/60"
      : "bg-red-500/10 border-red-500/60"

  const titulo: Record<TipoPantalla, string> = {
    procesando: "REGISTRANDO…",
    exito: "CHECK-IN OK",
    "guardado-sin-senal": "REGISTRADO (SIN SEÑAL)",
    "ya-registrado": "YA REGISTRADO",
    "no-confirmada": "NO CONFIRMADA",
    "no-encontrado": "NO ENCONTRADO",
    "sin-permiso": "SIN PERMISO",
    "sin-conexion": "SIN SEÑAL",
    error: "ATENCIÓN",
  }

  const filaResultado = r?.fila
  const conMedalla =
    filaResultado?.numero_inscripcion != null && filaResultado.numero_inscripcion <= LIMITE_MEDALLAS

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-3 py-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <QrCode className="w-6 h-6 text-yellow-400" />
            Check-in <span className="gradient-text">QR</span>
          </h1>
          <div className="flex items-center gap-3 sm:gap-4 text-sm" aria-label="Presentes, faltan y porcentaje">
            <span className="text-green-400 font-bold flex items-center gap-1" title="Presentes">
              <UserCheck className="w-4 h-4" />
              {stats.presentes}
            </span>
            <span className="text-yellow-400 font-bold flex items-center gap-1" title="Faltan">
              <Clock className="w-4 h-4" />
              {stats.pendientes}
            </span>
            <span className="text-blue-400 font-bold">{stats.porcentaje}%</span>
          </div>
        </div>

        {/* Avisos de señal y cola */}
        {(!online || errorCarga) && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
            <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {errorCarga ?? "Sin señal."} Se puede seguir registrando: queda guardado en este celular.
              {listaDesde && ` Lista del ${new Date(listaDesde).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}.`}
            </span>
          </div>
        )}
        {cola.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
            <span className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 flex-shrink-0" />
              {cola.length === 1 ? "1 registro guardado" : `${cola.length} registros guardados`} en este celular, sin subir todavía.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={subirCola}
              disabled={subiendo}
              className="h-7 border-blue-400/50 bg-transparent text-blue-200 hover:bg-blue-500/20"
            >
              {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Subir ahora"}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Camara */}
          <div className="flex flex-col">
            <Card className="bg-black/50 border-yellow-400/20 flex-1">
              <CardContent className="p-3 sm:p-4">
                <div
                  id="qr-reader"
                  style={{ display: scanning ? "block" : "none" }}
                  className="w-full max-w-[280px] md:max-w-none mx-auto rounded-xl mb-3 overflow-hidden"
                />
                {!scanning && (
                  <div className="flex items-center justify-center py-8 sm:py-14">
                    <div className="text-center">
                      <Camera className="w-14 h-14 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Cámara apagada</p>
                    </div>
                  </div>
                )}
                {!scanning ? (
                  <Button
                    onClick={iniciarScanner}
                    className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black w-full"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Abrir cámara
                  </Button>
                ) : (
                  <Button
                    onClick={detenerScanner}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20 bg-transparent w-full"
                  >
                    <CameraOff className="w-4 h-4 mr-2" />
                    Cerrar cámara
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resultado + busqueda */}
          <div className="flex flex-col gap-4">
            <Card className={`border-2 flex-shrink-0 ${colorTarjeta}`} data-testid="resultado-checkin">
              <CardContent className="p-4 sm:p-6 text-center min-h-[150px] flex flex-col items-center justify-center">
                {!r ? (
                  <>
                    <QrCode className="w-10 h-10 text-gray-600 mb-2" />
                    <p className="text-gray-500 text-sm">Escaneá un QR o buscá por nombre / DNI</p>
                  </>
                ) : (
                  <>
                    {r.tipo === "procesando" && <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-2" />}
                    {(r.tipo === "exito" || r.tipo === "guardado-sin-senal") && (
                      <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                    )}
                    {(r.tipo === "ya-registrado" || r.tipo === "no-confirmada") && (
                      <AlertTriangle className={`w-12 h-12 mb-2 ${r.tipo === "ya-registrado" ? "text-yellow-500" : "text-orange-500"}`} />
                    )}
                    {["no-encontrado", "sin-permiso", "sin-conexion", "error"].includes(r.tipo) && (
                      <XCircle className="w-12 h-12 text-red-500 mb-2" />
                    )}

                    <p
                      className={`text-lg font-black ${
                        r.tipo === "exito" || r.tipo === "guardado-sin-senal"
                          ? "text-green-400"
                          : r.tipo === "ya-registrado" || r.tipo === "procesando"
                          ? "text-yellow-400"
                          : r.tipo === "no-confirmada"
                          ? "text-orange-400"
                          : "text-red-400"
                      }`}
                    >
                      {titulo[r.tipo]}
                    </p>

                    {filaResultado && (r.tipo === "exito" || r.tipo === "procesando") ? (
                      <p className="text-white text-xl sm:text-2xl font-bold mt-1">{nombreCompleto(filaResultado)}</p>
                    ) : (
                      <p className="text-gray-200 text-sm mt-1">{r.mensaje}</p>
                    )}

                    {filaResultado && r.tipo !== "procesando" && (
                      <p className="text-gray-400 text-xs mt-1">
                        {formatNumeroInscripcion(filaResultado.numero_inscripcion)}
                        {filaResultado.dni ? ` · DNI ${filaResultado.dni}` : ""}
                        {filaResultado.grupo_ciclistas && filaResultado.grupo_ciclistas !== "Sin grupo"
                          ? ` · ${filaResultado.grupo_ciclistas}`
                          : ""}
                      </p>
                    )}

                    {filaResultado &&
                      filaResultado.numero_inscripcion != null &&
                      ["exito", "guardado-sin-senal", "ya-registrado"].includes(r.tipo) && (
                        <span
                          className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black border ${
                            conMedalla
                              ? "bg-green-500/15 border-green-500/40 text-green-400"
                              : "bg-zinc-800 border-zinc-600 text-gray-300"
                          }`}
                        >
                          <Medal className="w-4 h-4" aria-hidden="true" />
                          {conMedalla ? "CON MEDALLA" : "SIN MEDALLA"}
                        </span>
                      )}

                    {r.tipo !== "procesando" && (
                      <div className="mt-3 flex items-center gap-2">
                        {filaResultado && (r.tipo === "exito" || r.tipo === "guardado-sin-senal") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={confirmarDeshacer === filaResultado.id ? "text-red-400" : "text-gray-400 hover:text-white"}
                            onClick={() => deshacer(filaResultado)}
                            disabled={deshaciendo === filaResultado.id}
                          >
                            <Undo2 className="w-3 h-3 mr-1" />
                            {confirmarDeshacer === filaResultado.id ? "¿Seguro? Tocá de nuevo" : "Deshacer"}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => setResultado(null)}>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Limpiar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Busqueda inteligente */}
            <Card className="bg-black/50 border-yellow-400/20">
              <CardContent className="p-3 sm:p-4">
                <label htmlFor="busqueda-checkin" className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Buscar por nombre, apellido o DNI (en cualquier orden)
                </label>
                <Input
                  id="busqueda-checkin"
                  ref={inputRef}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") alEnter()
                    if (e.key === "Escape") setBusqueda("")
                  }}
                  placeholder="Ej: iara, colombo, ia colomb, 35123456…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  className="bg-zinc-900 border-yellow-400/30 text-white placeholder:text-gray-500 text-base h-11"
                />

                {busqueda.trim() && (
                  <div className="mt-2 space-y-1.5 max-h-[320px] overflow-y-auto" data-testid="resultados-busqueda">
                    {resultadosBusqueda.length === 0 && remotos.length === 0 && (
                      <p className="text-xs text-gray-500 py-2 text-center">
                        {buscandoRemoto ? "Buscando en todas las inscripciones…" : `Nadie confirmado coincide con "${busqueda.trim()}".`}
                      </p>
                    )}
                    {[...resultadosBusqueda.map((x) => x.fila), ...remotos].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => elegir(p)}
                        className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-yellow-400/10 hover:border-yellow-400/40 active:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.checked_in ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-white font-semibold truncate">{nombreCompleto(p)}</p>
                            <p className="text-xs text-gray-500 truncate">
                              DNI {p.dni ?? "—"} · {formatNumeroInscripcion(p.numero_inscripcion)}
                              {p.localidad ? ` · ${p.localidad}` : ""}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`text-xs flex-shrink-0 ${
                            p.checked_in
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : p.estado === "confirmada"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-orange-500/20 text-orange-300 border-orange-500/30"
                          }`}
                        >
                          {p.checked_in ? `Presente ${horaCorta(p.checked_in_at)}` : p.estado === "confirmada" ? "Registrar" : p.estado}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ultimos registrados */}
        {historial.length > 0 && (
          <Card className="bg-black/50 border-yellow-400/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-400" />
                Últimos check-ins
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {historial.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/50 border border-green-500/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate">{nombreCompleto(item)}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {formatNumeroInscripcion(item.numero_inscripcion)}
                          {cola.some((p) => p.id === item.id) ? " · sin subir" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <p className="text-xs text-gray-400">{horaCorta(item.checked_in_at)}</p>
                      <button
                        type="button"
                        onClick={() => deshacer(item)}
                        disabled={deshaciendo === item.id}
                        title="Deshacer el check-in (tocá dos veces)"
                        className={`transition-colors disabled:opacity-50 ${
                          confirmarDeshacer === item.id ? "text-red-400" : "text-gray-500 hover:text-red-400"
                        }`}
                      >
                        {deshaciendo === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : confirmarDeshacer === item.id ? (
                          <span className="text-[10px] font-bold">¿Deshacer?</span>
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
