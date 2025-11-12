"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Quote, Star } from "lucide-react"

export default function Testimonials() {
  const testimonials = [
    {
      name: "Carlos Mendoza",
      role: "Ciclista Amateur",
      image: "/cyclist-portrait-male.jpg",
      quote: "Increíble experiencia. El recorrido es desafiante pero hermoso, y la organización fue impecable.",
      rating: 5,
      year: "Participante 2024",
    },
    {
      name: "María González",
      role: "Ciclista Recreacional",
      image: "/cyclist-portrait-female.jpg",
      quote: "Mi primera carrera de larga distancia y no pude haber elegido mejor evento. Todo estuvo perfecto.",
      rating: 5,
      year: "Participante 2023",
    },
    {
      name: "Juan Pérez",
      role: "Ciclista Profesional",
      image: "/professional-cyclist-portrait.jpg",
      quote: "El mejor evento ciclístico de la región. Gran ambiente y excelente trazado. Muy recomendado.",
      rating: 5,
      year: "Participante 2024",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-zinc-900 to-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Lo que dicen <span className="gradient-text">nuestros ciclistas</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Experiencias reales de participantes que ya vivieron la aventura Grand Team Bike
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-black/50 border-yellow-400/20 backdrop-blur-sm hover:border-yellow-400/40 transition-all group"
            >
              <CardContent className="p-6">
                <Quote className="w-10 h-10 text-yellow-400 mb-4 opacity-50" />

                <p className="text-gray-300 mb-6 leading-relaxed italic">&quot;{testimonial.quote}&quot;</p>

                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-yellow-400/20">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full border-2 border-yellow-400"
                  />
                  <div>
                    <h4 className="text-white font-bold">{testimonial.name}</h4>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                    <p className="text-yellow-400 text-xs">{testimonial.year}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
