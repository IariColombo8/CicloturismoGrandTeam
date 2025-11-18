"use client"

import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Calendar, ExternalLink } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const handleScrollToSection = (e, sectionId) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const quickLinks = [
    { label: "Inicio", href: "/#inicio", id: "inicio" },
    { label: "Sobre Nosotros", href: "/#nosotros", id: "nosotros" },
    { label: "Detalles del Evento", href: "/#detalles", id: "detalles" },
    { label: "Galería", href: "/#galeria", id: "galeria" },
    { label: "Contacto", href: "/#contacto", id: "contacto" },
  ]

  const infoLinks = [
    { label: "Inscripción", href: "/inscripcion", external: false },
    { label: "Mi Cuenta", href: "/login", external: false },
    { label: "Preguntas Frecuentes", href: "#", external: false },
    { label: "Reglamento", href: "#", external: false },
  ]

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  ]

  return (
    <footer id="contacto" className="bg-gradient-to-b from-zinc-900 to-black border-t border-yellow-400/20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center space-x-3 mb-4 group">
              <div className="relative w-12 h-12 transition-transform group-hover:scale-110 duration-300">
                <Image 
                  src="/logo.png" 
                  alt="Grand Team Bike Logo" 
                  fill 
                  className="object-contain" 
                />
              </div>
              <span className="text-xl font-bold gradient-text">Grand Team Bike</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              La aventura de cicloturismo más desafiante y emocionante del año. Únete a nuestra comunidad de ciclistas apasionados en Concepción del Uruguay.
            </p>
            
            {/* Event date highlight */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full mb-6">
              <Calendar className="w-4 h-4 text-yellow-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-yellow-400">8 de Noviembre 2026</span>
            </div>

            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const IconComponent = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 hover:border-yellow-400/40 rounded-lg flex items-center justify-center text-yellow-400 hover:scale-110 transition-all duration-300"
                    aria-label={social.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              Enlaces Rápidos
              <div className="h-0.5 w-8 bg-gradient-to-r from-yellow-400 to-transparent" />
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleScrollToSection(e, link.id)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-yellow-400/50 rounded-full group-hover:bg-yellow-400 transition-colors" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Event Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              Información
              <div className="h-0.5 w-8 bg-gradient-to-r from-yellow-400 to-transparent" />
            </h3>
            <ul className="space-y-3">
              {infoLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-yellow-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-yellow-400/50 rounded-full group-hover:bg-yellow-400 transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              Contacto
              <div className="h-0.5 w-8 bg-gradient-to-r from-yellow-400 to-transparent" />
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 text-sm group">
                <Mail className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <a 
                  href="mailto:info@grandteambike.com" 
                  className="hover:text-yellow-400 transition-colors break-all"
                >
                  info@grandteambike.com
                </a>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm group">
                <Phone className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <a 
                  href="tel:+5493442123456" 
                  className="hover:text-yellow-400 transition-colors"
                >
                  +54 9 3442 123456
                </a>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white mb-1">Camping El Molino</p>
                  <p>Concepción del Uruguay</p>
                  <p>Entre Ríos, Argentina</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mb-12 p-6 md:p-8 bg-gradient-to-r from-yellow-400/10 via-yellow-500/10 to-amber-600/10 border border-yellow-400/30 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-xl md:text-2xl mb-2">
                ¿Listo para la <span className="gradient-text">Aventura</span>?
              </h3>
              <p className="text-gray-400 text-sm md:text-base">
                Asegura tu lugar en el evento de cicloturismo más esperado del año
              </p>
            </div>
            <Link
              href="/inscripcion"
              className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/50 whitespace-nowrap flex items-center gap-2"
            >
              Inscríbete Ahora
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-yellow-400/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p className="text-center md:text-left">
              &copy; {currentYear} <span className="text-yellow-400 font-semibold">Grand Team Bike</span>. Todos los derechos reservados.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="hover:text-yellow-400 transition-colors">
                Privacidad
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors">
                Términos
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors">
                Cookies
              </a>
            </div>
          </div>
          
          {/* Credits */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Diseñado con ❤️ para la comunidad ciclista de Entre Ríos</p>
          </div>
        </div>
      </div>
    </footer>
  )
}