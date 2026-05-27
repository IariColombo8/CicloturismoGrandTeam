"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { onInscripciones, type Inscripcion } from "@/lib/services/inscripciones"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, TrendingUp, Bike } from "lucide-react"

interface ProvinciaData {
  provincia: string
  total: number
  confirmadas: number
  pendientes: number
  rechazadas: number
}

export default function CiclosProvinciaPage() {
  const router = useRouter()
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [loading, setLoading] = useState(true)

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/ciclos")
    } else if (!authLoading && user && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, user, isAuthorized, router])

  useEffect(() => {
    if (!isAuthorized || !user) return
    const unsubscribe = onInscripciones((data) => {
      setInscripciones(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [isAuthorized, user])

  // Agrupar por provincia
  const provinciasMap = new Map<string, ProvinciaData>()
  inscripciones.forEach((i) => {
    const prov = i.provincia || "Sin dato"
    const existing = provinciasMap.get(prov) || {
      provincia: prov,
      total: 0,
      confirmadas: 0,
      pendientes: 0,
      rechazadas: 0,
    }
    existing.total++
    if (i.estado === "confirmada") existing.confirmadas++
    else if (i.estado === "pendiente") existing.pendientes++
    else if (i.estado === "rechazada") existing.rechazadas++
    provinciasMap.set(prov, existing)
  })

  const provinciaData = Array.from(provinciasMap.values()).sort(
    (a, b) => b.total - a.total
  )

  const totalProvincias = provinciaData.length
  const provinciaMayor = provinciaData[0]

  if (authLoading || (!userRole && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-yellow-400 text-lg animate-pulse">
          Cargando...
        </div>
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-20 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
              <span className="gradient-text">Ciclistas</span> por Provincia
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Distribución geográfica de inscriptos
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-yellow-900/20 border-yellow-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">
                Provincias
              </CardTitle>
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? (
                <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <div className="text-2xl sm:text-4xl font-black text-white">
                  {totalProvincias}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                Representadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-green-900/20 border-green-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">
                Total Ciclistas
              </CardTitle>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? (
                <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <div className="text-2xl sm:text-4xl font-black text-green-400">
                  {inscripciones.length}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                Inscriptos
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2 lg:col-span-1 bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 border-amber-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">
                Mayor representación
              </CardTitle>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loading ? (
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <div className="text-lg sm:text-2xl font-black text-amber-400 truncate">
                  {provinciaMayor?.provincia || "—"}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {provinciaMayor
                  ? `${provinciaMayor.total} ciclistas`
                  : "Sin datos"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de provincias */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              Detalle por Provincia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-zinc-800 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : provinciaData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No hay inscripciones registradas
              </p>
            ) : (
              <>
                {/* Header de tabla */}
                <div className="hidden sm:grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-yellow-400/10 mb-2">
                  <span>Provincia</span>
                  <span className="text-center">Total</span>
                  <span className="text-center">Confirmadas</span>
                  <span className="text-center">Pendientes</span>
                  <span className="text-center">Rechazadas</span>
                </div>

                <div className="space-y-2">
                  {provinciaData.map((prov) => {
                    const porcentaje =
                      inscripciones.length > 0
                        ? ((prov.total / inscripciones.length) * 100).toFixed(1)
                        : "0"
                    return (
                      <div
                        key={prov.provincia}
                        className="p-3 sm:p-4 bg-zinc-900 rounded-lg border border-yellow-400/10 hover:border-yellow-400/30 transition-all"
                      >
                        {/* Versión desktop */}
                        <div className="hidden sm:grid grid-cols-5 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                              {prov.provincia.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">
                                {prov.provincia}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {porcentaje}% del total
                              </p>
                            </div>
                          </div>
                          <p className="text-center text-white font-bold text-lg">
                            {prov.total}
                          </p>
                          <p className="text-center text-green-400 font-semibold">
                            {prov.confirmadas}
                          </p>
                          <p className="text-center text-yellow-400 font-semibold">
                            {prov.pendientes}
                          </p>
                          <p className="text-center text-red-400 font-semibold">
                            {prov.rechazadas}
                          </p>
                        </div>

                        {/* Versión móvil */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-bold text-xs">
                                {prov.provincia.charAt(0)}
                              </div>
                              <span className="text-white font-semibold text-sm">
                                {prov.provincia}
                              </span>
                            </div>
                            <span className="text-white font-bold">
                              {prov.total}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-400">
                              ✓ {prov.confirmadas}
                            </span>
                            <span className="text-yellow-400">
                              ◷ {prov.pendientes}
                            </span>
                            <span className="text-red-400">
                              ✕ {prov.rechazadas}
                            </span>
                            <span className="text-gray-500 ml-auto">
                              {porcentaje}%
                            </span>
                          </div>
                          {/* Barra de progreso */}
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-gradient-to-r from-yellow-400 to-amber-600 h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${inscripciones.length > 0 ? (prov.total / inscripciones.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
