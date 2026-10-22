"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Navigation, Flag, Droplet, Route, Clock, Bike, Heart } from "lucide-react"
import { Revelar } from "@/components/ui/Revelar"

export default function RouteMap() {
  const routeDetails = [
    {
      icon: Flag,
      color: "bg-green-500",
      title: "Punto de salida",
      description: "Camping El Molino",
      time: "08:00 AM",
      gradient: "from-green-500/20 to-green-600/5",
    },
    {
      icon: Droplet,
      color: "bg-blue-500",
      title: "Hidratación",
      description: "Km 15, 30 y 40",
      time: "Cada 15 km",
      gradient: "from-blue-500/20 to-blue-600/5",
    },
    {
      icon: Flag,
      color: "bg-red-500",
      title: "Llegada",
      description: "Camping El Molino",
      time: "~12:00 PM",
      gradient: "from-red-500/20 to-red-600/5",
    },
  ]

  const routeStats = [
    { icon: Route, label: "Distancia total", value: "50 km", color: "text-yellow-400" },
    { icon: Clock, label: "Tiempo estimado", value: "3-4 hrs", color: "text-blue-400" },
    { icon: Bike, label: "Exigencia", value: "Tranquila", color: "text-green-400" },
    { icon: Heart, label: "Puntos de apoyo", value: "5 estaciones", color: "text-red-400" },
  ]

  const servicios = [
    "Hidratación cada 15 km",
    "Asistencia médica en ruta",
    "Apoyo mecánico móvil",
    "Señalización completa",
    "Vehículo de escoba",
    "Seguro de accidentes",
  ]

  return (
    <section id="detalles" className="py-section bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Manchas de fondo */}
      {/* Solo desde tablet: en celular son capas enormes con blur que el
          telefono vuelve a pintar al scrollear (igual que en el hero). */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block" aria-hidden="true">
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado */}
        <Revelar className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center justify-center gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-yellow-400">Recorrido</span>
          </div>
          <h2 className="font-heading text-h2 text-white mb-2 sm:mb-4">
            La ruta del <span className="gradient-text">paseo</span>
          </h2>
          <p className="text-body-fluid text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
            <span className="text-yellow-400 font-semibold">50 kilómetros</span> de ripio y camino rural por los
            alrededores de Concepción del Uruguay, con salida y llegada en el mismo lugar.
          </p>
        </Revelar>

        {/* Numeros del recorrido */}
        <div className="gt-escalonar grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12 max-w-5xl mx-auto">
          {routeStats.map((stat) => {
            const IconComponent = stat.icon
            return (
              <Revelar key={stat.label} efecto="subir">
                <div className="h-full bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-xl p-3 sm:p-6 text-center hover:border-yellow-400/30 transition-all duration-300 hover:-translate-y-1 group">
                  <IconComponent
                    className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.color} mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}
                    aria-hidden="true"
                  />
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-0.5 sm:mb-1">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-medium">{stat.label}</p>
                </div>
              </Revelar>
            )
          })}
        </div>

        {/* Linea de tiempo del dia: se dibuja sola al llegar con el scroll */}
        <Revelar className="max-w-5xl mx-auto mb-8 sm:mb-12">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 sm:px-8 sm:py-8">
            {/* Riel de fondo y linea dorada que lo va cubriendo */}
            <div className="relative mb-6 h-1 rounded-full bg-zinc-800" aria-hidden="true">
              <div className="gt-linea absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500" />
            </div>

            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {routeDetails.map((detail) => {
                const IconComponent = detail.icon
                return (
                  <li
                    key={detail.title}
                    className={`bg-gradient-to-br ${detail.gradient} border border-zinc-800 rounded-xl p-4 sm:p-5 transition-all duration-300 hover:border-yellow-400/30 hover:-translate-y-1 group`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`${detail.color} w-3 h-3 sm:w-4 sm:h-4 rounded-full mt-1 group-hover:scale-125 transition-transform flex-shrink-0`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                          <h3 className="text-white font-bold text-sm sm:text-base md:text-lg">{detail.title}</h3>
                        </div>
                        <p className="text-gray-300 text-xs sm:text-sm mb-1">{detail.description}</p>
                        <p className="text-gray-500 text-[10px] sm:text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                          {detail.time}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </Revelar>

        <div className="max-w-6xl mx-auto">
          <Revelar efecto="escala">
            <Card className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 backdrop-blur-sm hover:border-yellow-400/30 transition-all duration-300">
              <CardHeader className="space-y-1 p-4 sm:p-6">
                <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" aria-hidden="true" />
                  Mapa del recorrido
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm md:text-base">
                  Con los puntos de hidratación y las zonas de apoyo
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="w-full h-64 sm:h-96 md:h-[500px] bg-zinc-900 rounded-xl border-2 border-yellow-400/20 flex items-center justify-center relative overflow-hidden group hover:border-yellow-400/40 transition-all">
                  <div className="text-center z-10 relative px-4">
                    <div className="mb-4 sm:mb-6 relative gt-aura inline-flex rounded-full p-3">
                      <Navigation
                        className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-yellow-400 mx-auto"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">Mapa interactivo</p>
                    <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-2 sm:mb-4">Disponible próximamente</p>
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
                      <span className="text-xs sm:text-sm text-yellow-400">Lo estamos preparando</span>
                    </div>
                  </div>

                  {/* Fondo decorativo */}
                  <div className="absolute inset-0 opacity-10 hidden sm:block" aria-hidden="true">
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-amber-500 rounded-full blur-3xl animate-float-delayed" />
                  </div>

                  {/* Cuadricula, como un mapa */}
                  <div
                    className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20"
                    aria-hidden="true"
                  />

                  {/* Ciclista cruzando el mapa */}
                  <div className="pointer-events-none absolute bottom-6 left-0 right-0 opacity-30" aria-hidden="true">
                    <Bike className="gt-ciclista w-8 h-8 text-yellow-400" />
                  </div>
                </div>

                {/* Que esta incluido */}
                <div className="bg-zinc-900/50 border border-yellow-400/20 rounded-xl p-4 sm:p-6">
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                    Servicios incluidos
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-gray-300 text-xs sm:text-sm">
                    {servicios.map((servicio) => (
                      <li key={servicio} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" aria-hidden="true" />
                        <span>{servicio}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Revelar>
        </div>
      </div>
    </section>
  )
}
