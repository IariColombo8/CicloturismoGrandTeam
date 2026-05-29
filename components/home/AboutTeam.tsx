"use client"

import { useState, useEffect } from "react"
import { Mountain, Heart, Shield, Compass, Clock } from "lucide-react"
import { EVENTO } from "@/lib/constants"
import { ParallaxImage, Reveal } from "@/components/home/motion-primitives"

export default function AboutTeam() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isClient, setIsClient] = useState(false)

  const eventDate = new Date(EVENTO.fecha).getTime()

  useEffect(() => {
    setIsClient(true)
    const calc = () => {
      const diff = eventDate - new Date().getTime()
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [eventDate])

  const values = [
    {
      icon: Compass,
      title: "Aventura real",
      description: "Rutas de ripio y monte entrerriano. Naturaleza pura, sin vueltas.",
    },
    {
      icon: Heart,
      title: "Comunidad",
      description: "Una tribu de ciclistas que pedalea junta y se banca en cada curva.",
    },
    {
      icon: Shield,
      title: "Vas seguro",
      description: "Apoyo mecánico, hidratación y asistencia en todo el recorrido.",
    },
    {
      icon: Mountain,
      title: "Paisaje único",
      description: "Río Uruguay, campos y las Ruinas del Viejo Molino de fondo.",
    },
  ]

  const countdown = [
    { value: timeLeft.days, label: "Días" },
    { value: timeLeft.hours, label: "Horas" },
    { value: timeLeft.minutes, label: "Min" },
    { value: timeLeft.seconds, label: "Seg" },
  ]

  return (
    <section id="nosotros" className="relative bg-earth grain overflow-hidden">
      {/* ── Manifiesto ── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-28">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-10 bg-ochre" />
                <span className="kicker text-[11px] text-ochre">El evento</span>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display font-bold uppercase leading-[0.95] text-sand text-3xl sm:text-6xl lg:text-7xl">
                No es una carrera.
                <span className="block text-earth-gold">Es una travesía.</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={0.1}>
              <p className="text-base sm:text-lg text-sand-muted leading-relaxed">
                El <span className="text-sand font-semibold">1er Cicloturismo Ruinas del Viejo Molino</span>{" "}
                te invita a recorrer 50 km por los caminos más lindos de Concepción del Uruguay.
                Sin cronómetro, a tu ritmo, rodeado de paisaje y buena gente.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Valores en formato editorial (lista, no cards iguales) */}
        <div className="mt-14 sm:mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-sand/10 rounded-xl overflow-hidden">
          {values.map((v, i) => {
            const Icon = v.icon
            return (
              <Reveal key={i} delay={i * 0.08} className="h-full">
                <div className="group h-full bg-warm-black-soft p-6 sm:p-8 hover:bg-olive-deep/30 transition-colors duration-300">
                  <Icon
                    className="w-8 h-8 text-gold mb-5 group-hover:scale-110 group-hover:text-gold-soft transition-transform duration-300"
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-xl sm:text-2xl uppercase font-semibold text-sand mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-sand-muted leading-relaxed">{v.description}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>

      {/* ── Franja de foto con parallax + Countdown superpuesto ── */}
      <div className="relative h-[60vh] min-h-[460px] flex items-center justify-center overflow-hidden">
        <ParallaxImage
          src="/ciclistas-en-grupo-pedaleando-en-carretera.jpg"
          alt=""
          strength={110}
          overlayClassName="bg-warm-black/75"
        />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 border border-gold/40 rounded-full backdrop-blur-sm">
              <Clock className="w-4 h-4 text-gold animate-pulse" aria-hidden="true" />
              <span className="kicker text-[11px] text-gold">Cuenta regresiva</span>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h3 className="font-display font-bold uppercase text-sand text-xl sm:text-4xl mb-8 sm:mb-10">
              Falta cada vez menos
            </h3>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex justify-center gap-3 sm:gap-6 md:gap-10">
              {countdown.map((c, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="font-display font-bold text-earth-gold text-4xl sm:text-7xl md:text-8xl tabular-nums leading-none">
                    {isClient ? String(c.value).padStart(2, "0") : "00"}
                  </span>
                  <span className="kicker text-[9px] sm:text-[11px] text-sand-muted mt-2 sm:mt-3">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-8 text-sm text-sand-muted">{EVENTO.fechaTexto}</p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
