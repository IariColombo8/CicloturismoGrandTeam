"use client"

import Link from "next/link"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { ChevronRight, MapPin, Calendar, Mountain, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EVENTO } from "@/lib/constants"
import { ParallaxImage, EASE } from "@/components/home/motion-primitives"

export default function HeroSection() {
  const reduce = useReducedMotion()

  const heroData = [
    { icon: Mountain, value: EVENTO.distancia, label: "de ruta y ripio" },
    { icon: Calendar, value: "08 NOV", label: "2026" },
    { icon: MapPin, value: "C. del Uruguay", label: "Entre Ríos" },
  ]

  // Entrada escalonada del bloque de texto.
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
  }
  const item: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 32 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
      }

  return (
    <section
      id="inicio"
      className="relative min-h-[100svh] flex items-end overflow-hidden bg-warm-black grain"
    >
      {/* Foto protagonista con parallax */}
      <ParallaxImage
        src="/ruta-ciclismo-paisaje-entre-rios.jpg"
        alt=""
        priority
        strength={140}
        overlayClassName=""
      />

      {/* Velos de lectura: cálido abajo + viñeta lateral */}
      <div className="absolute inset-0 veil-warm" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_40%,rgba(12,11,8,0.5)_100%)]"
        aria-hidden="true"
      />

      {/* Contenido */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 pt-32">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl">
          {/* Kicker */}
          <motion.div variants={item} className="flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-gold" />
            <span className="kicker text-[11px] sm:text-xs text-gold">
              1er Cicloturismo · Ruinas del Viejo Molino
            </span>
          </motion.div>

          {/* Título display gigante */}
          <motion.h1
            variants={item}
            className="font-display font-bold uppercase leading-[0.92] text-sand text-[2.5rem] sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            Pedaleá
            <span className="block text-earth-gold">Entre Ríos</span>
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-sm sm:text-lg text-sand-muted leading-relaxed"
          >
            <span className="text-sand font-semibold">50 km</span> de ripio, río y monte por los
            paisajes más hermosos de Concepción del Uruguay. Aventura real, comunidad y aire libre.
          </motion.p>

          {/* Franja de datos clave (números como elemento visual) */}
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
            {heroData.map((d, i) => {
              const Icon = d.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gold shrink-0" aria-hidden="true" />
                  <div className="leading-none">
                    <p className="font-display text-xl sm:text-2xl font-semibold text-sand">
                      {d.value}
                    </p>
                    <p className="text-[11px] sm:text-xs text-sand-muted mt-1">{d.label}</p>
                  </div>
                </div>
              )
            })}
          </motion.div>

          {/* CTAs */}
          <motion.div variants={item} className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link href="/inscripcion" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group w-full sm:w-auto px-8 py-6 text-base font-bold uppercase tracking-wide font-display bg-gold text-warm-black hover:bg-gold-soft transition-all duration-300 rounded-none shadow-[0_8px_30px_rgba(255,215,0,0.25)] hover:shadow-[0_8px_40px_rgba(255,215,0,0.45)] hover:-translate-y-0.5"
              >
                Sumate a la ruta
                <ChevronRight className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-base font-semibold uppercase tracking-wide font-display border-2 border-sand/30 text-sand hover:border-gold hover:text-gold transition-all duration-300 rounded-none bg-transparent"
              asChild
            >
              <a href="#detalles">Ver el recorrido</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Indicador de scroll */}
      <a
        href="#nosotros"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-sand-muted hover:text-gold transition-colors group"
        aria-label="Bajar para ver más"
      >
        <span className="kicker text-[10px]">Scroll</span>
        <ArrowDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
      </a>
    </section>
  )
}
