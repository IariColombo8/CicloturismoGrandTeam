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

  // Cerrar modal con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Prevenir scroll cuando el modal está abierto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
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
        name: "Sponsor Premium 1", 
        logo: "/cycling-sponsor-logo-gold.jpg", 
        tier: "Oro",
        businessName: "Sponsor Premium S.A.",
        description: "Líderes en equipamiento deportivo de alta gama. Proveemos las mejores bicicletas y accesorios para ciclistas profesionales y aficionados. Con más de 20 años de experiencia en el mercado.",
        address: "Av. Principal 1234, Ciudad, Provincia",
        phone: "+54 9 342 123 4567",
        email: "contacto@sponsorpremium.com",
        website: "https://sponsorpremium.com",
        schedule: "Lun a Vie: 9:00-18:00 | Sáb: 9:00-13:00",
        instagram: "https://instagram.com/sponsorpremium",
        facebook: "https://facebook.com/sponsorpremium",
        whatsapp: "5493421234567",
        category: "Equipamiento Deportivo",
        services: ["Venta de bicicletas", "Accesorios ciclismo", "Mantenimiento", "Asesoramiento personalizado"]
      },
      { 
        name: "Sponsor Premium 2", 
        logo: "/cycling-sponsor-logo-silver.jpg", 
        tier: "Oro",
        businessName: "Bike Pro Center",
        description: "Tu tienda especializada en ciclismo. Ofrecemos las mejores marcas internacionales, servicio técnico especializado y asesoramiento experto para todos los niveles.",
        address: "Calle del Ciclista 567, Centro",
        phone: "+54 9 342 765 4321",
        email: "info@bikeprocenter.com",
        website: "https://bikeprocenter.com",
        schedule: "Lun a Sáb: 8:30-19:00",
        instagram: "https://instagram.com/bikeprocenter",
        facebook: "https://facebook.com/bikeprocenter",
        whatsapp: "5493427654321",
        category: "Tienda de Ciclismo",
        services: ["Bicicletas de ruta", "Mountain bikes", "Service completo", "Personalización"]
      },
    ],
    silver: [
      { 
        name: "Sponsor Plata 1", 
        logo: "/bike-sponsor-logo.jpg", 
        tier: "Plata",
        businessName: "Deportes Extremos",
        description: "Especialistas en deportes de aventura y outdoor. Equipamiento de calidad para ciclistas que buscan superar límites.",
        address: "Av. Libertador 890",
        phone: "+54 9 342 555 1234",
        email: "ventas@deportesextremos.com",
        schedule: "Lun a Vie: 10:00-20:00",
        instagram: "https://instagram.com/deportesextremos",
        whatsapp: "5493425551234",
        category: "Deportes Outdoor",
        services: ["Equipamiento", "Indumentaria", "Accesorios"]
      },
      { 
        name: "Sponsor Plata 2", 
        logo: "/generic-sports-sponsor-logo.png", 
        tier: "Plata",
        businessName: "Nutrición Deportiva Plus",
        description: "Suplementos y nutrición especializada para atletas. Productos de calidad certificada para mejorar tu rendimiento.",
        address: "Bv. San Martín 2345",
        phone: "+54 9 342 666 7890",
        website: "https://nutricionplus.com",
        schedule: "Lun a Sáb: 9:00-21:00",
        facebook: "https://facebook.com/nutricionplus",
        whatsapp: "5493426667890",
        category: "Nutrición Deportiva",
        services: ["Suplementos", "Asesoramiento nutricional", "Planes personalizados"]
      },
      { 
        name: "Sponsor Plata 3", 
        logo: "/cycling-sponsor-logo-gold.jpg", 
        tier: "Plata",
        businessName: "Taller Bike Mechanics",
        description: "Service y reparación de bicicletas de todas las marcas. Mecánicos certificados y repuestos originales.",
        address: "Calle Belgrano 456",
        phone: "+54 9 342 777 8899",
        email: "servicio@bikemechanics.com",
        schedule: "Lun a Vie: 8:00-18:00",
        instagram: "https://instagram.com/bikemechanics",
        whatsapp: "5493427778899",
        category: "Taller Mecánico",
        services: ["Reparaciones", "Mantenimiento", "Armado custom", "Venta de repuestos"]
      },
    ],
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
        services: ["Café specialty", "Desayunos", "Snacks saludables", "WiFi gratis"]
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
        website: "https://lmseguros.com",
        schedule: "Lun a Vie: 9:00-17:00",
        whatsapp: "5493429990011",
        category: "Seguros",
        services: ["Seguro de vida", "Cobertura deportiva", "Asistencia 24/7"]
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
        services: ["Clases de yoga", "Pilates", "Entrenamiento funcional", "Masajes deportivos"]
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
        services: ["Carpas y bolsas", "Mochilas", "Equipamiento técnico", "Alquiler de gear"]
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
      <section ref={sectionRef} id="patrocinadores" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-black relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(250,204,21,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute top-20 right-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-40 left-10 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-amber-500/10 rounded-full blur-[100px] animate-pulse [animation-delay:1s]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section header */}
          <div
            className={`text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="inline-flex items-center justify-center gap-2 mb-3 sm:mb-4 md:mb-6 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 border border-yellow-400/40 rounded-full backdrop-blur-sm animate-shimmer bg-[length:200%_100%]">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-400 animate-pulse" aria-hidden="true" />
              <span className="text-[10px] sm:text-xs md:text-sm font-bold text-yellow-400 uppercase tracking-widest">
                Patrocinadores Oficiales
              </span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-400 animate-pulse hidden xs:block" aria-hidden="true" />
            </div>

            <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-2 sm:mb-3 md:mb-4 lg:mb-6 px-2">
              Nuestros{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  Aliados
                </span>
                <span className="absolute -bottom-0.5 sm:-bottom-1 md:-bottom-2 left-0 right-0 h-0.5 sm:h-0.5 md:h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
              </span>
            </h2>

            <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed px-4">
              Gracias a las empresas y organizaciones que hacen posible este gran evento deportivo
            </p>
          </div>

          {/* Sponsors Grid */}
          <div className="max-w-6xl mx-auto mb-8 sm:mb-12 md:mb-16 lg:mb-24">
            {/* Gold Sponsors */}
            {sponsorTiers.gold.length > 0 && (
              <div
                className={`mb-8 sm:mb-10 md:mb-12 lg:mb-16 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                  <div className="h-px w-8 sm:w-12 md:w-20 bg-gradient-to-r from-transparent to-yellow-400" />
                  <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full border border-yellow-400/50">
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-yellow-400" />
                    <h3 className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-xl font-bold text-yellow-400 uppercase tracking-wider whitespace-nowrap">Patrocinadores Oro</h3>
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-yellow-400 hidden xs:block" />
                  </div>
                  <div className="h-px w-8 sm:w-12 md:w-20 bg-gradient-to-l from-transparent to-yellow-400" />
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto">
                  {sponsorTiers.gold.map((sponsor, index) => (
                    <SponsorCard 
                      key={index} 
                      sponsor={sponsor} 
                      tier="gold" 
                      delay={index * 150} 
                      isVisible={isVisible}
                      onClick={() => openModal(sponsor)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Silver Sponsors */}
            {sponsorTiers.silver.length > 0 && (
              <div
                className={`mb-8 sm:mb-10 md:mb-12 lg:mb-16 transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                  <div className="h-px w-6 sm:w-10 md:w-16 bg-gradient-to-r from-transparent to-zinc-400" />
                  <h3 className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-lg font-bold text-zinc-300 uppercase tracking-wider px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 bg-zinc-800/50 rounded-full border border-zinc-700 whitespace-nowrap">
                    Patrocinadores Plata
                  </h3>
                  <div className="h-px w-6 sm:w-10 md:w-16 bg-gradient-to-l from-transparent to-zinc-400" />
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {sponsorTiers.silver.map((sponsor, index) => (
                    <SponsorCard
                      key={index}
                      sponsor={sponsor}
                      tier="silver"
                      delay={(index + 4) * 150}
                      isVisible={isVisible}
                      onClick={() => openModal(sponsor)}
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
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                  <div className="h-px w-4 sm:w-8 md:w-12 bg-gradient-to-r from-transparent to-amber-700" />
                  <h3 className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-base font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                    Patrocinadores Bronce
                  </h3>
                  <div className="h-px w-4 sm:w-8 md:w-12 bg-gradient-to-l from-transparent to-amber-700" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {sponsorTiers.bronze.map((sponsor, index) => (
                    <SponsorCard
                      key={index}
                      sponsor={sponsor}
                      tier="bronze"
                      delay={(index + 6) * 150}
                      isVisible={isVisible}
                      onClick={() => openModal(sponsor)}
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
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-xl sm:rounded-2xl opacity-50 group-hover:opacity-100 blur transition-all duration-500 animate-gradient bg-[length:200%_auto]" />

              <Card className="relative bg-black border-0 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-amber-500/10" />

                <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12 relative z-10">
                  <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                        <Handshake className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-black" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-3 md:mb-4 text-center px-2">
                    ¿Quieres ser{" "}
                    <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      Patrocinador
                    </span>
                    ?
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm md:text-base lg:text-lg mb-6 sm:mb-8 md:mb-10 text-center max-w-2xl mx-auto leading-relaxed px-2">
                    Únete a las empresas que apoyan el ciclismo y el deporte en nuestra región. Obtén visibilidad y sé
                    parte de esta increíble comunidad.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10">
                    {benefits.map((benefit, index) => {
                      const IconComponent = benefit.icon
                      return (
                        <div
                          key={index}
                          className="group/benefit relative p-3 sm:p-4 md:p-6 bg-zinc-900/50 rounded-lg sm:rounded-xl border border-zinc-800 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-1"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover/benefit:opacity-100 transition-opacity rounded-lg sm:rounded-xl" />
                          <div className="relative flex flex-col items-center text-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 group-hover/benefit:scale-110 transition-transform">
                              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-yellow-400" aria-hidden="true" />
                            </div>
                            <p className="text-white font-semibold mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">{benefit.text}</p>
                            <p className="text-zinc-500 text-[10px] sm:text-xs md:text-sm">{benefit.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="text-center">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/btn relative inline-flex items-center gap-2 sm:gap-2.5 md:gap-3 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 md:py-4 lg:py-5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base lg:text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,197,94,0.5)]"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      <MessageCircle
                        className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 relative z-10 group-hover/btn:animate-bounce flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="relative z-10">Contactar por WhatsApp</span>
                    </a>
                    <p className="text-zinc-600 text-[10px] sm:text-xs md:text-sm mt-2 sm:mt-3 md:mt-4">Respuesta rápida y personalizada</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .animate-shimmer {
            animation: shimmer 3s ease-in-out infinite;
          }
          .animate-gradient {
            animation: gradient 3s ease infinite;
          }
        `}</style>
      </section>

      {/* Modal */}
      <SponsorModal 
        sponsor={selectedSponsor} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </>
  )
}

// Sponsor Card Component - ULTRA RESPONSIVO
function SponsorCard({ sponsor, tier, delay = 0, isVisible, onClick }) {
  const tierStyles = {
    gold: {
      card: "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-yellow-400/30 hover:border-yellow-400",
      glow: "group-hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] sm:group-hover:shadow-[0_0_40px_rgba(250,204,21,0.3)]",
      height: "h-24 xs:h-28 sm:h-32 md:h-40 lg:h-52",
      padding: "p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8",
      badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
    },
    silver: {
      card: "bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700 hover:border-zinc-400",
      glow: "group-hover:shadow-[0_0_20px_rgba(161,161,170,0.2)] sm:group-hover:shadow-[0_0_30px_rgba(161,161,170,0.2)]",
      height: "h-20 xs:h-24 sm:h-28 md:h-32 lg:h-40",
      padding: "p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6",
      badge: "bg-zinc-400 text-zinc-900",
    },
    bronze: {
      card: "bg-zinc-900/80 border-zinc-800 hover:border-amber-700/50",
      glow: "group-hover:shadow-[0_0_15px_rgba(180,83,9,0.2)] sm:group-hover:shadow-[0_0_20px_rgba(180,83,9,0.2)]",
      height: "h-16 xs:h-20 sm:h-24 md:h-28",
      padding: "p-2 xs:p-2.5 sm:p-3 md:p-4",
      badge: "bg-amber-700 text-white",
    },
  }

  const styles = tierStyles[tier]

  return (
    <div
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button
        onClick={onClick}
        className="block w-full text-left"
        aria-label={`Ver información de ${sponsor.name}`}
      >
        <Card
          className={`group relative overflow-hidden ${styles.card} backdrop-blur-sm hover:scale-[1.02] sm:hover:scale-105 transition-all duration-500 ${styles.glow} cursor-pointer`}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          {tier === "gold" && (
            <div className="absolute top-1.5 right-1.5 xs:top-2 xs:right-2 sm:top-3 sm:right-3 z-10">
              <span className={`px-1.5 py-0.5 xs:px-2 xs:py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-bold ${styles.badge} flex items-center gap-0.5 xs:gap-1`}>
                <Star className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden xs:inline">ORO</span>
              </span>
            </div>
          )}

          <div className="absolute bottom-1.5 right-1.5 xs:bottom-2 xs:right-2 sm:bottom-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-1 xs:p-1.5 sm:p-2">
              <ExternalLink className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 text-white" />
            </div>
          </div>

          <CardContent className={`flex items-center justify-center ${styles.padding}`}>
            <div className={`relative w-full ${styles.height}`}>
              <img
                src={sponsor.logo || "/placeholder.svg"}
                alt={`Logo de ${sponsor.name}`}
                className="w-full h-full object-contain transition-all duration-500 opacity-80 group-hover:opacity-100 group-hover:scale-105 sm:group-hover:scale-110 md:group-hover:scale-125"
              />
            </div>
          </CardContent>
        </Card>
      </button>
    </div>
  )
}

// Modal Component - COMPLETAMENTE RESPONSIVO
function SponsorModal({ sponsor, isOpen, onClose }) {
  if (!sponsor) return null

  const whatsappMessage = encodeURIComponent(
    `Hola ${sponsor.businessName}! Los vi en el evento Grand Team Bike 2026 y me gustaría conocer más sobre sus servicios.`
  )
  const whatsappUrl = sponsor.whatsapp ? `https://wa.me/${sponsor.whatsapp}?text=${whatsappMessage}` : null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      >
        <div
          className={`relative bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-y-auto border-t-2 sm:border border-zinc-800 shadow-2xl transition-all duration-300 ${
            isOpen ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:translate-y-4 sm:scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="sticky top-4 right-4 z-20 float-right w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors shadow-lg"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Header con logo */}
          <div className="relative h-32 xs:h-40 sm:h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center p-6 sm:p-8 border-b border-zinc-800">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(250,204,21,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <img
              src={sponsor.logo || "/placeholder.svg"}
              alt={`Logo de ${sponsor.businessName}`}
              className="relative z-10 max-h-24 xs:max-h-28 sm:max-h-32 max-w-[80%] object-contain"
            />
          </div>

          {/* Content */}
          <div className="p-4 xs:p-5 sm:p-6 md:p-8">
            {/* Business name and category */}
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl xs:text-2xl sm:text-3xl font-black text-white mb-2">
                {sponsor.businessName}
              </h2>
              {sponsor.category && (
                <span className="inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 bg-yellow-400/20 text-yellow-400 text-xs sm:text-sm font-semibold rounded-full border border-yellow-400/30">
                  {sponsor.category}
                </span>
              )}
            </div>

            {/* Description */}
            {sponsor.description && (
              <p className="text-zinc-300 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
                {sponsor.description}
              </p>
            )}

            {/* Services */}
            {sponsor.services && sponsor.services.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  Servicios
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {sponsor.services.map((service, index) => (
                    <span
                      key={index}
                      className="px-2 sm:px-3 py-1 bg-zinc-800 text-zinc-300 text-xs sm:text-sm rounded-lg border border-zinc-700"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">Información de Contacto</h3>

              {sponsor.address && (
                <div className="flex items-start gap-2 sm:gap-3 text-zinc-300">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm md:text-base">{sponsor.address}</span>
                </div>
              )}

              {sponsor.phone && (
                <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                  <a href={`tel:${sponsor.phone}`} className="text-xs sm:text-sm md:text-base hover:text-yellow-400 transition-colors">
                    {sponsor.phone}
                  </a>
                </div>
              )}

              {sponsor.email && (
                <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                  <a href={`mailto:${sponsor.email}`} className="text-xs sm:text-sm md:text-base hover:text-yellow-400 transition-colors break-all">
                    {sponsor.email}
                  </a>
                </div>
              )}

              {sponsor.schedule && (
                <div className="flex items-start gap-2 sm:gap-3 text-zinc-300">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm md:text-base">{sponsor.schedule}</span>
                </div>
              )}

              {sponsor.website && (
                <div className="flex items-center gap-2 sm:gap-3 text-zinc-300">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                  <a 
                    href={sponsor.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs sm:text-sm md:text-base hover:text-yellow-400 transition-colors flex items-center gap-1"
                  >
                    Sitio web
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Social Media & Actions - GRID RESPONSIVO */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-full xs:col-span-2 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-green-500/30 text-sm sm:text-base"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>WhatsApp</span>
                </a>
              )}

              {sponsor.instagram && (
                <a
                  href={sponsor.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/30 text-sm sm:text-base"
                >
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Instagram</span>
                </a>
              )}

              {sponsor.facebook && (
                <a
                  href={sponsor.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30 text-sm sm:text-base"
                >
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Facebook</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}