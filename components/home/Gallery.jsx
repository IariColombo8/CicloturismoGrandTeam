"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Camera, X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react"

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const galleryImages = [
    {
      url: "/ciclistas-en-grupo-pedaleando-en-carretera.jpg",
      alt: "Ciclistas en grupo pedaleando",
      title: "Espíritu de Equipo",
    },
    {
      url: "/ciclista-en-monta-a-con-paisaje-argentino.jpg",
      alt: "Ciclismo de montaña",
      title: "Desafío Extremo",
    },
    {
      url: "/competencia-ciclismo-llegada-a-meta.jpg",
      alt: "Llegada a la meta",
      title: "Meta Alcanzada",
    },
    {
      url: "/bicicletas-estacionadas-evento-deportivo.jpg",
      alt: "Bicicletas en evento deportivo",
      title: "Preparación",
    },
    {
      url: "/ciclistas-celebrando-evento-team.jpg",
      alt: "Celebración del equipo",
      title: "Momento de Victoria",
    },
    {
      url: "/ruta-ciclismo-paisaje-entre-rios.jpg",
      alt: "Ruta del evento en Entre Ríos",
      title: "Paisajes Únicos",
    },
  ]

  // Cerrar modal con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setSelectedImage(null)
    }
    if (selectedImage) {
      window.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "unset"
    }
  }, [selectedImage])

  const openImage = (image, index) => {
    setSelectedImage(image)
    setCurrentIndex(index)
  }

  const nextImage = (e) => {
    e.stopPropagation()
    const newIndex = (currentIndex + 1) % galleryImages.length
    setCurrentIndex(newIndex)
    setSelectedImage(galleryImages[newIndex])
  }

  const prevImage = (e) => {
    e.stopPropagation()
    const newIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length
    setCurrentIndex(newIndex)
    setSelectedImage(galleryImages[newIndex])
  }

  return (
    <section id="galeria" className="py-20 bg-gradient-to-b from-zinc-900 via-black to-zinc-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-40 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="inline-flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full backdrop-blur-sm">
            <Camera className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            <span className="text-sm font-semibold text-yellow-400">Galería</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
            <span className="gradient-text">Momentos</span> Inolvidables
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Revive la emoción de nuestros eventos anteriores y descubre lo que te espera
          </p>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
          {galleryImages.map((image, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden bg-black border border-zinc-800 hover:border-yellow-400/50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-500/10"
              onClick={() => openImage(image, index)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ZoomIn className="w-12 h-12 text-yellow-400 mb-2 transform scale-0 group-hover:scale-100 transition-transform duration-300" />
                    <p className="text-white font-bold text-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      {image.title}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-gray-300 text-sm">{image.alt}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA después de la galería */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">¿Listo para crear tus propios momentos?</p>
          <a
            href="/inscripcion"
            className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/50"
          >
            Inscríbete Ahora
          </a>
        </div>
      </div>

      {/* Modal mejorado con navegación */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de imagen"
        >
          {/* Botón cerrar */}
          <button
            className="absolute top-4 right-4 z-10 p-2 text-white hover:text-yellow-400 bg-black/50 rounded-full hover:bg-black/70 transition-all"
            onClick={() => setSelectedImage(null)}
            aria-label="Cerrar modal"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Botón anterior */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white hover:text-yellow-400 bg-black/50 rounded-full hover:bg-black/70 transition-all hidden md:block"
            onClick={prevImage}
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Botón siguiente */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white hover:text-yellow-400 bg-black/50 rounded-full hover:bg-black/70 transition-all hidden md:block"
            onClick={nextImage}
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Imagen */}
          <div className="relative max-w-6xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-full">
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt}
                width={1200}
                height={900}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            
            {/* Info de la imagen */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
              <h3 className="text-white text-2xl font-bold mb-1">{selectedImage.title}</h3>
              <p className="text-gray-300">{selectedImage.alt}</p>
              <p className="text-gray-500 text-sm mt-2">
                {currentIndex + 1} / {galleryImages.length}
              </p>
            </div>
          </div>

          {/* Navegación mobile (swipe hints) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
            <button
              onClick={prevImage}
              className="p-2 bg-black/50 rounded-full text-white"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextImage}
              className="p-2 bg-black/50 rounded-full text-white"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </section>
  )
}