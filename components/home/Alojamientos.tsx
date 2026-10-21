"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { BedDouble, Images, Info, MapPin } from "lucide-react"
import {
  type Alojamiento,
  ALOJAMIENTO_PLACEHOLDER,
  normalizarLogo,
} from "@/lib/alojamientos"
import { srcSetOptimizado, urlOptimizada } from "@/lib/imagenes/optimizarUrl"

// El modal solo se descarga cuando el usuario toca una tarjeta.
const AlojamientoModal = dynamic(() => import("./AlojamientoModal"), { ssr: false })

export type { Alojamiento }

// El logo pasa por el optimizador de Next (ver lib/imagenes/optimizarUrl.ts):
// sale en AVIF/WebP al ancho de la tarjeta y con cache de un año, en vez del
// archivo original de Supabase. Si el optimizador falla se prueba la URL
// original y recien despues el placeholder: la tarjeta nunca queda vacia.
function AlojamientoLogo({ src, alt }: { src: string | null; alt: string }) {
  const resolved = normalizarLogo(src)
  const [currentSrc, setCurrentSrc] = useState(() => urlOptimizada(resolved, 256) || resolved)

  useEffect(() => {
    setCurrentSrc(urlOptimizada(resolved, 256) || resolved)
  }, [resolved])

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- los logos vienen de Supabase o Drive */
    <img
      src={currentSrc}
      srcSet={currentSrc.startsWith("/_next/image") ? srcSetOptimizado(resolved, 256) : undefined}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      draggable={false}
      className="block h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
      onError={() => {
        if (currentSrc.startsWith("/_next/image")) setCurrentSrc(resolved)
        else if (currentSrc !== ALOJAMIENTO_PLACEHOLDER) setCurrentSrc(ALOJAMIENTO_PLACEHOLDER)
      }}
    />
  )
}

// Seccion publica "Alojamientos": lista los alojamientos bike friendly
// recomendados. Hasta 6 por fila en escritorio y 3 por fila en celular;
// si hay uno solo se muestra centrado. Al tocar una tarjeta se abre un modal
// con toda la informacion cargada desde el admin (fotos, contacto, etc.).
export default function Alojamientos() {
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [seleccionado, setSeleccionado] = useState<Alojamiento | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Ref-callback en vez de useRef+useEffect: la seccion no existe en el DOM
  // hasta que llegan los datos de Supabase, asi que el observer debe
  // engancharse recien cuando el nodo se monta (no en el primer render).
  const sectionRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect()
    if (!node) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 },
    )
    observerRef.current.observe(node)
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  useEffect(() => {
    // select("*") en vez de columnas fijas: la seccion sigue funcionando
    // aunque el esquema todavia no tenga la columna "imagenes".
    supabase
      .from("alojamientos")
      .select("*")
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
          <p className="mt-2 text-[10px] sm:text-xs text-zinc-500">
            Tocá cada uno para ver fotos y datos de contacto
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
            const cantidadFotos = (alojamiento.imagenes ?? []).length

            return (
              <button
                key={alojamiento.id}
                type="button"
                onClick={() => setSeleccionado(alojamiento)}
                aria-label={`Ver información de ${alojamiento.nombre}`}
                className={`group block min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(250,204,21,0.18)] sm:p-3 ${
                  esUnico ? "w-40 sm:w-56" : "w-full"
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-xl bg-white p-2 sm:p-3">
                  <AlojamientoLogo src={alojamiento.logo_url} alt={`Logo de ${alojamiento.nombre}`} />

                  {cantidadFotos > 0 && (
                    <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-yellow-400">
                      <Images className="w-2.5 h-2.5" aria-hidden="true" />
                      {cantidadFotos}
                    </span>
                  )}

                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Info className="w-3 h-3 text-yellow-400" aria-hidden="true" />
                  </span>
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
              </button>
            )
          })}
        </div>
      </div>

      {seleccionado && (
        <AlojamientoModal alojamiento={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </section>
  )
}
