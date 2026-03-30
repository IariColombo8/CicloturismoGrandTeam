"use client"

import { useEffect, useState } from "react"
import { collection, query, onSnapshot, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MapPin, Calendar, Clock, Mountain, Bike, ChevronRight } from "lucide-react"
import dynamic from "next/dynamic"

// Lazy load del mapa (leaflet no funciona en SSR)
const CiclosMap = dynamic(() => import("@/components/home/CiclosMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center">
      <div className="text-yellow-400 text-sm animate-pulse">Cargando mapa...</div>
    </div>
  ),
})

export default function CiclosProvincia() {
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, "ciclos"),
      where("publicado", "==", true)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => {
          if (a.fecha && b.fecha) return b.fecha.localeCompare(a.fecha)
          if (a.fecha) return -1
          if (b.fecha) return 1
          return 0
        })
      setCiclos(data)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsubscribe()
  }, [])

  const dificultadColor = {
    facil: "text-green-400 bg-green-400/10 border-green-400/30",
    media: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    dificil: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    extrema: "text-red-400 bg-red-400/10 border-red-400/30",
  }

  // No renderizar la sección si no hay ciclos publicados
  if (!loading && ciclos.length === 0) return null

  return (
    <section id="ciclos" className="py-12 sm:py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
            <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-yellow-400">Ciclos de la Provincia</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-3 sm:mb-4">
            Próximos <span className="gradient-text">Ciclos</span>
          </h2>
          <p className="text-base sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed px-2">
            Explorá las rutas ciclísticas de la provincia. Desde paseos recreativos hasta desafíos extremos.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-yellow-400 text-lg animate-pulse">Cargando ciclos...</div>
          </div>
        ) : (
          <>
            {/* Mapa de Entre Ríos */}
            <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
              <CiclosMap ciclos={ciclos} />
            </div>

            {/* Cards de ciclos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
              {ciclos.filter((c) => c.destacado).map((ciclo) => (
                <article
                  key={ciclo.id}
                  className="group bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-2xl overflow-hidden hover:border-yellow-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 active:scale-[0.99]"
                >
                  <div className="h-2 sm:h-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600" />
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          dificultadColor[ciclo.dificultad] || dificultadColor.media
                        }`}
                      >
                        {ciclo.dificultad?.charAt(0).toUpperCase() + ciclo.dificultad?.slice(1)}
                      </span>
                      {ciclo.destacado && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                          Destacado
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2 group-hover:text-yellow-400 transition-colors">
                      {ciclo.nombre}
                    </h3>

                    {ciclo.localidad && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-3 sm:mb-4">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 flex-shrink-0" />
                        <span className="truncate">{ciclo.localidad}</span>
                      </div>
                    )}

                    {ciclo.descripcion && (
                      <p className="text-gray-400 text-sm mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3">{ciclo.descripcion}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="text-center p-2.5 sm:p-3 bg-zinc-800/50 rounded-lg">
                        <Mountain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-white font-bold text-xs sm:text-sm">{ciclo.distancia || "—"}</p>
                        <p className="text-gray-500 text-xs">km</p>
                      </div>
                      <div className="text-center p-2.5 sm:p-3 bg-zinc-800/50 rounded-lg">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-white font-bold text-xs sm:text-sm leading-tight">{ciclo.duracion || "—"}</p>
                        <p className="text-gray-500 text-xs">duración</p>
                      </div>
                      <div className="text-center p-2.5 sm:p-3 bg-zinc-800/50 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 mx-auto mb-1" />
                        <p className="text-white font-bold text-xs sm:text-sm">
                          {ciclo.fecha
                            ? new Date(ciclo.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                            : "—"}
                        </p>
                        <p className="text-gray-500 text-xs">fecha</p>
                      </div>
                    </div>

                    {ciclo.puntoSalida && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-3 sm:mb-4">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                        <span className="truncate">Salida: {ciclo.puntoSalida}</span>
                      </div>
                    )}

                    {ciclo.linkInscripcion && (
                      <a
                        href={ciclo.linkInscripcion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-xl transition-transform duration-200 shadow-lg hover:shadow-yellow-500/50 active:scale-95 text-sm sm:text-base"
                      >
                        Inscribirse
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
