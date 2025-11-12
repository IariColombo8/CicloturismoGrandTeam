"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Navigation } from "lucide-react"

export default function RouteMap() {
  const mapRef = useRef(null)

  useEffect(() => {
    // Initialize map when component mounts
    if (mapRef.current && typeof window !== "undefined") {
      // This would integrate with a mapping library like Leaflet or Google Maps
      console.log("[v0] Map container ready for integration")
    }
  }, [])

  return (
    <section className="py-20 bg-gradient-to-b from-black to-zinc-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Recorrido del <span className="gradient-text">Evento</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Conoce el trazado completo de los 50 kilómetros por las rutas más hermosas de Concepción del Uruguay
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-6 h-6 text-yellow-400" />
                Mapa del Recorrido
              </CardTitle>
              <CardDescription className="text-gray-400">
                Explora la ruta completa con puntos de hidratación y zonas de descanso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Map placeholder - can be integrated with Leaflet or Google Maps */}
              <div
                ref={mapRef}
                className="w-full h-96 bg-zinc-900 rounded-lg border-2 border-yellow-400/30 flex items-center justify-center relative overflow-hidden"
              >
                <div className="text-center z-10">
                  <Navigation className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-white font-bold text-xl mb-2">Mapa Interactivo</p>
                  <p className="text-gray-400">Disponible próximamente</p>
                </div>

                {/* Decorative background */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-400 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-amber-500 rounded-full blur-3xl"></div>
                </div>
              </div>

              {/* Route details */}
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-zinc-900/50 border border-yellow-400/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h4 className="text-white font-bold">Punto de Salida</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Plaza Ramírez, Centro</p>
                </div>

                <div className="bg-zinc-900/50 border border-yellow-400/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h4 className="text-white font-bold">Hidratación</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Km 15, 30 y 40</p>
                </div>

                <div className="bg-zinc-900/50 border border-yellow-400/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <h4 className="text-white font-bold">Meta</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Plaza Ramírez, Centro</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
