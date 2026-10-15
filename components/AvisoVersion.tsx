"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, X } from "lucide-react"
import { VERSION_SITIO, registrarServiceWorker, soportaServiceWorker, versionPublicada } from "@/lib/serviceWorker"

/**
 * Dos cosas, las dos silenciosas hasta que hacen falta:
 *
 * 1. Registra el Service Worker, que guarda una copia del sitio para que el
 *    formulario abra aunque el celular no tenga señal (y que es el mismo que
 *    recibe las notificaciones push).
 * 2. Si la persona está viendo una versión vieja del sitio — porque dejó la
 *    pestaña abierta durante un deploy, o porque el teléfono le sirvió una
 *    copia guardada — se lo avisa y le ofrece recargar. Se puede cerrar: nadie
 *    queda tapado por un cartel.
 *
 * Por qué hace falta: las páginas se sirven con `s-maxage=60` y los archivos JS
 * con `immutable`. Una pestaña vieja pidiendo archivos que ya no existen es
 * justo lo que produce el "ChunkLoadError", así que es mejor avisar antes.
 */

const CADA = 5 * 60 * 1000 // cada 5 minutos

export default function AvisoVersion() {
  const [hayVersionNueva, setHayVersionNueva] = useState(false)
  const [cerrado, setCerrado] = useState(false)
  const [recargando, setRecargando] = useState(false)

  const revisar = useCallback(async () => {
    const publicada = await versionPublicada()
    // Sin respuesta (sin internet) no se avisa nada. En desarrollo tampoco.
    if (!publicada || VERSION_SITIO === "dev") return
    if (publicada !== VERSION_SITIO) setHayVersionNueva(true)
  }, [])

  useEffect(() => {
    let activo = true

    const arrancar = async () => {
      const registro = await registrarServiceWorker()

      // El worker avisa cuando bajó una versión nueva y quedó esperando.
      if (registro) {
        if (registro.waiting) setHayVersionNueva(true)
        registro.addEventListener("updatefound", () => {
          const nuevo = registro.installing
          if (!nuevo) return
          nuevo.addEventListener("statechange", () => {
            // Solo si ya había un worker controlando: en la primera visita no
            // hay nada viejo que reemplazar.
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              if (activo) setHayVersionNueva(true)
            }
          })
        })
      }

      await revisar()
    }

    void arrancar()

    // Se revisa cada tanto y al volver a la pestaña.
    const timer = window.setInterval(() => void revisar(), CADA)
    const alVolver = () => {
      if (document.visibilityState === "visible") void revisar()
    }
    document.addEventListener("visibilitychange", alVolver)

    return () => {
      activo = false
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", alVolver)
    }
  }, [revisar])

  // Mientras el cartel está, se le hace lugar abajo de la página: así no tapa
  // el último botón del formulario ni el pie.
  useEffect(() => {
    const visible = hayVersionNueva && !cerrado
    if (typeof document === "undefined") return
    const anterior = document.body.style.paddingBottom
    if (visible) document.body.style.paddingBottom = "150px"
    return () => {
      document.body.style.paddingBottom = anterior
    }
  }, [hayVersionNueva, cerrado])

  const recargar = async () => {
    setRecargando(true)
    try {
      if (soportaServiceWorker()) {
        const registro = await navigator.serviceWorker.getRegistration()
        // Que el worker nuevo tome el control sin esperar.
        registro?.waiting?.postMessage("activar-ahora")
      }
      // Borra las copias guardadas para no volver a ver lo viejo.
      if ("caches" in window) {
        const nombres = await caches.keys()
        await Promise.all(nombres.map((n) => caches.delete(n)))
      }
    } catch {
      // Si algo de esto falla, recargar igual suele alcanzar.
    }
    window.location.reload()
  }

  if (!hayVersionNueva || cerrado) return null

  return (
    // pointer-events-none en el contenedor (y auto en la tarjeta): el cartel
    // ocupa todo el ancho de la pantalla, y sin esto se comía los clics de lo
    // que estuviera debajo. Pasó de verdad: tapaba el botón "Siguiente" del
    // formulario de inscripción y no se podía avanzar.
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-4 sm:pb-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-3 rounded-xl border border-yellow-400/40 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-yellow-400">Hicimos actualizaciones</p>
          <p className="mt-0.5 text-sm text-gray-300">
            Por favor reiniciá la página para usar la versión nueva.
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={recargar}
            disabled={recargando}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-600 px-4 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-70 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 ${recargando ? "animate-spin" : ""}`} aria-hidden="true" />
            {recargando ? "Reiniciando…" : "Reiniciar ahora"}
          </button>
          <button
            type="button"
            onClick={() => setCerrado(true)}
            aria-label="Cerrar el aviso"
            className="rounded-lg border border-zinc-700 p-2.5 text-gray-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
