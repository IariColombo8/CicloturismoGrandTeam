"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  Users,
  UserCheck,
  Clock,
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"

interface CheckInRecord {
  id: string
  nombre: string
  apellido: string
  dni: string
  numeroInscripcion: number
  estado: string
  checkedIn: boolean
  checkedInAt: any
  checkedInBy: string
  tokenQR: string
}

export default function CheckInPage() {
  const { user } = useSupabaseContext()
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)

  // Resultado del escaneo
  const [resultado, setResultado] = useState<{
    tipo: "exito" | "ya-registrado" | "no-encontrado" | "no-confirmada" | "error"
    mensaje: string
    participante?: any
  } | null>(null)

  // Búsqueda manual
  const [busquedaManual, setBusquedaManual] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [resultadosMultiples, setResultadosMultiples] = useState<any[]>([])

  // Estadísticas en tiempo real
  const [stats, setStats] = useState({
    totalConfirmadas: 0,
    presentes: 0,
    pendientes: 0,
  })

  // Historial reciente de check-ins
  const [historial, setHistorial] = useState<CheckInRecord[]>([])

  const scannerRef = useRef<Html5QrcodeType | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  // Estadisticas en tiempo real (solo conteos, no descarga toda la tabla)
  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      // Conteos en paralelo usando head: true (sin descargar filas)
      const [confirmRes, presentRes, histRes] = await Promise.all([
        supabase
          .from("participantes")
          .select("*", { count: "exact", head: true })
          .eq("estado", "confirmada"),
        supabase
          .from("participantes")
          .select("*", { count: "exact", head: true })
          .eq("checked_in", true),
        // Solo las ultimas 10 check-ins para el historial
        supabase
          .from("participantes")
          .select("id, nombre, apellido, dni, numero_inscripcion, estado, checked_in, checked_in_at, checked_in_by, token_qr")
          .eq("checked_in", true)
          .order("checked_in_at", { ascending: false })
          .limit(10),
      ])

      const totalConfirmadas = confirmRes.count ?? 0
      const presentes = presentRes.count ?? 0

      setStats({
        totalConfirmadas,
        presentes,
        pendientes: totalConfirmadas - presentes,
      })

      const checkIns = (histRes.data || []).map((d: any) => ({
        id: d.id,
        nombre: d.nombre,
        apellido: d.apellido,
        dni: d.dni,
        numeroInscripcion: d.numero_inscripcion,
        estado: d.estado,
        checkedIn: d.checked_in,
        checkedInAt: d.checked_in_at,
        checkedInBy: d.checked_in_by,
        tokenQR: d.token_qr,
      })) as CheckInRecord[]

      setHistorial(checkIns)
      setLoading(false)
    }
    fetchStats()

    const channel = supabase
      .channel("checkin-participantes")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, () => {
        fetchStats()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Procesar token QR escaneado
  const procesarQR = useCallback(async (token: string) => {
    if (procesando) return
    setProcesando(true)
    setResultado(null)

    try {
      // Buscar inscripción por tokenQR
      const { data: rows, error } = await supabase
        .from("participantes")
        .select("*")
        .eq("token_qr", token)
        .limit(1)

      if (error) throw error

      if (!rows || rows.length === 0) {
        setResultado({
          tipo: "no-encontrado",
          mensaje: "No se encontró ninguna inscripción con este código QR.",
        })
        setProcesando(false)
        return
      }

      const row = rows[0]
      const data = {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        checkedIn: row.checked_in,
        checkedInAt: row.checked_in_at,
        estado: row.estado,
        numeroInscripcion: row.numero_inscripcion,
        tokenQR: row.token_qr,
      }

      // Verificar si ya hizo check-in
      if (data.checkedIn) {
        const checkedInTime = data.checkedInAt ? new Date(data.checkedInAt) : null
        const timeStr = checkedInTime
          ? checkedInTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
          : ""

        setResultado({
          tipo: "ya-registrado",
          mensaje: `${data.nombre} ${data.apellido} ya hizo check-in${timeStr ? ` a las ${timeStr}` : ""}.`,
          participante: data,
        })
        setProcesando(false)
        return
      }

      // Verificar estado de la inscripción
      if (data.estado !== "confirmada") {
        setResultado({
          tipo: "no-confirmada",
          mensaje: `La inscripción de ${data.nombre} ${data.apellido} está en estado "${data.estado}". Solo se puede hacer check-in a inscripciones confirmadas.`,
          participante: data,
        })
        setProcesando(false)
        return
      }

      // Realizar check-in
      const { error: updateError } = await supabase
        .from("participantes")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.email || "desconocido",
        })
        .eq("id", data.id)
      if (updateError) throw updateError

      setResultado({
        tipo: "exito",
        mensaje: `Check-in exitoso para ${data.nombre} ${data.apellido} (#${String(data.numeroInscripcion).padStart(3, "0")})`,
        participante: data,
      })
    } catch (error) {
      console.error("Error procesando QR:", error)
      setResultado({
        tipo: "error",
        mensaje: "Error al procesar el código QR. Intentá nuevamente.",
      })
    } finally {
      setProcesando(false)
    }
  }, [procesando, user])

  // Iniciar escáner
  const iniciarScanner = useCallback(async () => {
    if (scanning) return

    // Primero hacer visible el contenedor para que html5-qrcode pueda renderizar
    setScanning(true)

    // Esperar un frame para que el DOM se actualice
    await new Promise((r) => setTimeout(r, 100))

    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const html5QrCode = new Html5Qrcode("qr-reader")
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Éxito al escanear
          procesarQR(decodedText)
          // Pausar brevemente para evitar escaneos múltiples
          html5QrCode.pause()
          setTimeout(() => {
            try {
              if (html5QrCode.getState() === 3) { // PAUSED
                html5QrCode.resume()
              }
            } catch (e) {
              // Ignorar si el scanner ya se detuvo
            }
          }, 3000)
        },
        () => {
          // Error de escaneo silencioso (normal cuando no hay QR en vista)
        }
      )
    } catch (error) {
      console.error("Error iniciando escáner:", error)
      setScanning(false)
      setResultado({
        tipo: "error",
        mensaje: "No se pudo acceder a la cámara. Verificá los permisos del navegador.",
      })
    }
  }, [scanning, procesarQR])

  // Detener escáner
  const detenerScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (e) {
        // Ignorar errores al detener
      }
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop()
          scannerRef.current.clear()
        } catch (e) {
          // Ignorar
        }
      }
    }
  }, [])

  // Hacer check-in directo a un participante seleccionado
  const hacerCheckInDirecto = async (participante: any) => {
    setResultadosMultiples([])
    setProcesando(true)

    try {
      if (participante.tokenQR) {
        await procesarQR(participante.tokenQR)
      } else {
        if (participante.checkedIn) {
          setResultado({
            tipo: "ya-registrado",
            mensaje: `${participante.nombre} ${participante.apellido} ya hizo check-in.`,
            participante,
          })
        } else if (participante.estado !== "confirmada") {
          setResultado({
            tipo: "no-confirmada",
            mensaje: `Inscripción en estado "${participante.estado}". Solo se puede hacer check-in a confirmadas.`,
            participante,
          })
        } else {
          await supabase.from("participantes").update({
            checked_in: true,
            checked_in_at: new Date().toISOString(),
            checked_in_by: user?.email || "desconocido",
          }).eq("id", participante.id)
          setResultado({
            tipo: "exito",
            mensaje: `Check-in exitoso para ${participante.nombre} ${participante.apellido}`,
            participante,
          })
        }
      }
    } catch (error) {
      console.error("Error en check-in directo:", error)
      setResultado({ tipo: "error", mensaje: "Error al hacer check-in." })
    } finally {
      setProcesando(false)
    }
  }

  // Busqueda manual por DNI o nombre (server-side, sin descargar toda la tabla)
  const buscarManual = async () => {
    if (!busquedaManual.trim()) return
    setBuscando(true)
    setResultado(null)
    setResultadosMultiples([])

    try {
      const termino = busquedaManual.trim()
      const likeTerm = `%${termino}%`

      // Busqueda server-side con ilike
      const { data: rows, error: searchError } = await supabase
        .from("participantes")
        .select("id, nombre, apellido, dni, numero_inscripcion, estado, checked_in, checked_in_at, token_qr")
        .not("numero_inscripcion", "is", null)
        .or(`nombre.ilike.${likeTerm},apellido.ilike.${likeTerm},dni.ilike.${likeTerm}`)
        .order("fecha_inscripcion", { ascending: false })
        .limit(20)

      if (searchError) throw searchError

      const resultados = (rows || []).map((d: any) => ({
        id: d.id,
        nombre: d.nombre,
        apellido: d.apellido,
        dni: d.dni,
        numeroInscripcion: d.numero_inscripcion,
        estado: d.estado,
        checkedIn: d.checked_in,
        checkedInAt: d.checked_in_at,
        tokenQR: d.token_qr,
      }))

      if (resultados.length === 0) {
        setResultado({
          tipo: "no-encontrado",
          mensaje: `No se encontro ningun participante con "${busquedaManual}".`,
        })
      } else if (resultados.length === 1) {
        await hacerCheckInDirecto(resultados[0])
      } else {
        setResultadosMultiples(resultados)
      }
    } catch (error) {
      console.error("Error en busqueda manual:", error)
      setResultado({ tipo: "error", mensaje: "Error al buscar. Intenta nuevamente." })
    } finally {
      setBuscando(false)
      setBusquedaManual("")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    )
  }

  const porcentajePresentes = stats.totalConfirmadas > 0
    ? Math.round((stats.presentes / stats.totalConfirmadas) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-3 py-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <QrCode className="w-6 h-6 text-yellow-400" />
            Check-in <span className="gradient-text">QR</span>
          </h1>
          {/* Stats inline */}
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <span className="text-green-400 font-bold flex items-center gap-1">
              <UserCheck className="w-4 h-4" />
              {stats.presentes}
            </span>
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {stats.pendientes}
            </span>
            <span className="text-blue-400 font-bold">
              {porcentajePresentes}%
            </span>
          </div>
        </div>

        {/* Layout split: cámara | resultado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* COLUMNA IZQUIERDA: Cámara */}
          <div className="flex flex-col">
            <Card className="bg-black/50 border-yellow-400/20 flex-1">
              <CardContent className="p-3 sm:p-4">
                {/* Contenedor del escáner */}
                <div
                  id="qr-reader"
                  ref={scannerContainerRef}
                  style={{ display: scanning ? "block" : "none" }}
                  className="w-full rounded-xl mb-3"
                />

                {!scanning && (
                  <div className="flex items-center justify-center py-12 sm:py-16">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm mb-4">Cámara apagada</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  {!scanning ? (
                    <Button
                      onClick={iniciarScanner}
                      className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform w-full"
                      size="lg"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Abrir Cámara
                    </Button>
                  ) : (
                    <Button
                      onClick={detenerScanner}
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20 bg-transparent w-full"
                    >
                      <CameraOff className="w-4 h-4 mr-2" />
                      Cerrar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: Resultado + Búsqueda */}
          <div className="flex flex-col gap-4">
            {/* Resultado del escaneo */}
            <Card
              className={`border-2 flex-shrink-0 ${
                procesando
                  ? "bg-black/50 border-yellow-400/30"
                  : resultado
                  ? resultado.tipo === "exito"
                    ? "bg-green-500/10 border-green-500/50"
                    : resultado.tipo === "ya-registrado"
                    ? "bg-yellow-500/10 border-yellow-500/50"
                    : resultado.tipo === "no-confirmada"
                    ? "bg-orange-500/10 border-orange-500/50"
                    : "bg-red-500/10 border-red-500/50"
                  : "bg-black/30 border-zinc-700/50"
              }`}
            >
              <CardContent className="p-4 sm:p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                {procesando ? (
                  <>
                    <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-2" />
                    <p className="text-gray-300">Procesando...</p>
                  </>
                ) : resultado ? (
                  <>
                    {resultado.tipo === "exito" && (
                      <CheckCircle2 className="w-12 h-12 text-green-500 mb-2 animate-bounce" />
                    )}
                    {resultado.tipo === "ya-registrado" && (
                      <AlertTriangle className="w-12 h-12 text-yellow-500 mb-2" />
                    )}
                    {resultado.tipo === "no-confirmada" && (
                      <AlertTriangle className="w-12 h-12 text-orange-500 mb-2" />
                    )}
                    {(resultado.tipo === "no-encontrado" || resultado.tipo === "error") && (
                      <XCircle className="w-12 h-12 text-red-500 mb-2" />
                    )}

                    <p className={`text-lg font-bold ${
                      resultado.tipo === "exito" ? "text-green-400" :
                      resultado.tipo === "ya-registrado" ? "text-yellow-400" :
                      resultado.tipo === "no-confirmada" ? "text-orange-400" :
                      "text-red-400"
                    }`}>
                      {resultado.tipo === "exito" && "CHECK-IN EXITOSO"}
                      {resultado.tipo === "ya-registrado" && "YA REGISTRADO"}
                      {resultado.tipo === "no-confirmada" && "NO CONFIRMADA"}
                      {resultado.tipo === "no-encontrado" && "NO ENCONTRADO"}
                      {resultado.tipo === "error" && "ERROR"}
                    </p>
                    <p className="text-gray-300 text-sm mt-1">{resultado.mensaje}</p>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-gray-400 hover:text-white"
                      onClick={() => setResultado(null)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Limpiar
                    </Button>
                  </>
                ) : (
                  <>
                    <QrCode className="w-10 h-10 text-gray-600 mb-2" />
                    <p className="text-gray-500 text-sm">Escaneá un QR para ver el resultado</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Búsqueda manual */}
            <Card className="bg-black/50 border-yellow-400/20">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Búsqueda manual (DNI o Nombre)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={busquedaManual}
                    onChange={(e) => setBusquedaManual(e.target.value)}
                    placeholder="DNI o nombre..."
                    className="bg-zinc-900 border-yellow-400/30 text-white placeholder:text-gray-500 text-sm h-9"
                    onKeyDown={(e) => e.key === "Enter" && buscarManual()}
                  />
                  <Button
                    onClick={buscarManual}
                    disabled={buscando || !busquedaManual.trim()}
                    className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black h-9 px-3"
                  >
                    {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resultados múltiples */}
            {resultadosMultiples.length > 0 && (
              <Card className="bg-black/50 border-yellow-400/20">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white font-medium">
                      {resultadosMultiples.length} resultados
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white h-6 w-6 p-0"
                      onClick={() => setResultadosMultiples([])}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {resultadosMultiples.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => hacerCheckInDirecto(p)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-yellow-400/10 hover:border-yellow-400/40 transition-all text-left"
                      >
                        <div className="flex items-center gap-2">
                          {p.checkedIn ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm text-white font-medium">
                              {p.nombre} {p.apellido}
                            </p>
                            <p className="text-xs text-gray-500">
                              DNI: {p.dni}
                            </p>
                          </div>
                        </div>
                        <Badge className={`text-xs ${
                          p.checkedIn
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : p.estado === "confirmada"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {p.checkedIn ? "Presente" : p.estado}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Historial reciente - debajo del split, ancho completo */}
        {historial.length > 0 && (
          <Card className="bg-black/50 border-yellow-400/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-400" />
                Últimos Check-ins
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {historial.map((item: any, index: number) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/50 border border-green-500/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate">
                          {item.nombre} {item.apellido}
                        </p>
                        <p className="text-xs text-gray-500">
                          #{String(item.numeroInscripcion).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {item.checkedInAt
                        ? new Date(item.checkedInAt).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
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
