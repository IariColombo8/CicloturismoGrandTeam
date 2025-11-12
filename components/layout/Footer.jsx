"use client"

import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-black border-t border-yellow-400/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center space-x-3 mb-4">
              <div className="relative w-10 h-10">
                <Image src="/logo.jpg" alt="Grand Team Bike" fill className="object-contain" />
              </div>
              <span className="text-xl font-bold gradient-text">Grand Team Bike</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              La aventura de cicloturismo más desafiante y emocionante del año. Únete a nuestra comunidad de ciclistas
              apasionados.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-9 h-9 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-lg flex items-center justify-center text-yellow-400 transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-lg flex items-center justify-center text-yellow-400 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-lg flex items-center justify-center text-yellow-400 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              {["Inicio", "Sobre Nosotros", "Detalles del Evento", "Contacto"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Event Info */}
          <div>
            <h3 className="text-white font-bold mb-4">Información</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/inscripcion" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">
                  Inscripción
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">
                  Mi Cuenta
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">
                  Preguntas Frecuentes
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm">
                  Términos y Condiciones
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <a href="mailto:info@grandteambike.com" className="hover:text-yellow-400 transition-colors">
                  info@grandteambike.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-gray-400 text-sm">
                <Phone className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <a href="tel:+1234567890" className="hover:text-yellow-400 transition-colors">
                  +123 456 7890
                </a>
              </li>
              <li className="flex items-start gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>Plaza Central, Ciudad</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-yellow-400/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; {currentYear} Grand Team Bike. Todos los derechos reservados.</p>
            <div className="flex gap-6">
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
        </div>
      </div>
    </footer>
  )
}
