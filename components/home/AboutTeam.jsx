"use client"

import { Award, Heart, Mountain, Shield } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function AboutTeam() {
  const values = [
    {
      icon: Mountain,
      title: "Aventura Extrema",
      description: "Desafía tus límites en rutas de alta montaña con paisajes impresionantes y desafíos únicos.",
    },
    {
      icon: Heart,
      title: "Comunidad Unida",
      description: "Forma parte de una familia de ciclistas apasionados que comparten tu amor por el deporte.",
    },
    {
      icon: Shield,
      title: "Seguridad Primero",
      description: "Contamos con equipo de apoyo, asistencia médica y mecánica durante todo el recorrido.",
    },
    {
      icon: Award,
      title: "Experiencia Inolvidable",
      description: "Cada participante recibe medalla, kit de bienvenida y recuerdos que durarán toda la vida.",
    },
  ]

  return (
    <section id="nosotros" className="py-20 bg-gradient-to-b from-black to-zinc-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            ¿Por Qué <span className="gradient-text">Grand Team Bike</span>?
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Somos más que un evento de cicloturismo. Somos una experiencia transformadora que combina deporte,
            naturaleza y camaradería.
          </p>
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <Card
              key={index}
              className="bg-gradient-to-b from-zinc-900 to-black border-yellow-400/20 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105 group"
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-yellow-400/10 rounded-full flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                  <value.icon className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-gray-400 leading-relaxed">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "5+", label: "Años de Experiencia" },
            { value: "1000+", label: "Ciclistas" },
            { value: "300km", label: "Recorrido" },
            { value: "100%", label: "Satisfacción" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-black gradient-text mb-2">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
