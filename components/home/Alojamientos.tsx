"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { BedDouble, ExternalLink, MapPin } from "lucide-react"

// Placeholder embebido: evita tarjetas vacias si el logo no carga.
const ALOJAMIENTO_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" rx="24" fill="#ffffff"/>
    <rect x="110" y="170" width="180" height="80" rx="14" fill="#e4e4e7"/>
    <rect x="130" y="140" width="60" height="40" rx="12" fill="#d4d4d8"/>
    <text x="200" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#3f3f46">ALOJAMIENTO</text>
  </svg>
`)}`

export interface Alojamiento {
  id: string
  nombre: string
  descripcion: string | null
  logo_url: string | null
  website: string | null
  direccion: string | null
}

// Normaliza URLs: fuerza https y soporta enlaces de Google Drive como logo.
function normalizarLogo(url: string | null | undefined): string {
  if (!url) return ALOJAMIENTO_PLACEHOLDER

  let value = url.trim()
  if (!value) return ALOJAMIENTO_PLACEHOLDER

  if (value.startsWith("http://")) {
    value = `https://${value.slice("http://".length)}`
  }

  const driveId =
    value.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1] ||
    (value.includes("drive.google.com") ? value.match(/[?&]id=([^&#]+)/)?.[1] : undefined)

  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`
  }

  return encodeURI(value)
}

function normalizarWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  const value = url.trim()
  if (!value) return null
  return value.startsWith("http") ? value : `https://${value}`
}

function AlojamientoLogo({ src, alt }: { src: string | null; alt: string }) {
  const resolved = normalizarLogo(src)
  const [currentSrc, setCurrentSrc] = useState(resolved)

  useEffect(() => {
    setCurrentSrc(resolved)
  }, [resolved])

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- los logos vienen de Supabase o Drive */
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      draggable={false}
      className="block h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
      onError={() => {
        if (currentSrc !== ALOJAMIENTO_PLACEHOLDER) setCurrentSrc(ALOJAMIENTO_PLACEHOLDER)
      }}
    />
  )
}

// Seccion publica "Alojamientos": lista los alojamientos bike friendly
// recomendados. Hasta 6 por fila en escritorio y 3 por fila en celular;
// si hay uno solo se muestra centrado.
export default function Alojamientos() {
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

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
    supabase
      .from("alojamientos")
      .select("id, nombre, descripcion, logo_url, website, direccion")
      .eq("activo", true)
      .order("orden", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setAlojamientos(data as Alojamiento[])
      })
  }, [])

  // Sin datos cargados no se muestra la seccion para no dejar un hueco vacio.
  if (alojamientos.length === 0) return null

  const esUnico = alojamientos.length === 1

  return (
    <section
      ref={sectionRef}
      id="alojamientos"
      className="py-12 sm:py-16 md:py-20 bg-black relative overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-yellow-400/10 blur-[120px]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado */}
        <div
          className={`text-center mb-8 sm:mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="inline-flex items-center justify-center gap-2 mb-3 sm:mb-4 px-3 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 border border-yellow-400/40 rounded-full backdrop-blur-sm">
            <BedDouble className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" aria-hidden="true" />
            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-yellow-400 uppercase tracking-widest">
              Bike Friendly
            </span>
          </div>

          <h2 className="font-heading text-h2 text-white mb-2 sm:mb-3">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Alojamientos
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            </span>
          </h2>

          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed px-4">
            Alojamientos recomendados para ciclistas que vienen al evento
          </p>
        </div>

        {/* Grilla: 3 por fila en celular, hasta 6 en escritorio.
            Con un solo alojamiento se centra la tarjeta. */}
        <div
          className={
            esUnico
              ? "flex justify-center"
              : "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 max-w-6xl mx-auto"
          }
        >
          {alojamientos.map((alojamiento, index) => {
            const website = normalizarWebsite(alojamiento.website)
            const contenido = (
              <>
                <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-xl bg-white p-2 sm:p-3">
                  <AlojamientoLogo src={alojamiento.logo_url} alt={`Logo de ${alojamiento.nombre}`} />
                  {website && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink className="w-3 h-3 text-yellow-400" aria-hidden="true" />
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-zinc-200 transition-colors group-hover:text-yellow-400 sm:text-sm">
                  {alojamiento.nombre}
                </p>

                {alojamiento.direccion && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-center text-[9px] leading-tight text-zinc-500 sm:text-xs">
                    <MapPin className="w-3 h-3 shrink-0 text-yellow-400/70" aria-hidden="true" />
                    <span className="line-clamp-1">{alojamiento.direccion}</span>
                  </p>
                )}
              </>
            )

            const claseTarjeta = `group block min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 sm:p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(250,204,21,0.18)] ${
              esUnico ? "w-40 sm:w-56" : "w-full"
            } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`

            return website ? (
              <a
                key={alojamiento.id}
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className={claseTarjeta}
                style={{ transitionDelay: `${index * 80}ms` }}
                aria-label={`Ver sitio web de ${alojamiento.nombre}`}
              >
                {contenido}
              </a>
            ) : (
              <div
                key={alojamiento.id}
                className={claseTarjeta}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                {contenido}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
