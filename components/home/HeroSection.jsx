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
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Event badge */}
         

          {/* Main title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-balance">
            <span className="block text-white">1er CICLOTURISMO</span>
            
            <span className="block text-yellow-400 text-4xl sm:text-5xl md:text-6xl lg:text-7xl mt-2">RUINAS DEL VIEJO MOLINO</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed text-pretty">
            Únete a la aventura más desafiante del año.{" "}
            <span className="text-yellow-400 font-semibold">50km de pura adrenalina</span> a través de paisajes
            inolvidables.
          </p>

          {/* Quick info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
            {quickInfoCards.map((card, index) => {
              const IconComponent = card.icon
              return (
                <div
                  key={index}
                  className="glass p-4 rounded-xl hover:scale-105 transition-all duration-300 hover:bg-yellow-400/5"
                >
                  <IconComponent className={`w-6 h-6 ${card.color} mx-auto mb-2`} aria-hidden="true" />
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className="text-white font-bold">{card.value}</p>
                </div>
              )
            })}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/inscripcion">
              <Button
                size="lg"
                className="group px-8 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-all duration-300 btn-glow rounded-xl shadow-lg hover:shadow-yellow-500/50"
              >
                Inscríbete Ahora
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg font-semibold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-300 rounded-xl bg-transparent"
              asChild
            >
              <a href="#detalles" onClick={(e) => handleScrollToSection(e, "detalles")}>
                Ver Detalles
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-gray-300 text-sm">
            {trustIndicators.map((indicator, index) => {
              const IconComponent = indicator.icon
              return (
                <div key={index} className="flex items-center gap-2 hover:text-yellow-400 transition-colors">
                  <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <IconComponent className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                  </div>
                  <span>{indicator.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#nosotros"
        onClick={(e) => handleScrollToSection(e, "nosotros")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer group hidden sm:block"
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