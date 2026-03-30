"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, MapPin, Calendar, Users, Shield, Wrench, Droplet } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleScrollToSection = (e, sectionId) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const quickInfoCards = [
    {
      icon: Calendar,
      label: "Fecha",
      value: "8 de Noviembre 2026",
      color: "text-amber-400",
    },
    {
      icon: MapPin,
      label: "Ruta",
      value: "50km de aventura",
      color: "text-amber-400",
    },
    {
      icon: Users,
      label: "Cupos",
      value: "Limitados",
      color: "text-amber-400",
    },
  ]

  const trustIndicators = [
    { icon: Shield, text: "Seguro Incluido" },
    { icon: Wrench, text: "Apoyo Mecánico" },
    { icon: Droplet, text: "Hidratación" },
  ]

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800"
    >
      {/* Fondos mejorados con gradientes sofisticados */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20" />
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-amber-500/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-400/3 blur-3xl rounded-full" />
      </div>

      {/* Imagen de fondo con overlay */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <Image
          src="/ciclista-en-monta-a-silueta.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          quality={85}
          sizes="100vw"
        />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/10 border border-amber-400/20 mb-5 sm:mb-8 hover:border-amber-400/40 transition-colors">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-amber-300">Evento exclusivo 2026</span>
          </div>

          {/* Título */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-6 leading-tight">
            <span className="block text-white mb-1 sm:mb-2">1er CICLOTURISMO</span>
            <span className="block bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent leading-tight">
              RUINAS DEL VIEJO MOLINO
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-sm sm:text-xl md:text-2xl text-slate-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-light px-2">
            Únete a la aventura más desafiante del año.{" "}
            <span className="text-amber-300 font-semibold">50km de pura adrenalina</span> a través de paisajes
            inolvidables.
          </p>

          {/* Cards de información - siempre 3 columnas */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-12 max-w-3xl mx-auto">
            {quickInfoCards.map((card, index) => {
              const IconComponent = card.icon
              return (
                <div
                  key={index}
                  className="group relative p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 hover:border-amber-400/30 hover:bg-slate-800/60 transition-all duration-300"
                >
                  <div className="relative">
                    <IconComponent className={`w-4 h-4 sm:w-6 sm:h-6 ${card.color} mx-auto mb-1.5 sm:mb-3`} aria-hidden="true" />
                    <p className="text-[9px] sm:text-xs text-slate-400 uppercase tracking-wider">{card.label}</p>
                    <p className="text-white font-bold text-xs sm:text-lg mt-0.5 sm:mt-1 leading-tight">{card.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botones CTA */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10 sm:mb-16">
            <Link href="/inscripcion" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group w-full sm:w-auto px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all duration-300 rounded-xl shadow-lg hover:shadow-amber-500/30 hover:scale-105"
              >
                Inscríbete Ahora
                <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg font-semibold border-2 border-slate-600 text-slate-100 hover:bg-slate-700/50 hover:border-amber-400/50 transition-all duration-300 rounded-xl bg-slate-800/30 backdrop-blur-sm"
              asChild
            >
              <a href="#detalles" onClick={(e) => handleScrollToSection(e, "detalles")}>
                Ver Detalles
              </a>
            </Button>
          </div>

          {/* Indicadores de confianza */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-slate-400 text-xs sm:text-sm pt-6 sm:pt-8 border-t border-slate-700/50">
            {trustIndicators.map((indicator, index) => {
              const IconComponent = indicator.icon
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 sm:gap-3 group hover:text-amber-300 transition-colors duration-300"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-400/10 border border-amber-400/20 group-hover:border-amber-400/50 rounded-full flex items-center justify-center transition-all duration-300">
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <span>{indicator.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Indicador de scroll */}
      <a
        href="#nosotros"
        onClick={(e) => handleScrollToSection(e, "nosotros")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer group hidden sm:block"
        aria-label="Scroll para ver más contenido"
      >
        <div className="w-6 h-10 border-2 border-amber-400/30 group-hover:border-amber-400/60 rounded-full flex justify-center pt-2 transition-colors duration-300">
          <div className="w-1 h-2 bg-amber-400 rounded-full" />
        </div>
      </a>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 8s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </section>
  )
}
