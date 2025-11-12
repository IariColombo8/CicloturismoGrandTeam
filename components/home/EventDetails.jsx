"use client"

import { Calendar, Clock, MapPin, DollarSign, Package, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function EventDetails() {
  const details = [
    {
      icon: Calendar,
      title: "Fecha del Evento",
      content: "15 de Marzo de 2025",
      badge: "Confirmado",
    },
    {
      icon: Clock,
      title: "Horario",
      content: "Salida: 6:00 AM | Llegada estimada: 6:00 PM",
      badge: "12 Horas",
    },
    {
      icon: MapPin,
      title: "Ruta",
      content: "Inicio: Plaza Central | Final: Mirador del Valle",
      badge: "300km",
    },
    {
      icon: Users,
      title: "Categorías",
      content: "Libre | Competitivo | Familiar",
      badge: "3 Opciones",
    },
    {
      icon: DollarSign,
      title: "Inversión",
      content: "Inscripción: $50 USD | Incluye kit completo",
      badge: "Promo",
    },
    {
      icon: Package,
      title: "Incluye",
      content: "Jersey, medalla, hidratación, seguro y apoyo",
      badge: "Full Pack",
    },
  ]

  return (
    <section id="detalles" className="py-20 bg-gradient-to-b from-zinc-900 to-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Detalles del <span className="gradient-text">Evento</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Todo lo que necesitas saber sobre la experiencia Grand Team Bike 2025
          </p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {details.map((detail, index) => (
            <Card
              key={index}
              className="bg-black/50 border-yellow-400/20 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105 glass"
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                    <detail.icon className="w-6 h-6 text-yellow-400" />
                  </div>
                  <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400 border-none">
                    {detail.badge}
                  </Badge>
                </div>
                <CardTitle className="text-white text-lg">{detail.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 leading-relaxed">{detail.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Route map visual */}
        <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-400/30">
          <CardHeader>
            <CardTitle className="text-white text-2xl text-center">Perfil de la Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 flex items-end justify-around gap-2 p-4 bg-black/30 rounded-lg">
              {/* Elevation profile visualization */}
              {[20, 45, 60, 75, 90, 70, 85, 95, 80, 65, 50, 40].map((height, index) => (
                <div key={index} className="flex-1 relative group">
                  <div
                    className="bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-t hover:from-yellow-300 hover:to-yellow-500 transition-all duration-300 cursor-pointer"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black px-2 py-1 rounded text-xs text-yellow-400 whitespace-nowrap">
                    {Math.floor(height * 25)}m
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-sm text-gray-400">
              <span>0km</span>
              <span>150km</span>
              <span>300km</span>
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">*Perfil de elevación aproximado - Dificultad: Alta</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
