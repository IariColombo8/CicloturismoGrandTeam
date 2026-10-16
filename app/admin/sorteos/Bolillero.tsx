"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Check,
  Dices,
  Gift,
  History,
  Loader2,
  MapPin,
  PartyPopper,
  RotateCcw,
  Trash2,
  Trophy,
  UserX,
  Users,
  X,
} from "lucide-react"
import {
  candidatosRepesca,
  estadoBolillero,
  etiquetaPremio,
  ganadores,
  participantesElegibles,
  planDePremios,
  prepararTirada,
  slotsSinReclamar,
  slotsSinTirar,
  tiradaEnEspera,
  VUELTA_REPESCA,
  VUELTA_SORTEO,
  type Candidato,
  type FilaParticipante,
  type Premio,
  type Resultado,
  type Sorteo,
} from "@/lib/sorteos"
import { nuevoId, type FilaResultado } from "@/lib/sorteosLocal"
import type { DatosSorteos } from "./useSorteos"

interface Props {
  sorteo: Sorteo
  premios: Premio[]
  participantes: FilaParticipante[]
  resultados: Resultado[]
  datos: DatosSorteos
}

/** Cuanto dura el revoleo de nombres antes de mostrar al ganador. */
const MS_ANIMACION = 2600

/**
 * El bolillero: la pantalla con la que se sortea en el escenario.
 *
 * Funciona sin internet: los nombres y los premios ya estan precargados
 * (useSorteos), el azar se tira en el telefono y cada tirada se guarda local y
 * se sube cuando vuelve la señal.
 */
export default function Bolillero({ sorteo, premios, participantes, resultados, datos }: Props) {
  const [vuelta, setVuelta] = useState<number>(VUELTA_SORTEO)
  const [animando, setAnimando] = useState(false)
  const [nombreRevoleado, setNombreRevoleado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [verHistorial, setVerHistorial] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    },
    [],
  )

  const premiosDelSorteo = useMemo(
    () => premios.filter((p) => p.sorteo_id === sorteo.id),
    [premios, sorteo.id],
  )
  const delSorteo = useMemo(
    () => resultados.filter((r) => r.sorteo_id === sorteo.id),
    [resultados, sorteo.id],
  )
  const elegibles = useMemo(
    () => participantesElegibles(participantes, sorteo),
    [participantes, sorteo],
  )

  const enEspera = useMemo(() => tiradaEnEspera(delSorteo), [delSorteo])
  const premiados = useMemo(() => ganadores(delSorteo), [delSorteo])
  const sinReclamar = useMemo(() => slotsSinReclamar(delSorteo), [delSorteo])
  const faltanTirar = useMemo(
    () => slotsSinTirar(delSorteo, sorteo.total_sorteos),
    [delSorteo, sorteo.total_sorteos],
  )
  const plan = useMemo(
    () => planDePremios(premiosDelSorteo, sorteo.total_sorteos),
    [premiosDelSorteo, sorteo.total_sorteos],
  )

  // Bolillero de la vuelta en curso: con esto se muestra "quedan N en el bolillero".
  const pool: Candidato[] = useMemo(
    () => (vuelta === VUELTA_SORTEO ? elegibles : candidatosRepesca(delSorteo, elegibles)),
    [vuelta, elegibles, delSorteo],
  )
  const bolillero = useMemo(() => estadoBolillero(pool, delSorteo, vuelta), [pool, delSorteo, vuelta])

  const proximoSlot = vuelta === VUELTA_SORTEO ? faltanTirar[0] : sinReclamar[0]?.slot
  const proximoPremio = proximoSlot ? plan[proximoSlot - 1] ?? null : null

  const sortear = useCallback(() => {
    if (animando || enEspera) return

    const tirada = prepararTirada({
      elegibles,
      resultados: delSorteo,
      premios: premiosDelSorteo,
      total: sorteo.total_sorteos,
      vuelta,
    })

    if (!tirada) {
      setAviso(
        vuelta === VUELTA_SORTEO
          ? "No queda nada por sortear en esta tanda."
          : "No hay premios sin reclamar para repescar.",
      )
      return
    }

    setAviso(null)
    setAnimando(true)

    // Revoleo de nombres: puro efecto visual, el ganador ya esta elegido.
    const nombres = bolillero.disponibles.map((c) => c.nombre)
    let tic = 0
    const intervalo = setInterval(() => {
      tic++
      setNombreRevoleado(nombres[Math.floor(Math.random() * nombres.length)] ?? tirada.candidato.nombre)
      // Se va frenando para que el final se sienta.
      if (tic > 24) clearInterval(intervalo)
    }, 90)

    const fin = setTimeout(async () => {
      clearInterval(intervalo)
      setNombreRevoleado(null)
      setAnimando(false)

      const fila: FilaResultado = {
        id: nuevoId(),
        sorteo_id: sorteo.id,
        premio_id: tirada.premio_id,
        premio_nombre: tirada.premio_nombre,
        orden: tirada.orden,
        slot: tirada.slot,
        ronda: tirada.ronda,
        vuelta: tirada.vuelta,
        participante_id: tirada.candidato.id,
        nombre: tirada.candidato.nombre,
        localidad: tirada.candidato.localidad,
        grupo: tirada.candidato.grupo,
        estado: "pendiente",
        resuelto_en: null,
      }

      await datos.registrarTirada(fila)
      if (sorteo.estado === "borrador") datos.cambiarEstadoSorteo(sorteo.id, "en_curso")
    }, MS_ANIMACION)

    timersRef.current.push(fin)
  }, [animando, enEspera, elegibles, delSorteo, premiosDelSorteo, sorteo, vuelta, bolillero.disponibles, datos])

  // Barra espaciadora para sortear: en el escenario se usa con una sola mano.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      const activo = document.activeElement?.tagName
      if (activo === "INPUT" || activo === "TEXTAREA" || activo === "BUTTON") return
      e.preventDefault()
      sortear()
    }
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  }, [sortear])

  const terminado =
    vuelta === VUELTA_SORTEO ? faltanTirar.length === 0 && !enEspera : sinReclamar.length === 0 && !enEspera

  return (
    <div className="space-y-5">
      {/* ── Selector de vuelta ───────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setVuelta(VUELTA_SORTEO)}
          className={[
            "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
            vuelta === VUELTA_SORTEO
              ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
              : "border-zinc-700 text-zinc-400 hover:text-white",
          ].join(" ")}
        >
          <Dices className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
          Sorteo ({sorteo.total_sorteos - faltanTirar.length}/{sorteo.total_sorteos})
        </button>

        <button
          type="button"
          onClick={() => setVuelta(VUELTA_REPESCA)}
          disabled={sinReclamar.length === 0}
          className={[
            "rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            vuelta === VUELTA_REPESCA
              ? "border-amber-400 bg-amber-400/15 text-amber-200"
              : "border-zinc-700 text-zinc-400 hover:text-white",
          ].join(" ")}
        >
          <RotateCcw className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
          Rehacer los que no reclamaron ({sinReclamar.length})
        </button>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
          <Users className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
          {bolillero.disponibles.length} en el bolillero
          {bolillero.ronda > 1 && <span className="text-yellow-400">· ronda {bolillero.ronda}</span>}
        </span>
      </div>

      {aviso && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {aviso}
        </p>
      )}

      {/* ── Escenario ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-b from-zinc-900 via-black to-zinc-900 p-5 text-center sm:p-8">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[100px]" />

        <div className="relative z-10 space-y-5">
          {/* Que se esta sorteando */}
          {!enEspera && !terminado && proximoSlot && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                {vuelta === VUELTA_SORTEO ? `Sorteo ${proximoSlot}` : `Repesca del premio ${proximoSlot}`}
              </p>
              <h3 className="font-heading text-2xl font-black text-white sm:text-3xl">
                {etiquetaPremio(proximoPremio?.nombre ?? null, proximoSlot)}
              </h3>
              {proximoPremio?.imagen_url && (
                /* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage */
                <img
                  src={proximoPremio.imagen_url}
                  alt={proximoPremio.nombre}
                  className="mx-auto h-28 w-28 rounded-xl border border-zinc-700 object-cover sm:h-36 sm:w-36"
                />
              )}
            </div>
          )}

          {/* Revoleo */}
          {animando && (
            <div className="py-6">
              <p className="animate-pulse text-3xl font-black text-yellow-400 sm:text-5xl">
                {nombreRevoleado ?? "..."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-widest text-zinc-500">Sorteando…</p>
            </div>
          )}

          {/* Ganador esperando respuesta */}
          {!animando && enEspera && (
            <div className="space-y-4 py-4">
              <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-400">
                <PartyPopper className="h-4 w-4" aria-hidden="true" />
                {etiquetaPremio(enEspera.premio_nombre, enEspera.slot)}
                {enEspera.vuelta === VUELTA_REPESCA && <span className="text-amber-300">· repesca</span>}
              </p>

              <p className="font-heading text-3xl font-black leading-tight text-white sm:text-5xl">
                {enEspera.nombre}
              </p>

              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                {enEspera.localidad && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-yellow-400/70" aria-hidden="true" />
                    {enEspera.localidad}
                  </span>
                )}
                {enEspera.grupo && <span>{enEspera.grupo}</span>}
              </p>

              <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
                <Button
                  onClick={() => datos.cambiarEstadoResultado(enEspera.id, "reclamado")}
                  className="bg-green-500 py-6 text-base font-black text-black hover:bg-green-400 sm:py-5"
                >
                  <Check className="mr-2 h-5 w-5" />
                  Reclamó el premio
                </Button>
                <Button
                  onClick={() => datos.cambiarEstadoResultado(enEspera.id, "no_reclamo")}
                  variant="outline"
                  className="border-amber-500/50 py-6 text-base font-bold text-amber-300 hover:bg-amber-500/10 sm:py-5"
                >
                  <UserX className="mr-2 h-5 w-5" />
                  No está · pasar al siguiente
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Si no está, el premio queda en la lista de “no reclamaron” y se vuelve a sortear
                cuando quieras.
              </p>
            </div>
          )}

          {/* Boton de sortear */}
          {!animando && !enEspera && (
            <div className="space-y-3 py-2">
              {terminado ? (
                <p className="flex items-center justify-center gap-2 text-lg font-bold text-green-300">
                  <Trophy className="h-5 w-5" aria-hidden="true" />
                  {vuelta === VUELTA_SORTEO
                    ? "Se completaron todas las tiradas"
                    : "No quedan premios sin reclamar"}
                </p>
              ) : (
                <>
                  <Button
                    onClick={sortear}
                    disabled={bolillero.disponibles.length === 0}
                    className="h-auto w-full max-w-sm bg-yellow-400 py-6 text-xl font-black text-black hover:bg-yellow-500 sm:text-2xl"
                  >
                    <Dices className="mr-2 h-6 w-6" />
                    Sortear
                  </Button>
                  <p className="text-xs text-zinc-500">
                    {bolillero.disponibles.length === 0
                      ? "No hay nadie en el bolillero: revisá los filtros en Configuración."
                      : bolillero.rondaNueva
                        ? "Salieron todos: arranca una ronda nueva con todos adentro otra vez."
                        : "También podés tocar la barra espaciadora."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Los que no reclamaron ────────────────────── */}
      {sinReclamar.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-200">
            <UserX className="h-4 w-4" aria-hidden="true" />
            No reclamaron ({sinReclamar.length})
          </h3>
          <ul className="space-y-1.5">
            {sinReclamar.map((fila) => (
              <li
                key={fila.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-white">{fila.nombre}</span>
                <span className="text-xs text-zinc-500">
                  {etiquetaPremio(fila.premio_nombre, fila.slot)}
                </span>
                <button
                  type="button"
                  onClick={() => datos.cambiarEstadoResultado(fila.id, "reclamado")}
                  className="ml-auto flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300 hover:bg-green-500/20"
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Apareció, reclamó
                </button>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => {
              setVuelta(VUELTA_REPESCA)
              setAviso(null)
            }}
            className="mt-3 w-full bg-amber-400 font-bold text-black hover:bg-amber-300"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Rehacer el sorteo de los que no reclamaron
          </Button>
          <p className="mt-2 text-xs text-amber-200/70">
            Se sortean solo estos nombres, por los premios que quedaron sin dueño. Los que ya
            ganaron no vuelven a entrar.
          </p>
        </section>
      )}

      {/* ── Ganadores ────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-yellow-400">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Ganadores ({premiados.length})
        </h3>

        {premiados.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">Todavía no salió ningún premio.</p>
        ) : (
          <ol className="space-y-1.5">
            {premiados.map((fila) => (
              <li
                key={fila.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm"
              >
                <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-yellow-400/15 text-xs font-bold text-yellow-400">
                  {fila.slot}
                </span>
                <span className="font-semibold text-white">{fila.nombre}</span>
                <span className="text-xs text-zinc-400">
                  <Gift className="mr-1 inline h-3 w-3 text-yellow-400/70" aria-hidden="true" />
                  {etiquetaPremio(fila.premio_nombre, fila.slot)}
                </span>
                {fila.localidad && <span className="text-xs text-zinc-500">{fila.localidad}</span>}
                <button
                  type="button"
                  onClick={() => datos.cambiarEstadoResultado(fila.id, "no_reclamo")}
                  aria-label={`Marcar que ${fila.nombre} no reclamó`}
                  title="Se marcó por error: volver a 'no reclamó'"
                  className="ml-auto rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-amber-300"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Historial completo ───────────────────────── */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <button
          type="button"
          onClick={() => setVerHistorial(!verHistorial)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-300"
        >
          <History className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          Historial de tiradas ({delSorteo.length})
        </button>

        {verHistorial && (
          <ul className="space-y-1 border-t border-zinc-800 p-3 text-xs">
            {delSorteo
              .slice()
              .sort((a, b) => b.vuelta - a.vuelta || b.orden - a.orden)
              .map((fila) => (
                <li key={fila.id} className="flex flex-wrap items-center gap-2 px-1 py-1 text-zinc-400">
                  <span className="text-zinc-600">
                    {fila.vuelta === VUELTA_SORTEO ? "Sorteo" : "Repesca"} · premio {fila.slot}
                    {fila.ronda > 1 && ` · ronda ${fila.ronda}`}
                  </span>
                  <span className="font-semibold text-zinc-200">{fila.nombre}</span>
                  <span
                    className={[
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                      fila.estado === "reclamado"
                        ? "bg-green-500/15 text-green-300"
                        : fila.estado === "no_reclamo"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-zinc-700/40 text-zinc-300",
                    ].join(" ")}
                  >
                    {fila.estado === "reclamado"
                      ? "reclamó"
                      : fila.estado === "no_reclamo"
                        ? "no reclamó"
                        : "esperando"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Borrar la tirada de ${fila.nombre}? Vuelve al bolillero.`)) {
                        datos.borrarResultado(fila.id)
                      }
                    }}
                    aria-label="Borrar tirada"
                    className="rounded p-1 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {datos.pendientes > 0 && (
        <p className="flex items-center gap-2 text-xs text-amber-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {datos.pendientes} {datos.pendientes === 1 ? "cambio" : "cambios"} guardados en este
          dispositivo, se suben cuando vuelva internet.
        </p>
      )}
    </div>
  )
}
