"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Award, Heart, MessageCircle, Handshake, Star, Sparkles, Trophy } from "lucide-react"

export default function Sponsors() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const sponsorTiers = {
    gold: [
      { 
        name: "Sponsor Premium 1", 
        logo: "/cycling-sponsor-logo-gold.jpg", 
        tier: "Oro",
        link: "https://instagram.com/sponsor1", // Cambia por el link real
        linkType: "instagram" // instagram, whatsapp, facebook, website
      },
      { 
        name: "Sponsor Premium 2", 
        logo: "/cycling-sponsor-logo-silver.jpg", 
        tier: "Oro",
        link: "https://instagram.com/sponsor2",
        linkType: "instagram"
      },
    ],
    silver: [
      { 
        name: "Sponsor Plata 1", 
        logo: "/bike-sponsor-logo.jpg", 
        tier: "Plata",
        link: "https://instagram.com/sponsorplata1",
        linkType: "instagram"
      },
      { 
        name: "Sponsor Plata 2", 
        logo: "/generic-sports-sponsor-logo.png", 
        tier: "Plata",
        link: "https://wa.me/5493442123456",
        linkType: "whatsapp"
      },
      { 
        name: "Sponsor Plata 3", 
        logo: "/cycling-sponsor-logo-gold.jpg", 
        tier: "Plata",
        link: "https://facebook.com/sponsorplata3",
        linkType: "facebook"
      },
    ],
    bronze: [
     
      { 
        name: "Sponsor Bronce 4", 
        logo: "/cycling-sponsor-logo-silver.jpg", 
        tier: "Bronce",
        link: "https://instagram.com/sponsorbronce4",
        linkType: "instagram"
      },
      { 
        name: "LM", 
        logo: "/logolm.png", 
        tier: "Bronce",
        link: "https://instagram.com/logolm",
        linkType: "instagram"
      },
      { 
        name: "LY", 
        logo: "/logoly.png", 
        tier: "Bronce",
        link: "https://instagram.com/logoly",
        linkType: "instagram"
      },
      { 
        name: "LA", 
        logo: "/logola.png", 
        tier: "Bronce",
        link: "https://instagram.com/logola",
        linkType: "instagram"
      },
    ],
  }

  const benefits = [
    { icon: Award, text: "Visibilidad en el evento", description: "Tu marca en todos los materiales" },
    { icon: Heart, text: "Apoyo a la comunidad", description: "Impacto social positivo" },
    { icon: Star, text: "Presencia en redes sociales", description: "Alcance a miles de seguidores" },
  ]

  const whatsappNumber = "5493442123456"
  const whatsappMessage = encodeURIComponent(
    "Hola! Me interesa ser patrocinador del evento Grand Team Bike 2026. Me gustaría recibir más información.",
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <section ref={sectionRef} id="patrocinadores" className="py-24 bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(250,204,21,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Animated glowing orbs */}
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-40 left-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-400/5 rounded-full blur-[150px] animate-pulse [animation-delay:2s]" />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center justify-center gap-3 mb-6 px-6 py-3 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 border border-yellow-400/40 rounded-full backdrop-blur-sm animate-shimmer bg-[length:200%_100%]">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold text-yellow-400 uppercase tracking-widest">
              Patrocinadores Oficiales
            </span>
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" aria-hidden="true" />
          </div>

          {/* Title */}
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6">
            Nuestros{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                Aliados
              </span>
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            </span>
          </h2>

          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Gracias a las empresas y organizaciones que hacen posible este gran evento deportivo
          </p>
        </div>

        {/* Sponsors Grid */}
        <div className="max-w-6xl mx-auto mb-24">
          {/* Gold Sponsors */}
          {sponsorTiers.gold.length > 0 && (
            <div
              className={`mb-16 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-yellow-400" />
                <div className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full border border-yellow-400/50">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-yellow-400 uppercase tracking-wider">Patrocinadores Oro</h3>
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-yellow-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
                {sponsorTiers.gold.map((sponsor, index) => (
                  <SponsorCard key={index} sponsor={sponsor} tier="gold" delay={index * 150} isVisible={isVisible} />
                ))}
              </div>
            </div>
          )}

          {/* Silver Sponsors */}
          {sponsorTiers.silver.length > 0 && (
            <div
              className={`mb-16 transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-zinc-400" />
                <h3 className="text-lg font-bold text-zinc-300 uppercase tracking-wider px-4 py-1 bg-zinc-800/50 rounded-full border border-zinc-700">
                  Patrocinadores Plata
                </h3>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-zinc-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {sponsorTiers.silver.map((sponsor, index) => (
                  <SponsorCard
                    key={index}
                    sponsor={sponsor}
                    tier="silver"
                    delay={(index + 4) * 150}
                    isVisible={isVisible}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bronze Sponsors */}
          {sponsorTiers.bronze.length > 0 && (
            <div
              className={`transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700" />
                <h3 className="text-base font-semibold text-zinc-400 uppercase tracking-wider">
                  Patrocinadores Bronce
                </h3>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sponsorTiers.bronze.map((sponsor, index) => (
                  <SponsorCard
                    key={index}
                    sponsor={sponsor}
                    tier="bronze"
                    delay={(index + 6) * 150}
                    isVisible={isVisible}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Become a Sponsor CTA */}
        <div
          className={`max-w-4xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="relative group">
            {/* Animated border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-2xl opacity-50 group-hover:opacity-100 blur transition-all duration-500 animate-gradient bg-[length:200%_auto]" />

            <Card className="relative bg-black border-0 rounded-2xl overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-amber-500/10" />

              <CardContent className="p-8 md:p-12 relative z-10">
                {/* Icon */}
                <div className="flex items-center justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                      <Handshake className="w-10 h-10 text-black" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 text-center">
                  ¿Quieres ser{" "}
                  <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    Patrocinador
                  </span>
                  ?
                </h3>
                <p className="text-zinc-400 text-lg mb-10 text-center max-w-2xl mx-auto leading-relaxed">
                  Únete a las empresas que apoyan el ciclismo y el deporte en nuestra región. Obtén visibilidad y sé
                  parte de esta increíble comunidad.
                </p>

                {/* Benefits */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  {benefits.map((benefit, index) => {
                    const IconComponent = benefit.icon
                    return (
                      <div
                        key={index}
                        className="group/benefit relative p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover/benefit:opacity-100 transition-opacity rounded-xl" />
                        <div className="relative flex flex-col items-center text-center">
                          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover/benefit:scale-110 transition-transform">
                            <IconComponent className="w-7 h-7 text-yellow-400" aria-hidden="true" />
                          </div>
                          <p className="text-white font-semibold mb-1">{benefit.text}</p>
                          <p className="text-zinc-500 text-sm">{benefit.description}</p>
                        </div>
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
                    className="group/btn relative inline-flex items-center gap-3 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-10 py-5 rounded-xl font-bold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,197,94,0.5)]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    <MessageCircle
                      className="w-6 h-6 relative z-10 group-hover/btn:animate-bounce"
                      aria-hidden="true"
                    />
                    <span className="relative z-10">Contactar por WhatsApp</span>
                  </a>
                  <p className="text-zinc-600 text-sm mt-4">Respuesta rápida y personalizada</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section>
  )
}

// Sponsor Card Component
function SponsorCard({ sponsor, tier, delay = 0, isVisible }) {
  const tierStyles = {
    gold: {
      card: "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-yellow-400/30 hover:border-yellow-400",
      glow: "group-hover:shadow-[0_0_40px_rgba(250,204,21,0.3)]",
      height: "h-44 md:h-52",
      padding: "p-8",
      badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
    },
    silver: {
      card: "bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700 hover:border-zinc-400",
      glow: "group-hover:shadow-[0_0_30px_rgba(161,161,170,0.2)]",
      height: "h-32 md:h-40",
      padding: "p-6",
      badge: "bg-zinc-400 text-zinc-900",
    },
    bronze: {
      card: "bg-zinc-900/80 border-zinc-800 hover:border-amber-700/50",
      glow: "group-hover:shadow-[0_0_20px_rgba(180,83,9,0.2)]",
      height: "h-24 md:h-28",
      padding: "p-4",
      badge: "bg-amber-700 text-white",
    },
  }

  const styles = tierStyles[tier]

  return (
    <div
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <a
        href={sponsor.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Card
          className={`group relative overflow-hidden ${styles.card} backdrop-blur-sm hover:scale-105 transition-all duration-500 ${styles.glow} cursor-pointer`}
        >
          {/* Shine effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          {/* Tier badge for gold */}
          {tier === "gold" && (
            <div className="absolute top-3 right-3 z-10">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles.badge} flex items-center gap-1`}>
                <Star className="w-3 h-3" />
                ORO
              </span>
            </div>
          )}

          <CardContent className={`flex items-center justify-center ${styles.padding}`}>
            <div className={`relative w-full ${styles.height}`}>
              <img
                src={sponsor.logo || "/placeholder.svg"}
                alt={`Logo de ${sponsor.name}`}
                className="w-full h-full object-contain transition-all duration-500 opacity-80 group-hover:opacity-100 group-hover:scale-125"
              />
            </div>
          </CardContent>
        </Card>
      </a>
    </div>
  )
}