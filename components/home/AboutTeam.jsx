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

  // Fecha del evento: 8 de Noviembre 2026 a las 07:00 AM
  const eventDate = new Date("2026-11-08T07:00:00").getTime()

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
      description: "Desafiá tus límites recorriendo rutas de ripio en Entre Ríos.",
      gradient: "from-yellow-500/10 to-orange-500/10",
      iconColor: "text-yellow-400",
      hoverGradient: "group-hover:from-yellow-500/20 group-hover:to-orange-500/20",
    },
    {
      icon: Heart,
      title: "Comunidad Unida",
      description: "Unite a una comunidad de ciclistas apasionados.",
      gradient: "from-red-500/10 to-pink-500/10",
      iconColor: "text-red-400",
      hoverGradient: "group-hover:from-red-500/20 group-hover:to-pink-500/20",
    },
    {
      icon: Shield,
      title: "Seguridad Primero",
      description: "Equipo de apoyo y asistencia durante todo el recorrido.",
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-400",
      hoverGradient: "group-hover:from-blue-500/20 group-hover:to-cyan-500/20",
    },
    {
      icon: Award,
      title: "Experiencia Inolvidable",
      description: "Medalla, kit de bienvenida y experiencias memorables.",
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
    <section id="nosotros" className="py-12 sm:py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header - COMPACTO EN MÓVIL */}
        <div className="text-center mb-8 sm:mb-16 animate-fadeInUp">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-4">
            <span className="gradient-text">Cicloturismo</span> Concepción del Uruguay
          </h2>
          <p className="text-xs sm:text-base md:text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed px-2">
            Únete a la aventura más desafiante del año. <span className="text-yellow-400 font-semibold">50km de pura adrenalina</span> a través de paisajes inolvidables.
          </p>
        </div>

        {/* Values grid - 2 COLUMNAS EN MÓVIL */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-12 sm:mb-20">
          {values.map((value, index) => {
            const IconComponent = value.icon
            return (
              <Card
                key={index}
                className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/10 group"
              >
                <CardContent className="p-3 sm:p-6 text-center">
                  <div
                    className={`w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 bg-gradient-to-br ${value.gradient} ${value.hoverGradient} rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110`}
                  >
                    <IconComponent className={`w-5 h-5 sm:w-8 sm:h-8 ${value.iconColor}`} aria-hidden="true" />
                  </div>
                  <h3 className="text-xs sm:text-base md:text-xl font-bold text-white mb-1 sm:mb-3 group-hover:text-yellow-400 transition-colors">
                    {value.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-[10px] sm:text-sm hidden sm:block">{value.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Countdown Timer - COMPACTO EN MÓVIL */}
        <div className="mb-12 sm:mb-20 py-6 sm:py-12">
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm mb-3 sm:mb-6">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-pulse" aria-hidden="true" />
              <span className="text-xs sm:text-base md:text-lg font-semibold text-yellow-400">Cuenta Regresiva</span>
            </div>
            <h3 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-4 leading-tight px-2">
              Faltan para el <span className="gradient-text">Gran Evento</span>
            </h3>
            <p className="text-xs sm:text-base md:text-lg text-gray-400 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              8 de Noviembre 2026
            </p>
          </div>

          {/* Countdown display - COMPACTO EN MÓVIL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 md:gap-6 max-w-6xl mx-auto">
            {countdownItems.map((item, index) => (
              <div
                key={index}
                className="glass relative overflow-visible rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-6 md:p-8 hover:scale-105 transition-all duration-300 group border border-yellow-400/20 hover:border-yellow-400/50 hover:shadow-2xl hover:shadow-yellow-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl sm:rounded-2xl md:rounded-3xl" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black gradient-text mb-1 sm:mb-2 tabular-nums leading-none w-full text-center">
                    {isClient ? String(item.value).padStart(2, "0") : "00"}
                  </div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 uppercase tracking-wider font-semibold text-center">
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