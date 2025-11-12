"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Camera, X } from "lucide-react"

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null)

  const galleryImages = [
    {
      url: "/ciclistas-en-grupo-pedaleando-en-carretera.jpg",
      alt: "Ciclistas en grupo",
    },
    {
      url: "/ciclista-en-monta-a-con-paisaje-argentino.jpg",
      alt: "Ciclismo de montaña",
    },
    {
      url: "/competencia-ciclismo-llegada-a-meta.jpg",
      alt: "Llegada a meta",
    },
    {
      url: "/bicicletas-estacionadas-evento-deportivo.jpg",
      alt: "Bicicletas en evento",
    },
    {
      url: "/ciclistas-celebrando-evento-team.jpg",
      alt: "Celebración del equipo",
    },
    {
      url: "/ruta-ciclismo-paisaje-entre-rios.jpg",
      alt: "Ruta del evento",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-black to-zinc-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Camera className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Galería de <span className="gradient-text">Momentos</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Revive los mejores momentos de nuestros eventos anteriores
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {galleryImages.map((image, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden bg-black border-yellow-400/20 cursor-pointer hover:border-yellow-400/50 transition-all"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={image.url || "/placeholder.svg"}
                  alt={image.alt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <p className="text-white font-semibold">{image.alt}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Modal for full image */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-yellow-400 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage.url || "/placeholder.svg"}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </section>
  )
}
