"use client"

import Link from "next/link"
import { ChevronRight, Instagram, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParallaxImage, Reveal } from "@/components/home/motion-primitives"
import { EVENTO } from "@/lib/constants"

export default function CallToAction() {
  const contacts = [
    {
      icon: Mail,
      label: "Email",
      value: EVENTO.contacto.email,
      href: `mailto:${EVENTO.contacto.email}`,
    },
    {
      icon: Phone,
      label: "WhatsApp",
      value: "+54 9 3442 654257",
      href: `https://wa.me/${EVENTO.contacto.whatsapp}`,
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: "@cicloturismo_grandteam",
      href: "https://www.instagram.com/cicloturismo_grandteam?igsh=NTZqaGpiZG4ydmU0",
    },
  ]

  return (
    <section id="contacto" className="relative overflow-hidden bg-warm-black grain">
      {/* Bloque CTA con foto + parallax */}
      <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <ParallaxImage
          src="/ciclistas-celebrando-evento-team.jpg"
          alt=""
          strength={120}
          overlayClassName="veil-warm"
        />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-7 border border-gold/40 rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              <span className="kicker text-[11px] text-gold">Cupos limitados</span>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display font-bold uppercase leading-[0.92] text-sand text-4xl sm:text-7xl lg:text-8xl">
              Tu lugar en la
              <span className="block text-earth-gold">ruta te espera</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-sand-muted leading-relaxed">
              Sumate a cientos de ciclistas que ya dijeron presente. Inscripción simple, pago
              protegido y la aventura asegurada.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/inscripcion" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="group w-full sm:w-auto px-8 py-6 text-base font-bold uppercase tracking-wide font-display bg-gold text-warm-black hover:bg-gold-soft transition-all duration-300 rounded-none shadow-[0_8px_30px_rgba(255,215,0,0.25)] hover:shadow-[0_8px_40px_rgba(255,215,0,0.45)] hover:-translate-y-0.5"
                >
                  Inscribirme ahora
                  <ChevronRight className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href={`mailto:${EVENTO.contacto.email}`} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-8 py-6 text-base font-semibold uppercase tracking-wide font-display border-2 border-sand/30 text-sand hover:border-gold hover:text-gold transition-all duration-300 rounded-none bg-transparent"
                >
                  Tengo dudas
                </Button>
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Contactos */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-sand/10 rounded-xl overflow-hidden max-w-4xl mx-auto">
          {contacts.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={i} delay={i * 0.07} className="h-full">
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex flex-col items-center text-center h-full bg-warm-black-soft p-8 hover:bg-olive-deep/30 transition-colors duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-gold/10 grid place-items-center mb-4 group-hover:bg-gold/20 transition-colors">
                    <Icon className="w-6 h-6 text-gold" aria-hidden="true" />
                  </div>
                  <span className="kicker text-[10px] text-gold mb-2">{c.label}</span>
                  <span className="text-sm text-sand-muted group-hover:text-sand transition-colors break-all">
                    {c.value}
                  </span>
                </a>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
