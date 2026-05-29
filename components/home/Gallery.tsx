"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Camera, X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Reveal } from "@/components/home/motion-primitives"

interface GalleryImage {
  url: string
  alt: string
  title: string
}

export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const galleryImages: GalleryImage[] = [
    { url: "/ciclistas-en-grupo-pedaleando-en-carretera.jpg", alt: "Ciclistas en grupo pedaleando", title: "Espíritu de equipo" },
    { url: "/ciclista-en-monta-a-con-paisaje-argentino.jpg", alt: "Ciclismo con paisaje argentino", title: "Desafío entrerriano" },
    { url: "/competencia-ciclismo-llegada-a-meta.jpg", alt: "Llegada a la meta", title: "La meta" },
    { url: "/bicicletas-estacionadas-evento-deportivo.jpg", alt: "Bicicletas en evento", title: "Preparados" },
    { url: "/ciclistas-celebrando-evento-team.jpg", alt: "Celebración del equipo", title: "El festejo" },
    { url: "/ruta-ciclismo-paisaje-entre-rios.jpg", alt: "Ruta en Entre Ríos", title: "Paisaje único" },
  ]

  // Layout bento: clases de span por índice para romper la grilla uniforme.
  const spans = [
    "sm:col-span-2 sm:row-span-2",
    "",
    "",
    "",
    "sm:col-span-2",
    "",
  ]

  const selectedImage = selectedIndex !== null ? galleryImages[selectedIndex] : null

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return
      if (e.key === "Escape") setSelectedIndex(null)
      if (e.key === "ArrowRight") setSelectedIndex((p) => (p === null ? p : (p + 1) % galleryImages.length))
      if (e.key === "ArrowLeft")
        setSelectedIndex((p) => (p === null ? p : (p - 1 + galleryImages.length) % galleryImages.length))
    }
    if (selectedIndex !== null) {
      window.addEventListener("keydown", handleKey)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", handleKey)
      document.body.style.overflow = "unset"
    }
  }, [selectedIndex, galleryImages.length])

  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIndex((p) => (p === null ? p : (p + 1) % galleryImages.length))
  }
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIndex((p) => (p === null ? p : (p - 1 + galleryImages.length) % galleryImages.length))
  }

  return (
    <section id="galeria" className="relative bg-earth grain overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-28">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 sm:mb-14">
          <div>
            <Reveal>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-10 bg-ochre" />
                <span className="kicker text-[11px] text-ochre">
                  <Camera className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" aria-hidden="true" />
                  Galería
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display font-bold uppercase leading-[0.95] text-sand text-3xl sm:text-6xl lg:text-7xl">
                Momentos <span className="text-earth-gold">de ruta</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="text-sand-muted text-sm max-w-xs sm:text-right">
              Lo que se vive arriba de la bici. Revivilo en imágenes de ediciones anteriores.
            </p>
          </Reveal>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[160px] sm:auto-rows-[220px] gap-3 sm:gap-4">
          {galleryImages.map((image, index) => (
            <Reveal key={index} delay={(index % 4) * 0.06} className={`${spans[index]} group`}>
              <button
                onClick={() => setSelectedIndex(index)}
                className="relative w-full h-full overflow-hidden rounded-xl border border-sand/10 hover:border-gold/50 transition-colors duration-300 block"
                aria-label={`Ampliar: ${image.title}`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-warm-black/90 via-warm-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <h3 className="font-display uppercase text-sand text-sm sm:text-lg font-semibold text-left leading-tight">
                    {image.title}
                  </h3>
                  <span className="w-8 h-8 rounded-full bg-gold/90 text-warm-black grid place-items-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shrink-0">
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 text-center">
            <a
              href="/inscripcion"
              className="inline-flex items-center gap-2 px-8 py-4 font-display uppercase tracking-wide text-base bg-gold text-warm-black font-bold rounded-none hover:bg-gold-soft transition-all duration-300 hover:-translate-y-0.5 shadow-[0_8px_30px_rgba(255,215,0,0.2)]"
            >
              Quiero vivir esto
            </a>
          </div>
        </Reveal>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-warm-black/96 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setSelectedIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada"
        >
          <button
            className="absolute top-4 right-4 z-10 p-2 text-sand hover:text-gold transition-colors"
            onClick={() => setSelectedIndex(null)}
            aria-label="Cerrar"
          >
            <X className="w-7 h-7" />
          </button>
          <button
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-3 text-sand hover:text-gold transition-colors"
            onClick={prev}
            aria-label="Anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-3 text-sand hover:text-gold transition-colors"
            onClick={next}
            aria-label="Siguiente"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage.url}
              alt={selectedImage.alt}
              width={1200}
              height={900}
              className="w-full max-h-[82vh] object-contain rounded-lg"
              priority
            />
            <div className="mt-4 text-center">
              <h3 className="font-display uppercase text-sand text-xl sm:text-2xl font-semibold">
                {selectedImage.title}
              </h3>
              <p className="text-sand-muted text-xs mt-1">
                {(selectedIndex ?? 0) + 1} / {galleryImages.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
