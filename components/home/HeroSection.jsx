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

  // Función para scroll suave a secciones
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
      color: "text-yellow-400"
    },
    {
      icon: MapPin,
      label: "Ruta",
      value: "50km de aventura",
      color: "text-yellow-400"
    },
    {
      icon: Users,
      label: "Cupos",
      value: "Limitados",
      color: "text-yellow-400"
    }
  ]

  const trustIndicators = [
    { icon: Shield, text: "Seguro Incluido" },
    { icon: Wrench, text: "Apoyo Mecánico" },
    { icon: Droplet, text: "Hidratación" }
  ]

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-yellow-900/30" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,193,7,0.1),transparent_50%)]" />
      </div>

      {/* Floating elements for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl animate-float-delayed"
        />
      </div>

      {/* Hero image - cyclist silhouette */}
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
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

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div
          className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Main title - MÁS COMPACTO PARA MÓVIL */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-3 sm:mb-6 leading-tight">
            <span className="block text-white">1er CICLOTURISMO</span>
            <span className="block text-yellow-400 text-xl sm:text-3xl md:text-4xl lg:text-6xl mt-1">
              RUINAS DEL VIEJO MOLINO
            </span>
          </h1>

          {/* Subtitle - MÁS PEQUEÑO */}
          <p className="text-xs sm:text-base md:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-2">
            Únete a la aventura más desafiante del año.{" "}
            <span className="text-yellow-400 font-semibold">50km de pura adrenalina</span> a través de paisajes
            inolvidables.
          </p>

          {/* Quick info cards - MUCHO MÁS COMPACTO */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-4 mb-4 sm:mb-8 max-w-3xl mx-auto">
            {quickInfoCards.map((card, index) => {
              const IconComponent = card.icon
              return (
                <div
                  key={index}
                  className="glass p-1.5 sm:p-4 rounded-md sm:rounded-xl hover:scale-105 transition-all duration-300 hover:bg-yellow-400/5"
                >
                  <IconComponent className={`w-3 h-3 sm:w-6 sm:h-6 ${card.color} mx-auto mb-0.5 sm:mb-2`} aria-hidden="true" />
                  <p className="text-[10px] sm:text-sm text-gray-400 leading-tight">{card.label}</p>
                  <p className="text-[10px] sm:text-base text-white font-bold leading-tight">{card.value}</p>
                </div>
              )
            })}
          </div>

          {/* CTA buttons - MÁS COMPACTOS */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center mb-4 sm:mb-0">
            <Link href="/inscripcion" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto group px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-all duration-300 btn-glow rounded-lg sm:rounded-xl shadow-lg hover:shadow-yellow-500/50"
              >
                Inscríbete Ahora
                <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-lg font-semibold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-300 rounded-lg sm:rounded-xl bg-transparent"
              asChild
            >
              <a href="#detalles" onClick={(e) => handleScrollToSection(e, "detalles")}>
                Ver Detalles
              </a>
            </Button>
          </div>

          {/* Trust indicators - COMPACTO EN MÓVIL */}
          <div className="mt-8 sm:mt-16 flex flex-wrap justify-center items-center gap-3 sm:gap-6 lg:gap-8 text-gray-300 text-xs sm:text-sm">
            {trustIndicators.map((indicator, index) => {
              const IconComponent = indicator.icon
              return (
                <div key={index} className="flex items-center gap-1 sm:gap-2 hover:text-yellow-400 transition-colors">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" aria-hidden="true" />
                  </div>
                  <span className="whitespace-nowrap">{indicator.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scroll indicator - OCULTO EN MÓVIL */}
      <a
        href="#nosotros"
        onClick={(e) => handleScrollToSection(e, "nosotros")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer group hidden md:block"
        aria-label="Scroll para ver más contenido"
      >
        <div className="w-6 h-10 border-2 border-yellow-400/50 rounded-full flex justify-center pt-2 group-hover:border-yellow-400 transition-colors">
          <div className="w-1 h-2 bg-yellow-400 rounded-full" />
        </div>
      </a>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </section>
  )
}