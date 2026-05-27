"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users, Clock, CheckCircle, DollarSign, TrendingUp,
  Award, Activity, Mail, Pencil, Check, X
} from "lucide-react"
import dynamic from "next/dynamic"
import { formatCurrency, formatCurrencyShort } from "@/lib/format"

// Lazy load recharts - es una librería pesada
const LazyCharts = dynamic(() => import("@/app/admin/dashboard/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-yellow-400 text-sm animate-pulse">Cargando gráficos...</div>
    </div>
  ),
})

export default function AdminDashboard() {
  const router = useRouter()
  const { user, userRole, loading: authLoading, eventSettings } = useSupabaseContext()
  // Stats ligeros (solo conteos, no descarga filas)
  const [stats, setStats] = useState({ total: 0, pendientes: 0, confirmadas: 0, rechazadas: 0 })
  const [precioEntrada, setPrecioEntrada] = useState(0)
  const [editandoPrecio, setEditandoPrecio] = useState(false)
  const [precioTemp, setPrecioTemp] = useState("")
  const [ultimas, setUltimas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  // Redirigir si no esta autorizado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/dashboard")
    } else if (!authLoading && user && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, user, isAuthorized, router])

  // Cargar datos ligeros: conteos + ultimas 5
  useEffect(() => {
    if (!isAuthorized || !user) return

    const fetchData = async () => {
      const [totalRes, pendRes, confRes, rechRes, ultimasRes] = await Promise.all([
        supabase.from("inscripciones").select("*", { count: "exact", head: true }),
        supabase.from("inscripciones").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
        supabase.from("inscripciones").select("*", { count: "exact", head: true }).eq("estado", "confirmada"),
        supabase.from("inscripciones").select("*", { count: "exact", head: true }).eq("estado", "rechazada"),
        supabase
          .from("inscripciones")
          .select("id, estado, nombres, apellidos, email, talla_camiseta, fecha_inscripcion")
          .order("fecha_inscripcion", { ascending: false })
          .limit(5),
      ])

      setStats({
        total: totalRes.count ?? 0,
        pendientes: pendRes.count ?? 0,
        confirmadas: confRes.count ?? 0,
        rechazadas: rechRes.count ?? 0,
      })

      setUltimas(
        (ultimasRes.data || []).map((d: any) => ({
          id: d.id,
          nombre: d.nombres,
          apellido: d.apellidos,
          email: d.email,
          estado: d.estado,
          categoria: d.talla_camiseta || "",
        }))
      )
      setLoading(false)
    }
    fetchData()

    const channel = supabase
      .channel("dashboard-inscripciones")
      .on("postgres_changes", { event: "*", schema: "public", table: "inscripciones" }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isAuthorized, user])

  // Cargar precio desde eventSettings
  useEffect(() => {
    if (eventSettings?.precio) {
      setPrecioEntrada(eventSettings.precio)
    }
  }, [eventSettings])

  const guardarPrecio = async () => {
    const nuevo = parseInt(precioTemp) || 0
    if (nuevo <= 0) return
    setPrecioEntrada(nuevo)
    setEditandoPrecio(false)

    await supabase
      .from("event_settings")
      .update({ precio: nuevo })
      .eq("id", "eventSettings")

    // Actualizar cache
    try {
      sessionStorage.removeItem("event_settings_cache")
    } catch {}
  }

  const ingresosConfirmados = stats.confirmadas * precioEntrada
  const ingresosPotenciales = stats.pendientes * precioEntrada

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
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-white">{stats.total}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Participantes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 border-amber-400/30 hover:border-amber-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Pendientes</CardTitle>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-amber-400">{stats.pendientes}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">En espera</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-green-900/20 border-green-400/30 hover:border-green-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Confirmadas</CardTitle>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" /> : <div className="text-2xl sm:text-4xl font-black text-green-500">{stats.confirmadas}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {!loading && stats.total > 0 ? ((stats.confirmadas / stats.total) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-900/20 border-emerald-400/30 hover:border-emerald-400/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Ingresos</CardTitle>
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? (
                <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <div
                  className="text-2xl sm:text-4xl font-black text-emerald-500 tabular-nums truncate"
                  title={formatCurrency(ingresosConfirmados)}
                >
                  {formatCurrencyShort(ingresosConfirmados)}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {!loading
                  ? `+${formatCurrencyShort(ingresosPotenciales)} potenciales`
                  : ""}
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
                  {stats.total > 0 ? ((stats.confirmadas / stats.total) * 100).toFixed(1) : 0}%
                </div>
              )}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-amber-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${!loading && stats.total > 0 ? (stats.confirmadas / stats.total) * 100 : 0}%` }}
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
              {loading ? <div className="h-7 w-10 bg-zinc-800 rounded animate-pulse" /> : <div className="text-xl sm:text-3xl font-black text-red-400">{stats.rechazadas}</div>}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {!loading && stats.total > 0 ? ((stats.rechazadas / stats.total) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Precio Entrada</CardTitle>
              <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {editandoPrecio ? (
                <div className="flex items-center gap-1">
                  <span className="text-green-400 font-black text-lg">$</span>
                  <input
                    type="number"
                    value={precioTemp}
                    onChange={(e) => setPrecioTemp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && guardarPrecio()}
                    autoFocus
                    className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-white text-lg font-black focus:outline-none focus:border-green-400"
                  />
                  <button onClick={guardarPrecio} className="text-green-400 hover:text-green-300 p-0.5">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditandoPrecio(false)} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setPrecioTemp(String(precioEntrada)); setEditandoPrecio(true) }}
                  className="flex items-center gap-1.5 group"
                  title="Click para editar precio"
                >
                  <div className="text-xl sm:text-3xl font-black text-green-400">
                    {formatCurrencyShort(precioEntrada)}
                  </div>
                  <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
                </button>
              )}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Por inscripto</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts - lazy loaded */}
        <LazyCharts
          inscripciones={ultimas}
          ingresosConfirmados={ingresosConfirmados}
          ingresosPotenciales={ingresosPotenciales}
          aprobadas={ultimas.filter((i: any) => i.estado === "confirmada")}
          pendientes={ultimas.filter((i: any) => i.estado === "pendiente")}
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
                {ultimas.map((inscripcion, index) => (
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