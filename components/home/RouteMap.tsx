"use client"

import { Flag, Droplet, MapPin, Mountain, Clock, Bike, Wrench, ShieldCheck } from "lucide-react"
import { ParallaxImage, Reveal } from "@/components/home/motion-primitives"

export default function RouteMap() {
  const routeStats = [
    { icon: Mountain, value: "50", unit: "km", label: "Distancia" },
    { icon: Clock, value: "3-4", unit: "hs", label: "Duración" },
    { icon: Bike, value: "Media", unit: "", label: "Dificultad" },
    { icon: Droplet, value: "5", unit: "", label: "Postas" },
  ]

  const stops = [
    {
      icon: Flag,
      time: "08:00",
      title: "Largada",
      place: "Camping El Molino",
      desc: "Concentración, acreditación y salida en grupo.",
      tone: "text-olive",
    },
    {
      icon: Droplet,
      time: "Km 15 · 30 · 40",
      title: "Postas de hidratación",
      place: "En ruta",
      desc: "Agua, fruta y un respiro cada 15 km.",
      tone: "text-sky-400",
    },
    {
      icon: Mountain,
      time: "Km 25",
      title: "Mirador del río",
      place: "Costa del Uruguay",
      desc: "El punto más lindo del trazado. Foto obligada.",
      tone: "text-ochre",
    },
    {
      icon: Flag,
      time: "~12:00",
      title: "Llegada",
      place: "Camping El Molino",
      desc: "Almuerzo, música y festejo entre todos.",
      tone: "text-gold",
    },
  ]

  const services = [
    { icon: Droplet, text: "Hidratación cada 15 km" },
    { icon: ShieldCheck, text: "Asistencia médica en ruta" },
    { icon: Wrench, text: "Apoyo mecánico móvil" },
    { icon: MapPin, text: "Señalización completa" },
    { icon: Bike, text: "Vehículo de escoba" },
    { icon: ShieldCheck, text: "Seguro de accidentes" },
  ]

  return (
    <section id="detalles" className="relative bg-warm-black grain overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-28">
        {/* Header */}
        <Reveal>
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-gold" />
            <span className="kicker text-[11px] text-gold">El recorrido</span>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display font-bold uppercase leading-[0.95] text-sand text-3xl sm:text-6xl lg:text-7xl max-w-3xl">
            50 kilómetros que <span className="text-earth-gold">no vas a olvidar</span>
          </h2>
        </Reveal>

        {/* Stats grandes */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-sand/10 rounded-xl overflow-hidden">
          {routeStats.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={i} delay={i * 0.07}>
                <div className="bg-warm-black-soft p-6 sm:p-8">
                  <Icon className="w-6 h-6 text-gold mb-4" aria-hidden="true" />
                  <p className="font-display font-bold text-sand text-4xl sm:text-5xl leading-none">
                    {s.value}
                    {s.unit && <span className="text-2xl sm:text-3xl text-sand-muted ml-1">{s.unit}</span>}
                  </p>
                  <p className="kicker text-[10px] text-sand-muted mt-3">{s.label}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>

      {/* Timeline del recorrido sobre paisaje con parallax */}
      <div className="relative py-20 sm:py-28 overflow-hidden">
        <ParallaxImage
          src="/ciclista-en-monta-a-con-paisaje-argentino.jpg"
          alt=""
          strength={100}
          overlayClassName="bg-warm-black/85"
        />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h3 className="font-display font-bold uppercase text-sand text-xl sm:text-4xl mb-12 text-center">
              Tu día, kilómetro a kilómetro
            </h3>
          </Reveal>

          <div className="relative max-w-3xl mx-auto">
            {/* Línea/sendero vertical */}
            <div
              className="absolute left-[19px] sm:left-1/2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-olive via-ochre to-gold sm:-translate-x-1/2"
              aria-hidden="true"
            />
            <div className="space-y-8 sm:space-y-12">
              {stops.map((stop, i) => {
                const Icon = stop.icon
                const isLeft = i % 2 === 0
                return (
                  <Reveal key={i} delay={i * 0.08} from={isLeft ? "right" : "left"}>
                    <div
                      className={`relative flex items-start gap-5 sm:gap-0 ${
                        isLeft ? "sm:flex-row" : "sm:flex-row-reverse"
                      }`}
                    >
                      {/* Nodo */}
                      <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 z-10 mt-1">
                        <div className="w-10 h-10 rounded-full bg-warm-black border-2 border-gold flex items-center justify-center">
                          <Icon className={`w-4 h-4 ${stop.tone}`} aria-hidden="true" />
                        </div>
                      </div>
                      {/* Card */}
                      <div className={`flex-1 pl-14 sm:pl-0 ${isLeft ? "sm:pr-12 sm:text-right" : "sm:pl-12"}`}>
                        <div className="bg-warm-black-soft/90 backdrop-blur-sm border border-sand/10 rounded-xl p-5 hover:border-gold/40 transition-colors duration-300">
                          <p className="kicker text-[10px] text-gold mb-1">{stop.time}</p>
                          <h4 className="font-display text-xl sm:text-2xl uppercase font-semibold text-sand">
                            {stop.title}
                          </h4>
                          <p className="text-xs text-sand-muted mt-0.5">{stop.place}</p>
                          <p className="text-sm text-sand-muted/90 mt-2 leading-relaxed">{stop.desc}</p>
                        </div>
                      </div>
                      <div className="hidden sm:block flex-1" aria-hidden="true" />
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Servicios incluidos */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal>
          <h3 className="font-display font-bold uppercase text-sand text-2xl sm:text-3xl mb-8 text-center">
            Todo incluido en tu inscripción
          </h3>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {services.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={i} delay={i * 0.05}>
                <div className="flex items-center gap-3 bg-warm-black-soft border border-sand/10 rounded-lg p-4 hover:border-gold/30 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-gold shrink-0" aria-hidden="true" />
                  <span className="text-sm text-sand">{s.text}</span>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
