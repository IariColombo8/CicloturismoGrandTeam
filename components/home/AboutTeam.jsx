"use client"

import { useState, useEffect } from "react"
import { Award, Heart, Mountain, Shield, Clock, Calendar, Users, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function AboutTeam() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [isClient, setIsClient] = useState(false)

  // Fecha del evento: 8 de Noviembre 2026
  const eventDate = new Date("2026-11-08T08:00:00").getTime()

  useEffect(() => {
    setIsClient(true)

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = eventDate - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [eventDate])

  const values = [
    {
      icon: Mountain,
      title: "Aventura Extrema",
      description: "Desafía tus límites en rutas de alta montaña con paisajes impresionantes y desafíos únicos.",
      gradient: "from-yellow-500/10 to-orange-500/10",
      iconColor: "text-yellow-400",
      hoverGradient: "group-hover:from-yellow-500/20 group-hover:to-orange-500/20",
    },
    {
      icon: Heart,
      title: "Comunidad Unida",
      description: "Forma parte de una familia de ciclistas apasionados que comparten tu amor por el deporte.",
      gradient: "from-red-500/10 to-pink-500/10",
      iconColor: "text-red-400",
      hoverGradient: "group-hover:from-red-500/20 group-hover:to-pink-500/20",
    },
    {
      icon: Shield,
      title: "Seguridad Primero",
      description: "Contamos con equipo de apoyo, asistencia médica y mecánica durante todo el recorrido.",
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-400",
      hoverGradient: "group-hover:from-blue-500/20 group-hover:to-cyan-500/20",
    },
    {
      icon: Award,
      title: "Experiencia Inolvidable",
      description: "Cada participante recibe medalla, kit de bienvenida y recuerdos que durarán toda la vida.",
      gradient: "from-purple-500/10 to-violet-500/10",
      iconColor: "text-purple-400",
      hoverGradient: "group-hover:from-purple-500/20 group-hover:to-violet-500/20",
    },
  ]

  const stats = [
    { value: "5+", label: "Años de Experiencia", icon: TrendingUp },
    { value: "1000+", label: "Ciclistas", icon: Users },
    { value: "300km", label: "Recorrido Total", icon: Mountain },
    { value: "100%", label: "Satisfacción", icon: Award },
  ]

  const countdownItems = [
    { value: timeLeft.days, label: "Días" },
    { value: timeLeft.hours, label: "Horas" },
    { value: timeLeft.minutes, label: "Minutos" },
    { value: timeLeft.seconds, label: "Segundos" },
  ]

  return (
    <section id="nosotros" className="py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
            ¿Por Qué <span className="gradient-text">Grand Team Bike</span>?
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Somos más que un evento de cicloturismo. Somos una experiencia transformadora que combina deporte,
            naturaleza y camaradería.
          </p>
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {values.map((value, index) => {
            const IconComponent = value.icon
            return (
              <Card
                key={index}
                className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/10 group"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${value.gradient} ${value.hoverGradient} rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110`}
                  >
                    <IconComponent className={`w-8 h-8 ${value.iconColor}`} aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors">
                    {value.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{value.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Countdown Timer */}
        <div className="mb-20 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm mb-6">
              <Clock className="w-5 h-5 text-yellow-400 animate-pulse" aria-hidden="true" />
              <span className="text-base md:text-lg font-semibold text-yellow-400">Cuenta Regresiva al Evento</span>
            </div>
            <h3 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-4 leading-tight">
              Faltan para el <span className="gradient-text">Gran Evento</span>
            </h3>
            <p className="text-lg md:text-xl text-gray-400 flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" aria-hidden="true" />
              8 de Noviembre 2026
            </p>
          </div>

          {/* Countdown display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-6xl mx-auto">
            {countdownItems.map((item, index) => (
              <div
                key={index}
                className="glass relative overflow-hidden rounded-3xl p-8 md:p-10 lg:p-12 hover:scale-105 transition-all duration-300 group border border-yellow-400/20 hover:border-yellow-400/50 hover:shadow-2xl hover:shadow-yellow-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black gradient-text mb-3 tabular-nums leading-none">
                    {isClient ? String(item.value).padStart(2, "0") : "00"}
                  </div>
                  <div className="text-sm md:text-base lg:text-lg text-gray-400 uppercase tracking-wider font-semibold">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

       
      </div>
    </section>
  )
}