"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Award, Heart, MessageCircle, Handshake, Star } from "lucide-react"

export default function Sponsors() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const sponsorTiers = {
    gold: [
      { name: "Sponsor Premium 1", logo: "/cycling-sponsor-logo-gold.jpg", tier: "Oro" },
      { name: "Sponsor Premium 2", logo: "/cycling-sponsor-logo-silver.jpg", tier: "Oro" },
    ],
    silver: [
      { name: "Sponsor Plata 1", logo: "/bike-sponsor-logo.jpg", tier: "Plata" },
      { name: "Sponsor Plata 2", logo: "/generic-sports-sponsor-logo.png", tier: "Plata" },
    ],
    bronze: [
      { name: "Sponsor Bronce 1", logo: "/cycling-gear-logo.jpg", tier: "Bronce" },
      { name: "Sponsor Bronce 2", logo: "/community-sponsor-logo.jpg", tier: "Bronce" },
    ],
  }

  const allSponsors = [
    ...sponsorTiers.gold,
    ...sponsorTiers.silver,
    ...sponsorTiers.bronze,
  ]

  const benefits = [
    { icon: Award, text: "Visibilidad en el evento" },
    { icon: Heart, text: "Apoyo a la comunidad" },
    { icon: Star, text: "Presencia en redes sociales" },
  ]

  // Número de WhatsApp (actualiza con el número real)
  const whatsappNumber = "5493442123456" // Formato: código país + código área + número (sin espacios ni guiones)
  const whatsappMessage = encodeURIComponent(
    "Hola! Me interesa ser patrocinador del evento Grand Team Bike 2026. Me gustaría recibir más información."
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <section id="patrocinadores" className="py-20 bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="inline-flex items-center justify-center gap-3 mb-4 px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
            <Heart className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            <span className="text-sm font-semibold text-yellow-400">Patrocinadores</span>
            <Award className="w-5 h-5 text-yellow-400" aria-hidden="true" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
            Nuestros <span className="gradient-text">Aliados</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Gracias a las empresas y organizaciones que hacen posible este gran evento deportivo
          </p>
        </div>

        {/* Sponsors Grid - Categorías */}
        <div className="max-w-6xl mx-auto mb-20">
          {/* Sponsors Oro */}
          {sponsorTiers.gold.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-center mb-6">
                <span className="text-yellow-400">★</span> Patrocinadores Oro <span className="text-yellow-400">★</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {sponsorTiers.gold.map((sponsor, index) => (
                  <SponsorCard key={index} sponsor={sponsor} size="large" delay={index * 100} />
                ))}
              </div>
            </div>
          )}

          {/* Sponsors Plata */}
          {sponsorTiers.silver.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-bold text-center text-gray-300 mb-6">
                Patrocinadores Plata
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sponsorTiers.silver.map((sponsor, index) => (
                  <SponsorCard key={index} sponsor={sponsor} size="medium" delay={(index + 2) * 100} />
                ))}
              </div>
            </div>
          )}

          {/* Sponsors Bronce */}
          {sponsorTiers.bronze.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-center text-gray-400 mb-6">
                Patrocinadores Bronce
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sponsorTiers.bronze.map((sponsor, index) => (
                  <SponsorCard key={index} sponsor={sponsor} size="small" delay={(index + 4) * 100} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Become a Sponsor CTA */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-yellow-400/10 via-amber-500/10 to-yellow-600/10 border border-yellow-400/30 backdrop-blur-sm overflow-hidden relative group hover:border-yellow-400/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-8 md:p-12 relative z-10">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Handshake className="w-8 h-8 text-yellow-400" aria-hidden="true" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4 text-center">
                ¿Quieres ser <span className="gradient-text">Patrocinador</span>?
              </h3>
              <p className="text-gray-400 text-lg mb-8 text-center max-w-2xl mx-auto leading-relaxed">
                Únete a las empresas que apoyan el ciclismo y el deporte en nuestra región. Obtén visibilidad y sé parte de esta increíble comunidad.
              </p>

              {/* Beneficios */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {benefits.map((benefit, index) => {
                  const IconComponent = benefit.icon
                  return (
                    <div key={index} className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mb-3">
                        <IconComponent className="w-6 h-6 text-yellow-400" aria-hidden="true" />
                      </div>
                      <p className="text-gray-300 text-sm">{benefit.text}</p>
                    </div>
                  )
                })}
              </div>

              {/* WhatsApp CTA Button */}
              <div className="text-center">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/50"
                >
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  Contactar por WhatsApp
                </a>
                <p className="text-gray-500 text-xs mt-3">
                  Respuesta rápida y personalizada
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

// Componente reutilizable para Sponsor Card
function SponsorCard({ sponsor, size = "medium", delay = 0 }) {
  const sizeClasses = {
    large: "p-10 md:p-12",
    medium: "p-8 md:p-10",
    small: "p-6 md:p-8",
  }

  const heightClasses = {
    large: "h-28 md:h-32",
    medium: "h-20 md:h-24",
    small: "h-16 md:h-20",
  }

  return (
    <Card
      className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 hover:border-yellow-400/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 group hover:shadow-xl hover:shadow-yellow-500/10"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className={`flex items-center justify-center ${sizeClasses[size]}`}>
        <div className={`relative w-full ${heightClasses[size]}`}>
          <Image
            src={sponsor.logo}
            alt={`Logo de ${sponsor.name}`}
            fill
            className="object-contain grayscale group-hover:grayscale-0 transition-all duration-300 opacity-70 group-hover:opacity-100"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        </div>
      </CardContent>
    </Card>
  )
}