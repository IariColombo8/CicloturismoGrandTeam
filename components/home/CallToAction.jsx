"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight, Sparkles } from "lucide-react"

export default function CallToAction() {
  return (
    <section id="contacto" className="py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,193,7,0.15),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <div className="glass p-8 md:p-12 rounded-3xl border-2 border-yellow-400/30 relative overflow-hidden group">
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/5 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400">Cupos Limitados</span>
              </div>

              {/* Title */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
                ¿Listo para el{" "}
                <span className="gradient-text-intense">
                  Desafío
                  <br className="hidden sm:block" /> de tu Vida?
                </span>
              </h2>

              {/* Description */}
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                No dejes pasar esta oportunidad única. Únete a cientos de ciclistas que ya confirmaron su participación
                en la aventura más emocionante del 2025.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/inscripcion">
                  <Button
                    size="lg"
                    className="group px-8 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-all duration-300 btn-glow rounded-xl shadow-lg shadow-yellow-400/20"
                  >
                    Inscribirme Ahora
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg font-semibold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-300 rounded-xl bg-transparent"
                  asChild
                >
                  <a href="mailto:info@grandteambike.com">Contactar</a>
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Inscripción segura</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Pago protegido</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Soporte 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-yellow-400 font-semibold mb-1">Email</div>
              <a href="mailto:info@grandteambike.com" className="text-gray-400 hover:text-yellow-400 transition-colors">
                info@grandteambike.com
              </a>
            </div>
            <div className="p-4">
              <div className="text-yellow-400 font-semibold mb-1">Teléfono</div>
              <a href="tel:+1234567890" className="text-gray-400 hover:text-yellow-400 transition-colors">
                +123 456 7890
              </a>
            </div>
            <div className="p-4">
              <div className="text-yellow-400 font-semibold mb-1">Redes Sociales</div>
              <div className="flex gap-4 justify-center">
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">
                  Facebook
                </a>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
