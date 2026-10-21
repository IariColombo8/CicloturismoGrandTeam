"use client"

import { useState, useEffect } from "react"
import { Bike, Heart, Users, Shield, Clock, Calendar, Camera, Coffee } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { EVENTO } from "@/lib/constants"
import { Revelar } from "@/components/ui/Revelar"

export default function AboutTeam() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [isClient, setIsClient] = useState(false)

  const eventDate = new Date(EVENTO.fecha).getTime()

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

  // Que es esto, en cuatro ideas. Es cicloturismo: nadie corre contra nadie,
  // asi que no se habla de desafio ni de limites.
  const values = [
    {
      icon: Bike,
      title: "A tu ritmo",
      description: "No hay cronómetro ni podio. Se pedalea tranquilo y el grupo espera.",
      gradient: "from-yellow-500/10 to-amber-500/10",
      iconColor: "text-yellow-400",
      hoverGradient: "group-hover:from-yellow-500/25 group-hover:to-amber-500/25",
    },
    {
      icon: Users,
      title: "En grupo",
      description: "Se sale juntos y se vuelve juntos. Nadie queda solo en el camino.",
      gradient: "from-sky-500/10 to-cyan-500/10",
      iconColor: "text-sky-400",
      hoverGradient: "group-hover:from-sky-500/25 group-hover:to-cyan-500/25",
    },
    {
      icon: Camera,
      title: "Con paradas",
      description: "Hidratación cada 15 km y tiempo para la foto en las Ruinas.",
      gradient: "from-emerald-500/10 to-teal-500/10",
      iconColor: "text-emerald-400",
      hoverGradient: "group-hover:from-emerald-500/25 group-hover:to-teal-500/25",
    },
    {
      icon: Shield,
      title: "Acompañados",
      description: "Vehículo de apoyo, mecánica en ruta y seguro para todos.",
      gradient: "from-red-500/10 to-pink-500/10",
      iconColor: "text-red-400",
      hoverGradient: "group-hover:from-red-500/25 group-hover:to-pink-500/25",
    },
  ]

  const countdownItems = [
    { value: timeLeft.days, label: "Días" },
    { value: timeLeft.hours, label: "Horas" },
    { value: timeLeft.minutes, label: "Minutos" },
    { value: timeLeft.seconds, label: "Segundos" },
  ]

  return (
    <section
      id="nosotros"
      className="py-section bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden section-divider-top"
    >
      {/* Manchas de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado */}
        <Revelar className="text-center mb-8 sm:mb-16">
          <span className="section-eyebrow text-eyebrow mb-3 sm:mb-4">Quiénes somos</span>
          <h2 className="font-heading text-h2 text-white mb-2 sm:mb-4">
            <span className="gradient-text">Cicloturismo</span> en Concepción del Uruguay
          </h2>
          <p className="text-body-fluid text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
            Somos un grupo de gente que sale a andar en bici por los caminos de Entre Ríos.{" "}
            <span className="text-yellow-400 font-semibold">{EVENTO.distancia} hasta las Ruinas del Viejo Molino</span>,
            con el tiempo que haga falta.
          </p>
        </Revelar>

        {/* Las cuatro ideas */}
        <div className="gt-escalonar grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-12 sm:mb-20">
          {values.map((value) => {
            const IconComponent = value.icon
            return (
              <Revelar key={value.title} efecto="subir">
                <Card className="h-full bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-yellow-500/10 group">
                  <CardContent className="p-3 sm:p-6 text-center">
                    <div
                      className={`w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 bg-gradient-to-br ${value.gradient} ${value.hoverGradient} rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110`}
                    >
                      <IconComponent className={`w-5 h-5 sm:w-8 sm:h-8 ${value.iconColor}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-xs sm:text-base md:text-xl font-bold text-white mb-1 sm:mb-3 group-hover:text-yellow-400 transition-colors">
                      {value.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-[10px] sm:text-sm hidden sm:block">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </Revelar>
            )
          })}
        </div>

        {/* Cuenta regresiva */}
        <div className="mb-4 sm:mb-8 py-6 sm:py-12">
          <Revelar className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm mb-3 sm:mb-6">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
              <span className="text-xs sm:text-base md:text-lg font-semibold text-yellow-400">Cuenta regresiva</span>
            </div>
            <h3 className="font-heading text-h2 text-white mb-2 sm:mb-4 leading-tight px-2">
              Falta cada vez <span className="gradient-text">menos</span>
            </h3>
            <p className="text-xs sm:text-base md:text-lg text-gray-400 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              {EVENTO.fechaTexto}
            </p>
          </Revelar>

          <div className="gt-escalonar grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 md:gap-6 max-w-6xl mx-auto">
            {countdownItems.map((item) => (
              <Revelar key={item.label} efecto="escala">
                <div className="glass relative overflow-visible rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 group border border-yellow-400/20 hover:border-yellow-400/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl sm:rounded-2xl md:rounded-3xl" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black gradient-text mb-1 sm:mb-2 tabular-nums leading-none w-full text-center"
                      suppressHydrationWarning
                    >
                      {isClient ? String(item.value).padStart(2, "0") : "00"}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 uppercase tracking-wider font-semibold text-center">
                      {item.label}
                    </div>
                  </div>
                </div>
              </Revelar>
            ))}
          </div>
        </div>

        {/* Cierre: una linea que baja la ansiedad de quien nunca fue */}
        <Revelar className="text-center">
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 border border-zinc-800 rounded-full px-4 py-2">
            <Coffee className="w-4 h-4 text-yellow-400 shrink-0" aria-hidden="true" />
            Si nunca hiciste 50 km, igual podés venir: se va despacio y hay vehículo de apoyo.
            <Heart className="w-4 h-4 text-yellow-400 shrink-0" aria-hidden="true" />
          </p>
        </Revelar>
      </div>
    </section>
  )
}
