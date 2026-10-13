"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from "lucide-react"
import { type Alojamiento, normalizarLogo, normalizarWebsite } from "@/lib/alojamientos"

// Deja solo digitos para armar los links de tel: y wa.me
function soloDigitos(valor: string | null): string | null {
  if (!valor) return null
  const limpio = valor.replace(/\D/g, "")
  return limpio.length >= 6 ? limpio : null
}

function urlInstagram(valor: string | null): string | null {
  if (!valor) return null
  const value = valor.trim()
  if (!value) return null
  if (value.startsWith("http")) return value
  return `https://instagram.com/${value.replace(/^@/, "")}`
}

// Modal con el detalle completo del alojamiento: galeria de fotos, descripcion
// y datos de contacto. Se abre al tocar una tarjeta en la landing.
export default function AlojamientoModal({
  alojamiento,
  onClose,
}: {
  alojamiento: Alojamiento
  onClose: () => void
}) {
  // El logo abre la galeria para que siempre haya algo que mostrar.
  const fotos = [
    ...(alojamiento.logo_url ? [alojamiento.logo_url] : []),
    ...(alojamiento.imagenes ?? []),
  ]
  const [indice, setIndice] = useState(0)

  const total = fotos.length
  const siguiente = useCallback(() => {
    if (total > 1) setIndice((i) => (i + 1) % total)
  }, [total])
  const anterior = useCallback(() => {
    if (total > 1) setIndice((i) => (i - 1 + total) % total)
  }, [total])

  // Cerrar con Escape, navegar con flechas y bloquear el scroll de fondo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") siguiente()
      if (e.key === "ArrowLeft") anterior()
    }
    document.addEventListener("keydown", onKeyDown)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflowAnterior
    }
  }, [onClose, siguiente, anterior])

  const website = normalizarWebsite(alojamiento.website)
  const telefono = soloDigitos(alojamiento.telefono)
  const whatsapp = soloDigitos(alojamiento.whatsapp)
  const instagram = urlInstagram(alojamiento.instagram)
  const mapa = alojamiento.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alojamiento.direccion)}`
    : null

  const fotoActual = fotos[indice] ?? null
  // El logo (indice 0 cuando existe) se muestra completo; las fotos recortadas.
  const esLogo = Boolean(alojamiento.logo_url) && indice === 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Información de ${alojamiento.nombre}`}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-yellow-400/30 bg-zinc-950 shadow-[0_0_40px_rgba(250,204,21,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 rounded-full bg-black/70 p-2 text-zinc-300 transition-colors hover:text-yellow-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Galeria */}
        {fotoActual && (
          <div className="relative">
            <div
              className={`relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl ${
                esLogo ? "bg-white" : "bg-zinc-900"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- imagenes de Supabase Storage */}
              <img
                src={normalizarLogo(fotoActual)}
                alt={`${alojamiento.nombre} - foto ${indice + 1}`}
                referrerPolicy="no-referrer"
                className={`h-full w-full ${esLogo ? "object-contain p-6" : "object-cover"}`}
              />
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={anterior}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:text-yellow-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={siguiente}
                  aria-label="Foto siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:text-yellow-400"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-zinc-200">
                  {indice + 1} / {total}
                </span>
              </>
            )}
          </div>
        )}

        {/* Miniaturas */}
        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 px-4 py-3">
            {fotos.map((foto, i) => (
              <button
                key={`${foto}-${i}`}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver foto ${i + 1}`}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-all ${
                  i === indice
                    ? "border-yellow-400 ring-1 ring-yellow-400/50"
                    : "border-zinc-700 opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={normalizarLogo(foto)}
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className={`h-full w-full ${
                    Boolean(alojamiento.logo_url) && i === 0
                      ? "bg-white object-contain p-1"
                      : "object-cover"
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {/* Datos */}
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              Bike Friendly
            </span>
            <h3 className="mt-1 text-xl sm:text-2xl font-black text-white">{alojamiento.nombre}</h3>
          </div>

          {alojamiento.descripcion && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {alojamiento.descripcion}
            </p>
          )}

          <div className="space-y-2">
            {alojamiento.direccion && (
              <a
                href={mapa ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-zinc-300 transition-colors hover:text-yellow-400"
              >
                <MapPin className="mt-0.5 w-4 h-4 shrink-0 text-yellow-400" aria-hidden="true" />
                <span>{alojamiento.direccion}</span>
              </a>
            )}

            {alojamiento.telefono && (
              <a
                href={telefono ? `tel:${telefono}` : "#"}
                className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-yellow-400"
              >
                <Phone className="w-4 h-4 shrink-0 text-yellow-400" aria-hidden="true" />
                <span>{alojamiento.telefono}</span>
              </a>
            )}

            {alojamiento.whatsapp && (
              <a
                href={whatsapp ? `https://wa.me/${whatsapp}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-yellow-400"
              >
                <MessageCircle className="w-4 h-4 shrink-0 text-yellow-400" aria-hidden="true" />
                <span>WhatsApp {alojamiento.whatsapp}</span>
              </a>
            )}

            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-yellow-400"
              >
                <Instagram className="w-4 h-4 shrink-0 text-yellow-400" aria-hidden="true" />
                <span>{alojamiento.instagram}</span>
              </a>
            )}
          </div>

          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              Ver sitio web
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
