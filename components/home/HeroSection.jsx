"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, MapPin, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-yellow-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,193,7,0.1),transparent_50%)]" />
      </div>

      {/* Floating elements for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Hero image - cyclist silhouette */}
      <div className="absolute inset-0 opacity-20">
        <img src="/ciclista-en-monta-a-silueta.jpg" alt="Cyclist silhouette" className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {/* Event badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-yellow-400">Evento Épico 2026</span>
          </div>

          {/* Main title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-balance">
            <span className="block text-white">Grand Team Bike</span>
            <span className="block gradient-text-intense">Cicloturismo Extremo</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed text-pretty">
            Únete a la aventura más desafiante del año.{" "}
            <span className="text-yellow-400 font-semibold">50km de pura adrenalina</span> a través de paisajes
            inolvidables.
          </p>

          {/* Quick info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
            <div className="glass p-4 rounded-xl hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Fecha</p>
              <p className="text-white font-bold">8 de Noviembre 2026</p>
            </div>
            <div className="glass p-4 rounded-xl hover:scale-105 transition-transform">
              <MapPin className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Ruta</p>
              <p className="text-white font-bold">50km de aventura</p>
            </div>
            <div className="glass p-4 rounded-xl hover:scale-105 transition-transform">
              <Users className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Cupos</p>
              <p className="text-white font-bold">Limitados</p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/inscripcion">
              <Button
                size="lg"
                className="group px-8 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-all duration-300 btn-glow rounded-xl"
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
              <a href="#detalles">Ver Detalles</a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                <span className="text-yellow-400 font-bold">✓</span>
              </div>
              <span>Seguro Incluido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                <span className="text-yellow-400 font-bold">✓</span>
              </div>
              <span>Apoyo Mecánico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                <span className="text-yellow-400 font-bold">✓</span>
              </div>
              <span>Hidratación</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-yellow-400/50 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-yellow-400 rounded-full" />
        </div>
      </div>
    </section>
  )
}
