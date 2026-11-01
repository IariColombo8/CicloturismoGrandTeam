"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { Download, Navigation, Pause, Play } from "lucide-react"
import { PUNTOS_RUTA, URL_GPX, linkComoLlegar } from "@/lib/recorrido"

// Leaflet (~40 KB + su CSS) baja recien cuando el mapa se acerca a la pantalla.
const MapaLeaflet = dynamic(() => import("./MapaLeaflet"), { ssr: false })

export default function MapaRecorrido() {
  const caja = useRef<HTMLDivElement>(null)
  const [cargar, setCargar] = useState(false)
  const [listo, setListo] = useState(false)
  const [enPantalla, setEnPantalla] = useState(false)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    const nodo = caja.current
    if (!nodo) return
    if (typeof IntersectionObserver === "undefined") {
      setCargar(true)
      setEnPantalla(true)
      return
    }
    // Uno para empezar a bajar el mapa un poco antes de llegar, otro para mover la bici
    // solo mientras se ve (fuera de pantalla no gasta bateria).
    const precarga = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setCargar(true)
          precarga.disconnect()
        }
      },
      { rootMargin: "600px 0px" },
    )
    const visible = new IntersectionObserver((entradas) => setEnPantalla(entradas.some((e) => e.isIntersecting)))
    precarga.observe(nodo)
    visible.observe(nodo)
    return () => {
      precarga.disconnect()
      visible.disconnect()
    }
  }, [])

  return (
    <div className="space-y-3">
      <div
        ref={caja}
        className="relative w-full h-72 sm:h-96 md:h-[500px] bg-zinc-900 rounded-xl border-2 border-yellow-400/20 overflow-hidden isolate"
        data-testid="mapa-recorrido"
      >
        {cargar && <MapaLeaflet enMovimiento={enPantalla && !pausado} onListo={() => setListo(true)} />}

        {!listo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4" aria-hidden="true">
            <Navigation className="w-10 h-10 text-yellow-400 opacity-70" />
            <p className="text-gray-400 text-sm">Cargando el mapa…</p>
          </div>
        )}

        {listo && (
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            className="absolute bottom-3 left-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border border-yellow-400/40 bg-black/80 px-3 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-black"
            aria-pressed={pausado}
          >
            {pausado ? <Play className="w-3.5 h-3.5" aria-hidden="true" /> : <Pause className="w-3.5 h-3.5" aria-hidden="true" />}
            {pausado ? "Mover la bici" : "Pausar"}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <a
          href={URL_GPX}
          download="recorrido-grand-team.gpx"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar el recorrido (GPX)
        </a>
        <a
          href={linkComoLlegar(PUNTOS_RUTA[0])}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-yellow-400/40 px-4 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-yellow-400/10 transition-colors"
        >
          <Navigation className="w-4 h-4" aria-hidden="true" />
          Cómo llegar a la salida
        </a>
      </div>
      <p className="text-xs text-gray-500">
        El GPX se abre en Strava, Garmin, Wikiloc o la app que uses para seguir rutas.
      </p>
    </div>
  )
}
