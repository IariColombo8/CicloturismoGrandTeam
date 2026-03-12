"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, onSnapshot, orderBy } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Html5Qrcode } from "html5-qrcode"
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
import Navbar from "@/components/layout/Navbar"

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
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
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

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  // Autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login?returnUrl=/admin/check-in")
      } else {
        try {
          const adminRef = collection(db, "administrador")
          const adminQuery = query(adminRef, where("email", "==", user.email))
          const adminSnapshot = await getDocs(adminQuery)

          if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data()
            if (adminData.role === "admin" || adminData.role === "grandteam") {
              setIsAuthorized(true)
              setUser(user)
            } else {
              router.push("/")
            }
          } else {
            router.push("/")
          }
        } catch (error) {
          console.error("Error verificando permisos:", error)
          router.push("/")
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  // Estadísticas en tiempo real
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "Participantes"), orderBy("fechaInscripcion", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inscripciones = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => d.numeroInscripcion) // Solo documentos de inscripción (no los de DNI)

      const confirmadas = inscripciones.filter((i: any) => i.estado === "confirmada")
      const presentes = inscripciones.filter((i: any) => i.checkedIn === true)

      setStats({
        totalConfirmadas: confirmadas.length,
        presentes: presentes.length,
        pendientes: confirmadas.length - presentes.length,
      })

      // Historial: últimos check-ins
      const checkIns = inscripciones
        .filter((i: any) => i.checkedIn === true && i.checkedInAt)
        .sort((a: any, b: any) => {
          const timeA = a.checkedInAt?.toMillis?.() || 0
          const timeB = b.checkedInAt?.toMillis?.() || 0
          return timeB - timeA
        })
        .slice(0, 10) as CheckInRecord[]

      setHistorial(checkIns)
    })

    return () => unsubscribe()
  }, [user])

  // Procesar token QR escaneado
  const procesarQR = useCallback(async (token: string) => {
    if (procesando) return
    setProcesando(true)
    setResultado(null)

    try {
      // Buscar inscripción por tokenQR
      const q = query(
        collection(db, "Participantes"),
        where("tokenQR", "==", token)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setResultado({
          tipo: "no-encontrado",
          mensaje: "No se encontró ninguna inscripción con este código QR.",
        })
        setProcesando(false)
        return
      }

      const docSnap = snapshot.docs[0]
      const data = docSnap.data()

      // Verificar si ya hizo check-in
      if (data.checkedIn) {
        const checkedInTime = data.checkedInAt?.toDate?.()
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
      await updateDoc(doc(db, "Participantes", docSnap.id), {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
        checkedInBy: user?.email || "desconocido",
      })

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
    if (scanning || !scannerContainerRef.current) return

    try {
      const html5QrCode = new Html5Qrcode("qr-reader")
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
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

      setScanning(true)
    } catch (error) {
      console.error("Error iniciando escáner:", error)
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
          await updateDoc(doc(db, "Participantes", participante.id), {
            checkedIn: true,
            checkedInAt: serverTimestamp(),
            checkedInBy: user?.email || "desconocido",
          })
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

  // Búsqueda manual por DNI o nombre
  const buscarManual = async () => {
    if (!busquedaManual.trim()) return
    setBuscando(true)
    setResultado(null)
    setResultadosMultiples([])

    try {
      const termino = busquedaManual.trim().toLowerCase()

      const q = query(collection(db, "Participantes"), orderBy("fechaInscripcion", "desc"))
      const snapshot = await getDocs(q)

      const resultados = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.numeroInscripcion)
        .filter((d: any) => {
          const nombre = `${d.nombre} ${d.apellido}`.toLowerCase()
          const dni = (d.dni || "").toLowerCase()
          return nombre.includes(termino) || dni.includes(termino)
        })

      if (resultados.length === 0) {
        setResultado({
          tipo: "no-encontrado",
          mensaje: `No se encontró ningún participante con "${busquedaManual}".`,
        })
      } else if (resultados.length === 1) {
        await hacerCheckInDirecto(resultados[0])
      } else {
        // Múltiples resultados - mostrar lista para elegir
        setResultadosMultiples(resultados)
      }
    } catch (error) {
      console.error("Error en búsqueda manual:", error)
      setResultado({ tipo: "error", mensaje: "Error al buscar. Intentá nuevamente." })
    } finally {
      setBuscando(false)
      setBusquedaManual("")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) return null

  const porcentajePresentes = stats.totalConfirmadas > 0
    ? Math.round((stats.presentes / stats.totalConfirmadas) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />

      <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              <QrCode className="w-8 h-8 inline-block mr-2 text-yellow-400" />
              Check-in <span className="gradient-text">QR</span>
            </h1>
            <p className="text-gray-400">Escaneá el código QR del participante para registrar su presencia</p>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-black/50 border-green-400/30">
              <CardContent className="p-4 text-center">
                <UserCheck className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-400">{stats.presentes}</p>
                <p className="text-xs text-gray-400">Presentes</p>
              </CardContent>
            </Card>
            <Card className="bg-black/50 border-yellow-400/30">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-400">{stats.pendientes}</p>
                <p className="text-xs text-gray-400">Por llegar</p>
              </CardContent>
            </Card>
            <Card className="bg-black/50 border-blue-400/30">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-400">{porcentajePresentes}%</p>
                <p className="text-xs text-gray-400">Asistencia</p>
              </CardContent>
            </Card>
          </div>

          {/* Escáner QR */}
          <Card className="bg-black/50 border-yellow-400/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-yellow-400" />
                Escáner de QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Contenedor del escáner */}
              <div
                id="qr-reader"
                ref={scannerContainerRef}
                className={`mx-auto mb-4 overflow-hidden rounded-xl ${scanning ? "max-w-sm" : "hidden"}`}
              />

              <div className="flex gap-3 justify-center">
                {!scanning ? (
                  <Button
                    onClick={iniciarScanner}
                    className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Abrir Cámara
                  </Button>
                ) : (
                  <Button
                    onClick={detenerScanner}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20 bg-transparent"
                    size="lg"
                  >
                    <CameraOff className="w-5 h-5 mr-2" />
                    Cerrar Cámara
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resultado del escaneo */}
          {procesando && (
            <Card className="bg-black/50 border-yellow-400/30 mb-6">
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-300">Procesando...</p>
              </CardContent>
            </Card>
          )}

          {resultado && (
            <Card
              className={`mb-6 border-2 ${
                resultado.tipo === "exito"
                  ? "bg-green-500/10 border-green-500/50"
                  : resultado.tipo === "ya-registrado"
                  ? "bg-yellow-500/10 border-yellow-500/50"
                  : resultado.tipo === "no-confirmada"
                  ? "bg-orange-500/10 border-orange-500/50"
                  : "bg-red-500/10 border-red-500/50"
              }`}
            >
              <CardContent className="p-6 text-center">
                {resultado.tipo === "exito" && (
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3 animate-bounce" />
                )}
                {resultado.tipo === "ya-registrado" && (
                  <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
                )}
                {resultado.tipo === "no-confirmada" && (
                  <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-3" />
                )}
                {(resultado.tipo === "no-encontrado" || resultado.tipo === "error") && (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                )}

                <p className={`text-lg font-semibold ${
                  resultado.tipo === "exito" ? "text-green-400" :
                  resultado.tipo === "ya-registrado" ? "text-yellow-400" :
                  resultado.tipo === "no-confirmada" ? "text-orange-400" :
                  "text-red-400"
                }`}>
                  {resultado.tipo === "exito" && "CHECK-IN EXITOSO"}
                  {resultado.tipo === "ya-registrado" && "YA REGISTRADO"}
                  {resultado.tipo === "no-confirmada" && "INSCRIPCIÓN NO CONFIRMADA"}
                  {resultado.tipo === "no-encontrado" && "NO ENCONTRADO"}
                  {resultado.tipo === "error" && "ERROR"}
                </p>
                <p className="text-gray-300 mt-2">{resultado.mensaje}</p>

                <Button
                  variant="ghost"
                  className="mt-4 text-gray-400 hover:text-white"
                  onClick={() => setResultado(null)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Búsqueda manual */}
          <Card className="bg-black/50 border-yellow-400/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Search className="w-5 h-5 text-yellow-400" />
                Búsqueda Manual (DNI o Nombre)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  value={busquedaManual}
                  onChange={(e) => setBusquedaManual(e.target.value)}
                  placeholder="Ingresá DNI o nombre del participante..."
                  className="bg-zinc-900 border-yellow-400/30 text-white placeholder:text-gray-500"
                  onKeyDown={(e) => e.key === "Enter" && buscarManual()}
                />
                <Button
                  onClick={buscarManual}
                  disabled={buscando || !busquedaManual.trim()}
                  className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black"
                >
                  {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados múltiples de búsqueda */}
          {resultadosMultiples.length > 0 && (
            <Card className="bg-black/50 border-yellow-400/20 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <Users className="w-5 h-5 text-yellow-400" />
                    {resultadosMultiples.length} resultados encontrados
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={() => setResultadosMultiples([])}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-400 mb-3">Seleccioná el participante para hacer check-in:</p>
                <div className="space-y-2">
                  {resultadosMultiples.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => hacerCheckInDirecto(p)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-yellow-400/10 hover:border-yellow-400/40 hover:bg-zinc-800/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        {p.checkedIn ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm text-white font-medium">
                            {p.nombre} {p.apellido}
                          </p>
                          <p className="text-xs text-gray-500">
                            DNI: {p.dni} — #{String(p.numeroInscripcion).padStart(3, "0")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.checkedIn ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            Presente
                          </Badge>
                        ) : (
                          <Badge className={`text-xs ${
                            p.estado === "confirmada"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : p.estado === "pendiente"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}>
                            {p.estado}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial reciente */}
          {historial.length > 0 && (
            <Card className="bg-black/50 border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  Últimos Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {historial.map((item: any, index: number) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/50 border border-green-500/10"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-white font-medium">
                            {item.nombre} {item.apellido}
                          </p>
                          <p className="text-xs text-gray-500">
                            #{String(item.numeroInscripcion).padStart(3, "0")} - DNI: {item.dni}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {item.checkedInAt?.toDate?.()?.toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }) || ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
