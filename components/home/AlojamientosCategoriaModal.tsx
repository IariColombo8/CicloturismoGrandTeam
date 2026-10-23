"use client"

import { useEffect, useMemo, useState } from "react"
import { Images, Info, MapPin, MessageCircle, PawPrint, Phone, Star, X } from "lucide-react"
import {
  type Alojamiento,
  CATEGORIAS_ALOJAMIENTO,
  MASCOTAS_ETIQUETA,
  aceptaMascotas,
  gruposPorEstrellas,
  ordenarPorEstrellas,
  telefonosDe,
  urlMapa,
} from "@/lib/alojamientos"

function Estrellas({ cantidad }: { cantidad: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${cantidad} estrellas`}>
      {Array.from({ length: cantidad }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
      ))}
    </span>
  )
}

// La lista completa de una categoria (Hoteles, Cabañas...), de mas estrellas
// a menos. Se abre al tocar una tarjeta de categoria en la seccion
// Alojamientos. Sin backdrop-blur: en celular el desenfoque detras de algo que
// se scrollea traba la pantalla (docs/home-movimiento-y-peso.md).
export default function AlojamientosCategoriaModal({
  categoria,
  alojamientos,
  onClose,
  onVerFicha,
  pausado = false,
}: {
  categoria: (typeof CATEGORIAS_ALOJAMIENTO)[number]
  alojamientos: Alojamiento[]
  onClose: () => void
  /** Abre la ficha con fotos (solo para los que tienen logo o fotos). */
  onVerFicha: (alojamiento: Alojamiento) => void
  /** true mientras hay una ficha abierta encima: Escape cierra esa, no esta. */
  pausado?: boolean
}) {
  const [soloMascotas, setSoloMascotas] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pausado) onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflowAnterior
    }
  }, [onClose, pausado])

  const hayConMascotas = alojamientos.some((a) => aceptaMascotas(a.mascotas))
  const grupos = useMemo(() => {
    const lista = soloMascotas ? alojamientos.filter((a) => aceptaMascotas(a.mascotas)) : alojamientos
    return gruposPorEstrellas(ordenarPorEstrellas(lista))
  }, [alojamientos, soloMascotas])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/90 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={categoria.nombre}
    >
      <div
        className="relative flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-yellow-400/30 bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera fija */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4 sm:p-5">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              Concepción del Uruguay
            </span>
            <h3 className="mt-0.5 text-xl font-black text-white sm:text-2xl">{categoria.nombre}</h3>
            <p className="text-xs text-zinc-400">
              {alojamientos.length} {alojamientos.length === 1 ? "alojamiento" : "alojamientos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full bg-zinc-800 p-2 text-zinc-300 transition-colors hover:text-yellow-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs text-zinc-200 sm:text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />
            Los precios y tarifas se consultan directamente con cada alojamiento.
          </p>

          {hayConMascotas && (
            <button
              type="button"
              onClick={() => setSoloMascotas((v) => !v)}
              aria-pressed={soloMascotas}
              className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                soloMascotas
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-zinc-700 text-zinc-300 hover:border-yellow-400/60"
              }`}
            >
              <PawPrint className="h-3.5 w-3.5" aria-hidden="true" />
              Solo los que aceptan mascotas
            </button>
          )}

          <div className="space-y-6">
            {grupos.map((grupo) => (
              <section key={grupo.estrellas}>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {grupo.estrellas > 0 ? (
                    <>
                      <Estrellas cantidad={grupo.estrellas} />
                      {grupo.estrellas} {grupo.estrellas === 1 ? "estrella" : "estrellas"}
                    </>
                  ) : (
                    "Sin estrellas"
                  )}
                </h4>

                <ul className="space-y-3">
                  {grupo.items.map((a) => {
                    const telefonos = telefonosDe(a.telefono)
                    const mapa = urlMapa(a.direccion)
                    const tieneFicha = Boolean(a.logo_url) || (a.imagenes ?? []).length > 0 || Boolean(a.website)
                    return (
                      <li key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-base font-bold text-white">{a.nombre}</p>
                          {a.clasificacion && (
                            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                              {a.clasificacion}
                            </span>
                          )}
                          {a.mascotas && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                aceptaMascotas(a.mascotas)
                                  ? "bg-green-500/15 text-green-300"
                                  : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              <PawPrint className="h-3 w-3" aria-hidden="true" />
                              {MASCOTAS_ETIQUETA[a.mascotas]}
                            </span>
                          )}
                        </div>

                        {a.direccion && (
                          <a
                            href={mapa ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 flex items-start gap-1.5 text-sm text-zinc-300 transition-colors hover:text-yellow-400"
                          >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />
                            {a.direccion}
                          </a>
                        )}

                        {a.descripcion && (
                          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a.descripcion}</p>
                        )}

                        {(telefonos.length > 0 || tieneFicha) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {telefonos.map((t) =>
                              t.tel ? (
                                <a
                                  key={t.texto}
                                  href={`tel:${t.tel}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-yellow-400 hover:text-yellow-400"
                                >
                                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t.texto}
                                </a>
                              ) : (
                                <span key={t.texto} className="inline-flex items-center gap-1.5 px-1 py-2 text-xs text-zinc-500">
                                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t.texto}
                                </span>
                              ),
                            )}
                            {telefonos
                              .filter((t) => t.whatsapp)
                              .map((t) => (
                                <a
                                  key={`wa-${t.texto}`}
                                  href={`https://wa.me/${t.whatsapp}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`WhatsApp ${t.texto}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600/90 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-500"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  WhatsApp
                                </a>
                              ))}
                            {tieneFicha && (
                              <button
                                type="button"
                                onClick={() => onVerFicha(a)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-yellow-300"
                              >
                                <Images className="h-3.5 w-3.5" aria-hidden="true" />
                                Ver fotos y más
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
            Fuente: Dirección de Turismo de Concepción del Uruguay, septiembre 2026. Establecimientos habilitados y
            homologados. Tel. (3442) 425820.
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Foto ilustrativa de la tarjeta: {categoria.credito}, vía Wikimedia Commons.
          </p>
        </div>
      </div>
    </div>
  )
}
