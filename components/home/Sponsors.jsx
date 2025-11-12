"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Award, Heart } from "lucide-react"

export default function Sponsors() {
  const sponsors = [
    { name: "Sponsor 1", logo: "/cycling-sponsor-logo-gold.jpg" },
    { name: "Sponsor 2", logo: "/cycling-sponsor-logo-silver.jpg" },
    { name: "Sponsor 3", logo: "/bike-sponsor-logo.jpg" },
    { name: "Sponsor 4", logo: "/generic-sports-sponsor-logo.png" },
    { name: "Sponsor 5", logo: "/cycling-gear-logo.jpg" },
    { name: "Sponsor 6", logo: "/community-sponsor-logo.jpg" },
  ]

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-8 h-8 text-yellow-400" />
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Nuestros <span className="gradient-text">Patrocinadores</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Gracias a las empresas y organizaciones que hacen posible este gran evento deportivo
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sponsors.map((sponsor, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-yellow-400/10 to-amber-600/10 border-yellow-400/30 backdrop-blur-sm hover:scale-105 transition-transform"
              >
                <CardContent className="flex items-center justify-center p-8">
                  <img
                    src={sponsor.logo || "/placeholder.svg"}
                    alt={sponsor.name}
                    className="w-full h-20 object-contain filter brightness-0 invert"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Become a Sponsor CTA */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-yellow-400/10 to-amber-600/10 border-yellow-400/30 backdrop-blur-sm max-w-3xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-white mb-4">¿Quieres ser patrocinador?</h3>
              <p className="text-gray-400 mb-6">
                Únete a las empresas que apoyan el ciclismo y el deporte en nuestra región
              </p>
              <a
                href="mailto:contacto@grandteambike.com"
                className="inline-block bg-gradient-to-r from-yellow-400 to-amber-600 text-black px-8 py-3 rounded-lg font-bold hover:scale-105 transition-transform"
              >
                Contactar
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
