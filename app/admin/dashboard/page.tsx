"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users, Clock, CheckCircle, DollarSign, TrendingUp,
  Calendar, MapPin, Award, Activity, Mail
} from "lucide-react"
import dynamic from "next/dynamic"

// Lazy load recharts - es una librería pesada
const LazyCharts = dynamic(() => import("@/components/admin/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-yellow-400 text-sm animate-pulse">Cargando gráficos...</div>
    </div>
  ),
})

export default function AdminDashboard() {
  const router = useRouter()
  const { user, userRole, loading: authLoading } = useFirebaseContext()
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  // Redirigir si no está autorizado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/dashboard")
    } else if (!authLoading && user && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, user, isAuthorized, router])

  // Cargar inscripciones solo cuando está autorizado
  useEffect(() => {
    if (!isAuthorized || !user) return

    const q = query(collection(db, "inscripciones"), orderBy("fechaInscripcion", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setInscripciones(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isAuthorized, user])

  const pendientes = inscripciones.filter((i) => i.estado === "pendiente")
  const aprobadas = inscripciones.filter((i) => i.estado === "confirmada")
  const rechazadas = inscripciones.filter((i) => i.estado === "rechazada")
  const ingresosConfirmados = aprobadas.length * 40000
  const ingresosPotenciales = pendientes.length * 40000

  if (authLoading || (!userRole && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-yellow-400 text-lg animate-pulse">Cargando Dashboard...</div>
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-20 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                Dashboard <span className="gradient-text">Grand Team Bike</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Métricas en tiempo real</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-yellow-900/20 border-yellow-400/30 hover:border-yellow-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Total</CardTitle>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-white">{inscripciones.length}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Participantes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 border-amber-400/30 hover:border-amber-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Pendientes</CardTitle>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-amber-400">{pendientes.length}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">En espera</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-green-900/20 border-green-400/30 hover:border-green-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Confirmadas</CardTitle>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-green-500">{aprobadas.length}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {!loading && inscripciones.length > 0 ? ((aprobadas.length / inscripciones.length) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-900/20 border-emerald-400/30 hover:border-emerald-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Ingresos</CardTitle>
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-emerald-500">${(ingresosConfirmados / 1000).toFixed(0)}k</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {!loading ? `+$${(ingresosPotenciales / 1000).toFixed(0)}k potenciales` : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Secundarias */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Conversión</CardTitle>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-7 w-14 bg-zinc-800 rounded animate-pulse" /> : (
                <div className="text-xl sm:text-3xl font-black text-yellow-400">
                  {inscripciones.length > 0 ? ((aprobadas.length / inscripciones.length) * 100).toFixed(1) : 0}%
                </div>
              )}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-amber-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${!loading && inscripciones.length > 0 ? (aprobadas.length / inscripciones.length) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Rechazadas</CardTitle>
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-7 w-10 bg-zinc-800 rounded animate-pulse" /> : <div className="text-xl sm:text-3xl font-black text-red-400">{rechazadas.length}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {!loading && inscripciones.length > 0 ? ((rechazadas.length / inscripciones.length) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Promedio</CardTitle>
              <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-3xl font-black text-green-400">$40k</div>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Por confirmado</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts - lazy loaded */}
        <LazyCharts
          inscripciones={inscripciones}
          ingresosConfirmados={ingresosConfirmados}
          ingresosPotenciales={ingresosPotenciales}
          aprobadas={aprobadas}
          pendientes={pendientes}
        />

        {/* Últimas Inscripciones */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              Últimas 5 Inscripciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                {inscripciones.slice(0, 5).map((inscripcion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 sm:p-4 bg-zinc-900 rounded-lg border border-yellow-400/10 hover:border-yellow-400/30 transition-all gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-bold text-xs sm:text-base">
                        {inscripcion.nombre?.charAt(0)}{inscripcion.apellido?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-xs sm:text-base truncate">
                          {inscripcion.nombre} {inscripcion.apellido}
                        </p>
                        <p className="text-gray-400 text-xs hidden sm:flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {inscripcion.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                        inscripcion.estado === "confirmada"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : inscripcion.estado === "pendiente"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}>
                        {inscripcion.estado?.toUpperCase()}
                      </span>
                      <p className="text-gray-500 text-xs mt-1 hidden sm:block">{inscripcion.categoria}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}