"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  BedDouble,
  Building,
  Building2,
  Home,
  Hotel,
  Images,
  Info,
  type LucideIcon,
  MapPin,
  Tent,
  TreePine,
  Trees,
  Warehouse,
} from "lucide-react"
import {
  type Alojamiento,
  type CategoriaAlojamiento,
  ALOJAMIENTO_PLACEHOLDER,
  CATEGORIAS_ALOJAMIENTO,
  normalizarLogo,
} from "@/lib/alojamientos"
import { srcSetOptimizado, urlOptimizada } from "@/lib/imagenes/optimizarUrl"

// Los modales solo se descargan cuando el usuario toca una tarjeta.
const AlojamientoModal = dynamic(() => import("./AlojamientoModal"), { ssr: false })
const AlojamientosCategoriaModal = dynamic(() => import("./AlojamientosCategoriaModal"), { ssr: false })

const ICONO_CATEGORIA: Record<CategoriaAlojamiento, LucideIcon> = {
  hotel: Hotel,
  apart: Building2,
  hosteria: BedDouble,
  complejo: Trees,
  bungalow: Tent,
  cabana: TreePine,
  campo: Warehouse,
  casa: Home,
  departamento: Building,
}

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

// Seccion publica "Alojamientos". Arriba, los destacados bike friendly
// (categoria NULL): hasta 6 por fila en escritorio y 3 en celular; si hay uno
// solo se muestra centrado, y al tocarlo se abre su ficha con fotos.
// Abajo, todos los de la ciudad agrupados por tipo (Hoteles, Cabañas...):
// cada tarjeta abre la lista completa, ordenada por estrellas.
export default function Alojamientos() {
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [seleccionado, setSeleccionado] = useState<Alojamiento | null>(null)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
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

  // Sin categoria = destacado (tarjeta grande con logo). El resto se agrupa por
  // categoria y se abre en un modal con la lista entera.
  const destacados = alojamientos.filter((a) => !a.categoria)
  const categorias = CATEGORIAS_ALOJAMIENTO.map((c) => ({
    ...c,
    items: alojamientos.filter((a) => a.categoria === c.id),
  })).filter((c) => c.items.length > 0)
  const totalListado = categorias.reduce((n, c) => n + c.items.length, 0)
  const categoriaAbierta = categorias.find((c) => c.id === categoriaId) ?? null

  // Sin datos cargados no se muestra la seccion para no dejar un hueco vacio.
  if (alojamientos.length === 0) return null

  const esUnico = destacados.length === 1

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
        {destacados.length > 0 && (
        <div
          className={
            esUnico
              ? "flex justify-center"
              : "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 max-w-6xl mx-auto"
          }
        >
          {destacados.map((alojamiento, index) => {
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
        )}

        {/* Todos los de la ciudad, por tipo. Cada tarjeta abre la lista entera. */}
        {categorias.length > 0 && (
          <div className={`max-w-6xl mx-auto ${destacados.length > 0 ? "mt-12 sm:mt-16" : ""}`}>
            <div
              className={`text-center mb-6 sm:mb-8 transition-[opacity,transform] duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <h3 className="text-lg sm:text-2xl font-black text-white">
                Todos los alojamientos de Concepción del Uruguay
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                {totalListado} alojamientos habilitados por la Dirección de Turismo. Tocá un tipo para ver la lista.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {categorias.map((c, index) => {
                const Icono = ICONO_CATEGORIA[c.id]
                const maxEstrellas = Math.max(0, ...c.items.map((a) => a.estrellas ?? 0))
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoriaId(c.id)}
                    className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 text-left transition-[opacity,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-yellow-400/60 ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                    }`}
                    style={{ transitionDelay: isVisible ? `${index * 60}ms` : undefined }}
                  >
                    {/* Foto ilustrativa del tipo, con el icono encima */}
                    <span className="relative block aspect-[16/10] w-full overflow-hidden bg-zinc-800">
                      <Image
                        src={c.foto}
                        alt=""
                        fill
                        sizes="(min-width: 1152px) 370px, (min-width: 768px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 sm:h-9 sm:w-9">
                        <Icono className="h-4 w-4 text-yellow-400 sm:h-5 sm:w-5" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="min-w-0 p-3 sm:p-4">
                      <span className="block text-sm font-bold leading-tight text-white group-hover:text-yellow-400 sm:text-base">
                        {c.nombre}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400 sm:text-xs">
                        {c.items.length} {c.items.length === 1 ? "lugar" : "lugares"}
                        {maxEstrellas > 0 && (
                          <span className="text-yellow-400"> · hasta {"★".repeat(maxEstrellas)}</span>
                        )}
                      </span>
                      <span className="mt-0.5 hidden text-[11px] text-zinc-500 sm:block">{c.detalle}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-center text-[10px] text-zinc-600">
              Fotos ilustrativas de Wikimedia Commons: no son de los alojamientos de la lista.
            </p>
          </div>
        )}
      </div>

      {categoriaAbierta && (
        <AlojamientosCategoriaModal
          categoria={categoriaAbierta}
          alojamientos={categoriaAbierta.items}
          onClose={() => setCategoriaId(null)}
          onVerFicha={setSeleccionado}
          pausado={seleccionado !== null}
        />
      )}

      {seleccionado && (
        <AlojamientoModal alojamiento={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </section>
  )
}
