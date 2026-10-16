"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { supabase } from "@/lib/supabase"
import { Gift, Loader2, MapPin, Medal, PartyPopper, Ticket, Trophy } from "lucide-react"
import {
  etiquetaPremio,
  premiosPorNivel,
  PREMIO_PLACEHOLDER,
  type NivelPremio,
  type Premio,
  type Resultado,
  type Sorteo,
} from "@/lib/sorteos"

// El anon no puede leer las columnas de exclusiones (ver la migracion), asi que
// las columnas van explicitas: un select("*") se cortaria por permisos.
const COLUMNAS_SORTEO = "id, nombre, descripcion, total_sorteos, estado, publico, orden"

type SorteoPublico = Pick<
  Sorteo,
  "id" | "nombre" | "descripcion" | "total_sorteos" | "estado" | "publico" | "orden"
>

/** Icono de cada jerarquia. */
const ICONO_NIVEL: Record<NivelPremio, typeof Trophy> = {
  principal: Trophy,
  segundo: Medal,
  otro: Gift,
}

/**
 * Las filas de premios se arman con flex-wrap y ancho fijo por tarjeta, no con
 * grid: asi la ultima fila queda centrada cuando no se completa (3 premios en
 * una fila de 4) y un premio solo queda en el medio. Con grid se pegaban todos
 * a la izquierda y la pagina parecia cortada.
 *
 * El ancho es (100% - huecos) / columnas, con el mismo gap de la fila.
 */
const FILA_CHICA = "flex flex-wrap justify-center gap-3"
const ANCHO_CHICO =
  "basis-[calc(50%-0.375rem)] sm:basis-[calc(33.333%-0.5rem)] lg:basis-[calc(25%-0.5625rem)]"

const FILA_GRANDE = "flex flex-wrap justify-center gap-4"
const ANCHO_MEDIO = "basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)]"
const ANCHO_GRANDE = "basis-full sm:basis-[calc(50%-0.5rem)]"

/**
 * Pagina de los sorteos, la que ve todo el mundo: los premios que se sortean y,
 * el dia del evento, los ganadores en vivo.
 *
 * Los premios se muestran con la jerarquia que eligio el panel (el mejor
 * premio grande arriba, el segundo abajo y el resto en grilla), porque "una
 * grilla de iguales" no dejaba ver cual era el premio importante.
 *
 * Solo aparece lo que el panel marco como publico. Los nombres que se publican
 * son de ganadores (se anuncian en el escenario); no hay ningun dato de
 * contacto ni el DNI, que ni siquiera viaja en estas tablas.
 */
export default function SorteosPage() {
  const [sorteos, setSorteos] = useState<SorteoPublico[]>([])
  const [premios, setPremios] = useState<Premio[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const [resSorteos, resPremios, resResultados] = await Promise.all([
        supabase.from("sorteos").select(COLUMNAS_SORTEO).eq("publico", true).order("orden"),
        supabase.from("sorteo_premios").select("*").eq("visible", true).order("orden"),
        supabase.from("sorteo_resultados").select("*").order("slot"),
      ])

      setSorteos((resSorteos.data ?? []) as unknown as SorteoPublico[])
      setPremios((resPremios.data ?? []) as unknown as Premio[])
      setResultados((resResultados.data ?? []) as unknown as Resultado[])
      setCargando(false)
    }

    cargar()

    // El sorteo se sigue en vivo desde el celular: cuando el panel sube un
    // ganador, la pagina lo muestra sin recargar.
    const canal = supabase
      .channel("sorteos-publico")
      .on("postgres_changes", { event: "*", schema: "public", table: "sorteo_resultados" }, () =>
        cargar(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  // Para cada sorteo publico: sus premios agrupados por jerarquia y sus
  // ganadores confirmados.
  const tandas = useMemo(
    () =>
      sorteos.map((sorteo) => ({
        sorteo,
        bloques: premiosPorNivel(premios.filter((p) => p.sorteo_id === sorteo.id)),
        ganadores: resultados
          .filter((r) => r.sorteo_id === sorteo.id && r.estado === "reclamado")
          .sort((a, b) => a.slot - b.slot),
      })),
    [sorteos, premios, resultados],
  )

  const hayGanadores = tandas.some((t) => t.ganadores.length > 0)

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <section className="relative overflow-hidden pt-28 pb-12 sm:pt-32 sm:pb-16">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[120px]" />

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Encabezado ─────────────────────────── */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 px-4 py-2 backdrop-blur-sm">
              <Ticket className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-widest text-yellow-400 sm:text-sm">
                Sorteos del evento
              </span>
            </div>

            <h1 className="font-heading text-h1 text-white">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Premios y ganadores
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base">
              Entre todos los inscriptos sorteamos un montón de premios el día del evento. Acá
              están algunos de los que se sortean y, cuando arranque, los ganadores en vivo.
            </p>
          </div>

          {cargando ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" aria-hidden="true" />
            </div>
          ) : tandas.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
              <Gift className="mx-auto mb-3 h-10 w-10 text-zinc-700" aria-hidden="true" />
              <p className="text-zinc-300">Todavía no publicamos los sorteos.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Faltan los premios y las bases. Mientras tanto, lo importante es estar inscripto:
                todos los inscriptos participan.
              </p>
              <Link
                href="/inscripcion"
                className="mt-5 inline-block rounded-full bg-yellow-400 px-6 py-3 font-bold text-black transition-colors hover:bg-yellow-500"
              >
                Quiero inscribirme
              </Link>
            </div>
          ) : (
            <div className="space-y-16">
              {tandas.map(({ sorteo, bloques, ganadores: ganadoresTanda }) => (
                <article
                  key={sorteo.id}
                  // Un sorteo solo no se deja pegado a la izquierda de una
                  // pantalla ancha: va centrado y con ancho de lectura.
                  className={[
                    "space-y-6",
                    tandas.length === 1 ? "mx-auto max-w-4xl text-center" : "",
                  ].join(" ")}
                >
                  <header className="border-b border-yellow-400/20 pb-3">
                    <h2 className="font-heading text-h3 text-white">{sorteo.nombre}</h2>
                    {sorteo.descripcion && (
                      <p className="mt-1 text-sm text-zinc-400">{sorteo.descripcion}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      {sorteo.total_sorteos} {sorteo.total_sorteos === 1 ? "premio" : "premios"} ·{" "}
                      {sorteo.estado === "finalizado"
                        ? "sorteo terminado"
                        : sorteo.estado === "en_curso"
                          ? "sorteando ahora"
                          : "se sortea el día del evento"}
                    </p>
                  </header>

                  {/* ── Premios, por jerarquia ───────────── */}
                  {bloques.map((bloque) => {
                    const Icono = ICONO_NIVEL[bloque.nivel]
                    return (
                      <div key={bloque.nivel}>
                        <h3
                          className={[
                            "mb-3 flex items-center gap-2 font-bold uppercase tracking-wider",
                            tandas.length === 1 ? "justify-center" : "",
                            bloque.nivel === "principal"
                              ? "text-base text-yellow-400 sm:text-lg"
                              : "text-sm text-yellow-400/90",
                          ].join(" ")}
                        >
                          <Icono
                            className={bloque.nivel === "principal" ? "h-5 w-5" : "h-4 w-4"}
                            aria-hidden="true"
                          />
                          {bloque.titulo}
                        </h3>

                        {bloque.nivel === "otro" ? (
                          <div className={FILA_CHICA}>
                            {bloque.premios.map((premio) => (
                              <TarjetaPremio
                                key={premio.id}
                                premio={premio}
                                tamano="chico"
                                className={ANCHO_CHICO}
                              />
                            ))}
                          </div>
                        ) : bloque.premios.length === 1 ? (
                          <TarjetaDestacada premio={bloque.premios[0]} nivel={bloque.nivel} />
                        ) : (
                          <div className={FILA_GRANDE}>
                            {bloque.premios.map((premio) => (
                              <TarjetaPremio
                                key={premio.id}
                                premio={premio}
                                tamano={bloque.nivel === "principal" ? "grande" : "medio"}
                                className={bloque.nivel === "principal" ? ANCHO_GRANDE : ANCHO_MEDIO}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ── Ganadores ────────────────────────── */}
                  {ganadoresTanda.length > 0 && (
                    <div>
                      <h3
                        className={[
                          "mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-yellow-400",
                          tandas.length === 1 ? "justify-center" : "",
                        ].join(" ")}
                      >
                        <Trophy className="h-4 w-4" aria-hidden="true" />
                        Ganadores
                      </h3>
                      {/* Igual que los premios: si el ultimo queda solo en su
                          fila, queda centrado y no colgando a la izquierda. */}
                      <ol className="flex flex-wrap justify-center gap-2">
                        {ganadoresTanda.map((fila) => (
                          <li
                            key={fila.id}
                            className="flex basis-full items-center gap-3 rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-black px-4 py-3 text-left sm:basis-[calc(50%-0.25rem)]"
                          >
                            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 text-sm font-black text-yellow-400">
                              {fila.slot}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-white">{fila.nombre}</p>
                              <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                                <span className="text-yellow-400/80">
                                  {etiquetaPremio(fila.premio_nombre, fila.slot)}
                                </span>
                                {fila.localidad && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" aria-hidden="true" />
                                    {fila.localidad}
                                  </span>
                                )}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Llamada a inscribirse: el sorteo es entre inscriptos */}
          {!cargando && tandas.length > 0 && (
            <div className="mt-14 rounded-2xl border border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10 p-6 text-center">
              <PartyPopper className="mx-auto mb-2 h-7 w-7 text-yellow-400" aria-hidden="true" />
              <p className="font-bold text-white">
                {hayGanadores ? "¡Felicitaciones a los ganadores!" : "Todos los inscriptos participan"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
                Los sorteos se hacen el día del evento, entre los que están presentes en la
                acreditación.
              </p>
              <Link
                href="/inscripcion"
                className="mt-4 inline-block rounded-full bg-yellow-400 px-6 py-3 font-bold text-black transition-colors hover:bg-yellow-500"
              >
                Inscribirme al cicloturismo
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}

/** Alto de la foto segun el lugar que ocupa el premio en la pagina. */
const PROPORCION: Record<"grande" | "medio" | "chico", string> = {
  grande: "aspect-[16/10]",
  medio: "aspect-[4/3]",
  chico: "aspect-square",
}

function TarjetaPremio({
  premio,
  tamano,
  className = "",
}: {
  premio: Premio
  tamano: "grande" | "medio" | "chico"
  /** Ancho de la tarjeta dentro de la fila (lo decide quien la ubica). */
  className?: string
}) {
  return (
    <div
      data-premio={premio.id}
      className={[
        "group overflow-hidden rounded-xl border bg-zinc-900/70 transition-colors",
        tamano === "chico"
          ? "border-zinc-800 hover:border-yellow-400/50"
          : "border-yellow-400/30 hover:border-yellow-400/70",
        className,
      ].join(" ")}
    >
      <div className={`w-full overflow-hidden bg-black ${PROPORCION[tamano]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage */}
        <img
          src={premio.imagen_url || PREMIO_PLACEHOLDER}
          alt={premio.nombre}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <p
          className={[
            "font-bold leading-tight text-white",
            tamano === "grande" ? "text-lg sm:text-xl" : tamano === "medio" ? "text-base" : "text-sm",
          ].join(" ")}
        >
          {premio.nombre}
          {premio.cantidad > 1 && (
            <span className="ml-1 text-xs text-yellow-400">×{premio.cantidad}</span>
          )}
        </p>
        {premio.descripcion && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{premio.descripcion}</p>
        )}
      </div>
    </div>
  )
}

/**
 * El premio importante cuando hay uno solo: foto grande y el texto al costado
 * en pantallas anchas, para que se lea de lejos y no quede una tarjeta chica
 * perdida arriba.
 */
function TarjetaDestacada({ premio, nivel }: { premio: Premio; nivel: NivelPremio }) {
  const esMejor = nivel === "principal"
  return (
    <div
      className={[
        "group overflow-hidden rounded-2xl border bg-gradient-to-br from-zinc-900 to-black sm:flex",
        esMejor
          ? "border-yellow-400/50 shadow-[0_0_40px_-18px_rgba(255,215,0,0.6)]"
          : "border-yellow-400/25",
      ].join(" ")}
    >
      <div
        className={[
          "w-full overflow-hidden bg-black",
          esMejor ? "aspect-[16/10] sm:aspect-auto sm:w-3/5" : "aspect-[16/10] sm:aspect-auto sm:w-1/2",
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage */}
        <img
          src={premio.imagen_url || PREMIO_PLACEHOLDER}
          alt={premio.nombre}
          loading="lazy"
          decoding="async"
          className="h-full min-h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 p-5 sm:p-6">
        <p
          className={[
            "font-heading font-black leading-tight text-white",
            esMejor ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          ].join(" ")}
        >
          {premio.nombre}
          {premio.cantidad > 1 && (
            <span className="ml-2 align-middle text-base text-yellow-400">×{premio.cantidad}</span>
          )}
        </p>
        {premio.descripcion && <p className="text-sm text-zinc-400">{premio.descripcion}</p>}
        <p className="text-xs text-zinc-500">Se sortea entre todos los inscriptos presentes</p>
      </div>
    </div>
  )
}
