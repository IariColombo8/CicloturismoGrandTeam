"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight, Sparkles, Instagram, Mail, Phone } from "lucide-react"

export default function CallToAction() {
  return (
    <section id="contacto" className="py-12 sm:py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,193,7,0.15),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card - COMPACTO EN MÓVIL */}
          <div className="glass p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl border-2 border-yellow-400/30 relative overflow-hidden group">
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/5 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 text-center">
              {/* Badge - COMPACTO EN MÓVIL */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                <span className="text-xs sm:text-sm font-semibold text-yellow-400">Cupos Limitados</span>
              </div>

              {/* Title - COMPACTO EN MÓVIL */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight px-2">
                ¿Listo para el{" "}
                <span className="gradient-text-intense">
                  Desafío
                  <br className="hidden sm:block" /> de tu Vida?
                </span>
              </h2>

              {/* Description - COMPACTO EN MÓVIL */}
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
                No dejes pasar esta oportunidad única. Únete a cientos de ciclistas que ya confirmaron su participación
                en la aventura más emocionante del 2026.
              </p>

              {/* CTA Buttons - STACK EN MÓVIL */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
                <Link href="/inscripcion" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="group w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-all duration-300 btn-glow rounded-xl shadow-lg shadow-yellow-400/20"
                  >
                    Inscribirme Ahora
                    <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="mailto:grandteamcdelu@gmail.com" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-300 rounded-xl bg-transparent"
                  >
                    Contactar
                  </Button>
                </a>
              </div>

              {/* Trust badges - COMPACTO EN MÓVIL */}
              <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span>Inscripción segura</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span>Pago protegido</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span>Soporte 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact info - COMPACTO EN MÓVIL */}
          <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Email */}
            <a 
              href="mailto:grandteamcdelu@gmail.com"
              className="block p-4 sm:p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-yellow-400/30 transition-all duration-300 group hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400/10 rounded-full flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-yellow-400/20 transition-colors">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                </div>
                <div className="text-yellow-400 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Email</div>
                <span className="text-gray-400 group-hover:text-yellow-400 transition-colors text-xs sm:text-sm break-all">
                  grandteamcdelu@gmail.com
                </span>
              </div>
            </a>

            {/* Phone */}
            <a 
              href="https://wa.me/5493442654257"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 sm:p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-yellow-400/30 transition-all duration-300 group hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400/10 rounded-full flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-yellow-400/20 transition-colors">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                </div>
                <div className="text-yellow-400 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">WhatsApp</div>
                <span className="text-gray-400 group-hover:text-yellow-400 transition-colors text-xs sm:text-sm">
                  +54 9 3442 654257
                </span>
              </div>
            </a>

            {/* Instagram */}
            <a 
              href="https://www.instagram.com/cicloturismo_grandteam?igsh=NTZqaGpiZG4ydmU0"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 sm:p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-yellow-400/30 transition-all duration-300 group hover:scale-105 md:col-span-1 col-span-1"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400/10 rounded-full flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-yellow-400/20 transition-colors">
                  <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                </div>
                <div className="text-yellow-400 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Instagram</div>
                <span className="text-gray-400 group-hover:text-yellow-400 transition-colors text-xs sm:text-sm">
                  @cicloturismo_grandteam
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}