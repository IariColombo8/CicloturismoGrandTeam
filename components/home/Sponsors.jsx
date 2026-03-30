"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Award, Heart, MessageCircle, Handshake, Star, Sparkles, Trophy,
  X, MapPin, Phone, Instagram, Facebook, Mail, ExternalLink, Clock, Globe
} from "lucide-react"

export default function Sponsors() {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedSponsor, setSelectedSponsor] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset'
  }, [isModalOpen])

  const openModal = (sponsor) => {
    setSelectedSponsor(sponsor)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedSponsor(null), 300)
  }

  const sponsorTiers = {
    gold: [
      {
        name: "Servitec",
        logo: "/servitec.png",
        tier: "Oro",
        businessName: "Servitec",
        description: "Patrocinador oficial del evento Grand Team Bike 2026.",
        category: "Patrocinador Oficial",
        services: [],
      },
    ],
    silver: [],
    bronze: [
      {
        name: "Cafetería Los Ciclistas",
        logo: "/logoc.png",
        tier: "Bronce",
        businessName: "Cafetería Los Ciclistas",
        description: "El punto de encuentro de la comunidad ciclista. Café de especialidad, desayunos saludables y ambiente biker friendly.",
        address: "Esquina Ruta 11 y Av. Circunvalación",
        phone: "+54 9 342 888 9900",
        schedule: "Todos los días: 7:00-22:00",
        instagram: "https://instagram.com/cafeteriaciclistas",
        whatsapp: "5493428889900",
        category: "Gastronomía",
        services: ["Café specialty", "Desayunos", "Snacks saludables", "WiFi gratis"],
      },
      {
        name: "LM Seguros",
        logo: "/logolm.png",
        tier: "Bronce",
        businessName: "LM Seguros - Coberturas Deportivas",
        description: "Protección integral para deportistas. Seguros especializados en actividades de riesgo y eventos deportivos.",
        address: "San Jerónimo 1122",
        phone: "+54 9 342 999 0011",
        email: "asesores@lmseguros.com",
        schedule: "Lun a Vie: 9:00-17:00",
        whatsapp: "5493429990011",
        category: "Seguros",
        services: ["Seguro de vida", "Cobertura deportiva", "Asistencia 24/7"],
      },
      {
        name: "Yoga & Fitness Center",
        logo: "/logoly.png",
        tier: "Bronce",
        businessName: "Yoga & Fitness Center",
        description: "Centro de entrenamiento complementario para ciclistas. Yoga, stretching y fortalecimiento muscular.",
        address: "Av. Pellegrini 3456",
        phone: "+54 9 342 111 2233",
        schedule: "Lun a Dom: 6:00-22:00",
        instagram: "https://instagram.com/yogafitnesscenter",
        whatsapp: "5493421112233",
        category: "Fitness & Bienestar",
        services: ["Clases de yoga", "Pilates", "Entrenamiento funcional", "Masajes deportivos"],
      },
      {
        name: "Local Aventura",
        logo: "/logola.png",
        tier: "Bronce",
        businessName: "Local Aventura Outdoor",
        description: "Todo para tus aventuras al aire libre. Camping, trekking y equipamiento para exploradores.",
        address: "Costanera Este 789",
        phone: "+54 9 342 222 3344",
        email: "info@localaventura.com",
        schedule: "Mar a Dom: 10:00-19:00",
        facebook: "https://facebook.com/localaventura",
        whatsapp: "5493422223344",
        category: "Outdoor & Camping",
        services: ["Carpas y bolsas", "Mochilas", "Equipamiento técnico", "Alquiler de gear"],
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
    <>
      <section ref={sectionRef} id="patrocinadores" className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(250,204,21,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute top-20 right-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-40 left-10 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-amber-500/10 rounded-full blur-[100px] animate-pulse [animation-delay:1s]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className={`text-center mb-8 sm:mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center justify-center gap-2 mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
              <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-bold text-yellow-400 uppercase tracking-widest">Patrocinadores Oficiales</span>
              <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-3 sm:mb-4">
              Nuestros <span className="gradient-text">Aliados</span>
            </h2>
            <p className="text-sm sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed px-2">
              Gracias a las empresas y organizaciones que hacen posible este gran evento deportivo
            </p>
          </div>

          {/* Sponsors Grid */}
          <div className="max-w-6xl mx-auto mb-8 sm:mb-20">
            {/* Oro */}
            {sponsorTiers.gold.length > 0 && (
              <div className={`mb-8 sm:mb-12 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
                  <div className="h-px w-8 sm:w-20 bg-gradient-to-r from-transparent to-yellow-400" />
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-1 sm:py-2 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full border border-yellow-400/50">
                    <Trophy className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-400" />
                    <h3 className="text-xs sm:text-xl font-bold text-yellow-400 uppercase tracking-wider whitespace-nowrap">Patrocinadores Oro</h3>
                    <Trophy className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-400" />
                  </div>
                  <div className="h-px w-8 sm:w-20 bg-gradient-to-l from-transparent to-yellow-400" />
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-xs sm:max-w-sm">
                    {sponsorTiers.gold.map((sponsor, index) => (
                      <SponsorCard key={index} sponsor={sponsor} tier="gold" delay={index * 150} isVisible={isVisible} onClick={() => openModal(sponsor)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Plata */}
            {sponsorTiers.silver.length > 0 && (
              <div className={`mb-8 sm:mb-12 transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
                  <div className="h-px w-6 sm:w-16 bg-gradient-to-r from-transparent to-zinc-400" />
                  <h3 className="text-xs sm:text-lg font-bold text-zinc-300 uppercase tracking-wider px-3 py-1 bg-zinc-800/50 rounded-full border border-zinc-700 whitespace-nowrap">Patrocinadores Plata</h3>
                  <div className="h-px w-6 sm:w-16 bg-gradient-to-l from-transparent to-zinc-400" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  {sponsorTiers.silver.map((sponsor, index) => (
                    <SponsorCard key={index} sponsor={sponsor} tier="silver" delay={(index + 4) * 150} isVisible={isVisible} onClick={() => openModal(sponsor)} />
                  ))}
                </div>
              </div>
            )}

            {/* Bronce */}
            {sponsorTiers.bronze.length > 0 && (
              <div className={`transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
                  <div className="h-px w-4 sm:w-12 bg-gradient-to-r from-transparent to-amber-700" />
                  <h3 className="text-xs sm:text-base font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Patrocinadores Bronce</h3>
                  <div className="h-px w-4 sm:w-12 bg-gradient-to-l from-transparent to-amber-700" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {sponsorTiers.bronze.map((sponsor, index) => (
                    <SponsorCard key={index} sponsor={sponsor} tier="bronze" delay={(index + 6) * 150} isVisible={isVisible} onClick={() => openModal(sponsor)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <Card className="bg-gradient-to-br from-yellow-400/10 via-amber-500/10 to-yellow-600/10 border border-yellow-400/30 backdrop-blur-sm overflow-hidden relative group hover:border-yellow-400/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-4 sm:p-8 md:p-12 relative z-10">
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                  <Handshake className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" aria-hidden="true" />
                </div>
                <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 text-center">
                  ¿Quieres ser <span className="gradient-text">Patrocinador</span>?
                </h3>
                <p className="text-gray-400 text-sm sm:text-lg mb-6 sm:mb-8 text-center max-w-2xl mx-auto leading-relaxed">
                  Únete a las empresas que apoyan el ciclismo y el deporte en nuestra región.
                </p>
                <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
                  {benefits.map((benefit, index) => {
                    const IconComponent = benefit.icon
                    return (
                      <div key={index} className="flex flex-col items-center text-center p-2 sm:p-4">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                          <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" aria-hidden="true" />
                        </div>
                        <p className="text-white font-semibold text-xs sm:text-sm">{benefit.text}</p>
                        <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5 hidden sm:block">{benefit.description}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="text-center">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/50 text-sm sm:text-base"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                    Contactar por WhatsApp
                  </a>
                  <p className="text-gray-500 text-xs mt-3">Respuesta rápida y personalizada</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <SponsorModal sponsor={selectedSponsor} isOpen={isModalOpen} onClose={closeModal} />
    </>
  )
}

function SponsorCard({ sponsor, tier, delay = 0, isVisible, onClick }) {
  const tierStyles = {
    gold: {
      card: "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-yellow-400/30 hover:border-yellow-400",
      glow: "group-hover:shadow-[0_0_30px_rgba(250,204,21,0.3)]",
      height: "h-24 sm:h-36 md:h-44",
      padding: "p-4 sm:p-6 lg:p-8",
      badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
    },
    silver: {
      card: "bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700 hover:border-zinc-400",
      glow: "group-hover:shadow-[0_0_20px_rgba(161,161,170,0.2)]",
      height: "h-20 sm:h-28",
      padding: "p-3 sm:p-4",
      badge: "bg-zinc-400 text-zinc-900",
    },
    bronze: {
      card: "bg-zinc-900/80 border-zinc-800 hover:border-amber-700/50",
      glow: "group-hover:shadow-[0_0_15px_rgba(180,83,9,0.2)]",
      height: "h-16 sm:h-20 md:h-24",
      padding: "p-2.5 sm:p-3 md:p-4",
      badge: "bg-amber-700 text-white",
    },
  }

  const styles = tierStyles[tier]

  return (
    <div
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button onClick={onClick} className="block w-full text-left" aria-label={`Ver información de ${sponsor.name}`}>
        <Card className={`group relative overflow-hidden ${styles.card} backdrop-blur-sm hover:scale-[1.02] sm:hover:scale-105 transition-all duration-500 ${styles.glow} cursor-pointer`}>
          {tier === "gold" && (
            <div className="absolute top-2 right-2 z-10">
              <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${styles.badge} flex items-center gap-1`}>
                <Star className="w-2.5 h-2.5" />
                ORO
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-1.5">
              <ExternalLink className="w-3 h-3 text-white" />
            </div>
          </div>
          <CardContent className={`flex items-center justify-center ${styles.padding}`}>
            <div className={`relative w-full ${styles.height}`}>
              <img
                src={sponsor.logo || "/placeholder.svg"}
                alt={`Logo de ${sponsor.name}`}
                className="w-full h-full object-contain transition-all duration-500 opacity-80 group-hover:opacity-100 group-hover:scale-110"
              />
            </div>
          </CardContent>
        </Card>
      </button>
    </div>
  )
}

function SponsorModal({ sponsor, isOpen, onClose }) {
  if (!sponsor) return null

  const whatsappMessage = encodeURIComponent(
    `Hola ${sponsor.businessName}! Los vi en el evento Grand Team Bike 2026 y me gustaría conocer más sobre sus servicios.`
  )
  const whatsappUrl = sponsor.whatsapp ? `https://wa.me/${sponsor.whatsapp}?text=${whatsappMessage}` : null

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      >
        <div
          className={`relative bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-y-auto border-t-2 sm:border border-zinc-800 shadow-2xl transition-all duration-300 ${isOpen ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:translate-y-4 sm:scale-95'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="sticky top-4 right-4 z-20 float-right w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors shadow-lg"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="relative h-32 sm:h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center p-6 sm:p-8 border-b border-zinc-800">
            <img
              src={sponsor.logo || "/placeholder.svg"}
              alt={`Logo de ${sponsor.businessName}`}
              className="relative z-10 max-h-24 sm:max-h-32 max-w-[80%] object-contain"
            />
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-3xl font-black text-white mb-2">{sponsor.businessName}</h2>
              {sponsor.category && (
                <span className="inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 bg-yellow-400/20 text-yellow-400 text-xs sm:text-sm font-semibold rounded-full border border-yellow-400/30">
                  {sponsor.category}
                </span>
              )}
            </div>

            {sponsor.description && (
              <p className="text-zinc-300 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">{sponsor.description}</p>
            )}

            {sponsor.services && sponsor.services.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  Servicios
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {sponsor.services.map((service, index) => (
                    <span key={index} className="px-2 sm:px-3 py-1 bg-zinc-800 text-zinc-300 text-xs sm:text-sm rounded-lg border border-zinc-700">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(sponsor.address || sponsor.phone || sponsor.email || sponsor.schedule || sponsor.website) && (
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-white">Información de Contacto</h3>
                {sponsor.address && (
                  <div className="flex items-start gap-2 sm:gap-3 text-zinc-300">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">{sponsor.address}</span>
                  </div>
                )}
                {sponsor.phone && (
                  <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                    <a href={`tel:${sponsor.phone}`} className="text-xs sm:text-sm hover:text-yellow-400 transition-colors">{sponsor.phone}</a>
                  </div>
                )}
                {sponsor.email && (
                  <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                    <a href={`mailto:${sponsor.email}`} className="text-xs sm:text-sm hover:text-yellow-400 transition-colors break-all">{sponsor.email}</a>
                  </div>
                )}
                {sponsor.schedule && (
                  <div className="flex items-start gap-2 sm:gap-3 text-zinc-300">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">{sponsor.schedule}</span>
                  </div>
                )}
                {sponsor.website && (
                  <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                    <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm hover:text-yellow-400 transition-colors flex items-center gap-1">
                      Sitio web <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base w-full">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  WhatsApp
                </a>
              )}
              <div className="grid grid-cols-2 gap-2">
                {sponsor.instagram && (
                  <a href={sponsor.instagram} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base">
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                    Instagram
                  </a>
                )}
                {sponsor.facebook && (
                  <a href={sponsor.facebook} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base">
                    <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                    Facebook
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
