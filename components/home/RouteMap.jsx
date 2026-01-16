"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Navigation, Flag, Droplet, Mountain, Clock, Bike, Heart } from "lucide-react"

export default function RouteMap() {
  const mapRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    
    // Initialize map when component mounts
    if (mapRef.current && typeof window !== "undefined") {
      console.log("[v0] Map container ready for integration")
    }
  }, [])

  const routeDetails = [
    {
      icon: Flag,
      color: "bg-green-500",
      title: "Punto de Salida",
      description: "Camping El Molino",
      time: "08:00 AM",
      gradient: "from-green-500/20 to-green-600/5"
    },
    {
      icon: Droplet,
      color: "bg-blue-500",
      title: "Hidratación",
      description: "Km 15, 30 y 40",
      time: "Cada 15km",
      gradient: "from-blue-500/20 to-blue-600/5"
    },
    {
      icon: Flag,
      color: "bg-red-500",
      title: "Meta Final",
      description: "Camping El Molino",
      time: "~12:00 PM",
      gradient: "from-red-500/20 to-red-600/5"
    }
  ]

  const routeStats = [
    {
      icon: Mountain,
      label: "Distancia Total",
      value: "50 km",
      color: "text-yellow-400"
    },
    {
      icon: Clock,
      label: "Tiempo Estimado",
      value: "3-4 hrs",
      color: "text-blue-400"
    },
    {
      icon: Bike,
      label: "Dificultad",
      value: "Media",
      color: "text-green-400"
    },
    {
      icon: Heart,
      label: "Puntos de Apoyo",
      value: "5 estaciones",
      color: "text-red-400"
    }
  ]

  return (
    <section id="detalles" className="py-12 sm:py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header - COMPACTO EN MÓVIL */}
        <div
          className={`text-center mb-8 sm:mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="inline-flex items-center justify-center gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-yellow-400">Recorrido</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-4">
            Ruta del <span className="gradient-text">Evento</span>
          </h2>
          <p className="text-xs sm:text-base md:text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed px-2">
            Conoce el trazado completo de los <span className="text-yellow-400 font-semibold">50 kilómetros</span> por las rutas más hermosas de Concepción del Uruguay
          </p>
        </div>

        {/* Route stats grid - 2 COLUMNAS EN MÓVIL */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12 max-w-5xl mx-auto">
          {routeStats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={index}
                className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-xl p-3 sm:p-6 text-center hover:border-yellow-400/30 transition-all duration-300 hover:scale-105 group"
              >
                <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.color} mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform`} aria-hidden="true" />
                <p className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-0.5 sm:mb-1">{stat.value}</p>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-medium">{stat.label}</p>
              </div>
            )
          })}
        </div>

        <div className="max-w-6xl mx-auto">
          <Card className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 backdrop-blur-sm hover:border-yellow-400/30 transition-all duration-300">
            <CardHeader className="space-y-1 p-4 sm:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" aria-hidden="true" />
                Mapa del Recorrido
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm md:text-base">
                Explora la ruta completa con puntos de hidratación y zonas de apoyo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Map placeholder - COMPACTO EN MÓVIL */}
              <div
                ref={mapRef}
                className="w-full h-64 sm:h-96 md:h-[500px] bg-zinc-900 rounded-xl border-2 border-yellow-400/20 flex items-center justify-center relative overflow-hidden group hover:border-yellow-400/40 transition-all"
              >
                <div className="text-center z-10 relative px-4">
                  <div className="mb-4 sm:mb-6 relative">
                    <Navigation className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-yellow-400 mx-auto animate-pulse" aria-hidden="true" />
                    <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto bg-yellow-400/20 rounded-full blur-xl animate-pulse" />
                  </div>
                  <p className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">Mapa Interactivo</p>
                  <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-2 sm:mb-4">Disponible próximamente</p>
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
                    <span className="text-xs sm:text-sm text-yellow-400">Estamos preparando algo increíble</span>
                  </div>
                </div>

                {/* Decorative background */}
                <div className="absolute inset-0 opacity-10" aria-hidden="true">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-float" />
                  <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-amber-500 rounded-full blur-3xl animate-float-delayed" />
                  <div className="absolute top-1/2 right-1/3 w-36 h-36 bg-blue-400 rounded-full blur-3xl" style={{ animationDelay: "2s" }} />
                </div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" aria-hidden="true" />
              </div>

              {/* Route details cards - COMPACTO EN MÓVIL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {routeDetails.map((detail, index) => {
                  const IconComponent = detail.icon
                  return (
                    <div
                      key={index}
                      className={`bg-gradient-to-br ${detail.gradient} border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-yellow-400/30 transition-all duration-300 hover:scale-105 group`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4 mb-2 sm:mb-3">
                        <div className={`${detail.color} w-3 h-3 sm:w-4 sm:h-4 rounded-full mt-1 group-hover:scale-125 transition-transform flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                            <h4 className="text-white font-bold text-sm sm:text-base md:text-lg">{detail.title}</h4>
                          </div>
                          <p className="text-gray-300 text-xs sm:text-sm mb-1">{detail.description}</p>
                          <p className="text-gray-500 text-[10px] sm:text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                            {detail.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Additional info - COMPACTO EN MÓVIL */}
              <div className="bg-zinc-900/50 border border-yellow-400/20 rounded-xl p-4 sm:p-6">
                <h4 className="text-white font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                  Servicios Incluidos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-gray-300 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    <span>Hidratación cada 15km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    <span>Asistencia médica en ruta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    <span>Apoyo mecánico móvil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    <span>Señalización completa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    <span>Vehículo de escoba</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    <span>Seguro de accidentes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </section>
  )
}