"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Gift, Ticket, Trophy } from "lucide-react"
import { etiquetaPremio, PREMIO_PLACEHOLDER, type Premio, type Resultado } from "@/lib/sorteos"

// Cuantos premios y ganadores se muestran en la home (el resto, en /sorteos).
const MAX_PREMIOS = 4
const MAX_GANADORES = 5

/**
 * Seccion "Sorteos" de la landing: un adelanto de los premios que se sortean
 * entre los inscriptos y, el dia del evento, los ultimos ganadores.
 *
 * Si no hay sorteos publicados no se muestra nada: mejor eso que un hueco con
 * un titulo y una grilla vacia. Todo el detalle esta en /sorteos.
 */
export default function Sorteos() {
  const [premios, setPremios] = useState<Premio[]>([])
  const [ganadores, setGanadores] = useState<Resultado[]>([])
  const [haySorteos, setHaySorteos] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      // Las columnas van explicitas: el publico no tiene permiso de leer las
      // exclusiones, asi que un select("*") se cortaria.
      const { data: sorteos } = await supabase
        .from("sorteos")
        .select("id, nombre, publico, orden")
        .eq("publico", true)
        .order("orden")

      const ids = (sorteos ?? []).map((s) => s.id as string)
      if (ids.length === 0) {
        setHaySorteos(false)
        return
      }
      setHaySorteos(true)

      const [resPremios, resGanadores] = await Promise.all([
        supabase
          .from("sorteo_premios")
          .select("*")
          .in("sorteo_id", ids)
          .eq("visible", true)
          .order("orden")
          .limit(MAX_PREMIOS),
        supabase
          .from("sorteo_resultados")
          .select("*")
          .in("sorteo_id", ids)
          .eq("estado", "reclamado")
          .order("slot")
          .limit(MAX_GANADORES),
      ])

      setPremios((resPremios.data ?? []) as unknown as Premio[])
      setGanadores((resGanadores.data ?? []) as unknown as Resultado[])
    }

    cargar()
  }, [])

  const mostrar = useMemo(() => haySorteos && (premios.length > 0 || ganadores.length > 0), [
    haySorteos,
    premios.length,
    ganadores.length,
  ])

  if (!mostrar) return null

  return (
    <section id="sorteos" className="relative overflow-hidden bg-black py-12 sm:py-16 md:py-20">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[120px]" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-12">
          <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-yellow-400/40 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 px-3 py-1.5 backdrop-blur-sm sm:mb-4 sm:px-5 sm:py-2">
            <Ticket className="h-3.5 w-3.5 text-yellow-400 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 sm:text-xs md:text-sm">
              Para los inscriptos
            </span>
          </div>

          <h2 className="font-heading text-h2 mb-2 text-white sm:mb-3">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Sorteos
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent sm:h-1" />
            </span>
          </h2>

          <p className="mx-auto max-w-2xl px-4 text-xs leading-relaxed text-zinc-400 sm:text-sm md:text-base">
            Sorteamos premios entre todos los inscriptos el día del evento
          </p>
        </div>

        {/* Premios */}
        {premios.length > 0 && (
          <div className="mx-auto mb-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {premios.map((premio) => (
              <div
                key={premio.id}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 transition-colors hover:border-yellow-400/50"
              >
                <div className="aspect-square w-full overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage */}
                  <img
                    src={premio.imagen_url || PREMIO_PLACEHOLDER}
                    alt={premio.nombre}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="p-2 text-center text-[11px] font-semibold leading-tight text-zinc-200 sm:p-3 sm:text-sm">
                  {premio.nombre}
                  {premio.cantidad > 1 && <span className="ml-1 text-yellow-400">×{premio.cantidad}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Ultimos ganadores */}
        {ganadores.length > 0 && (
          <div className="mx-auto mb-8 max-w-2xl">
            <h3 className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400 sm:text-sm">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Últimos ganadores
            </h3>
            <ul className="space-y-2">
              {ganadores.map((fila) => (
                <li
                  key={fila.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-black px-3 py-2.5"
                >
                  <Gift className="h-4 w-4 flex-shrink-0 text-yellow-400/80" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                    {fila.nombre}
                  </span>
                  <span className="flex-shrink-0 text-xs text-zinc-400">
                    {etiquetaPremio(fila.premio_nombre, fila.slot)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/sorteos"
            className="inline-block rounded-full bg-yellow-400 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-yellow-500 sm:text-base"
          >
            Ver premios y ganadores
          </Link>
        </div>
      </div>
    </section>
  )
}
