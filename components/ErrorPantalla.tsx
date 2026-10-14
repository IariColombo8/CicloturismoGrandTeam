"use client"

import { useCallback, useEffect, useState } from "react"

/** Marca en la pestaña que ya se intento recuperar, para no recargar en loop. */
const CLAVE_REINTENTO = "gt-reintento-chunk"

/** URLs de archivos .js que aparecen en el mensaje o el stack del error. */
function archivosDelError(error: Error): string[] {
  const texto = `${error.message || ""}\n${error.stack || ""}`
  const encontradas = texto.match(/https?:\/\/[^\s)"']+\.js/g) || []
  return Array.from(new Set(encontradas))
}

interface ErrorPantallaProps {
  error: Error & { digest?: string }
  /** Vuelve a montar el arbol que fallo (lo da Next). */
  reset?: () => void
}

/**
 * Pantalla de error visible para el usuario.
 *
 * Sin esto, cualquier excepcion en el cliente mostraba el cartel generico de
 * Vercel ("Application error: a client-side exception has occurred"), que no
 * dice nada y obliga a abrir la consola del navegador: imposible desde un
 * celular. Aca se muestra el mensaje real y los dos botones que resuelven el
 * 90% de los casos.
 */
export default function ErrorPantalla({ error, reset }: ErrorPantallaProps) {
  const [limpiando, setLimpiando] = useState(false)

  useEffect(() => {
    // Queda en la consola para cuando si se puede mirar.
    console.error("[error]", error)
  }, [error])

  // Tras un deploy cambian los nombres de los archivos JS. Si el navegador
  // tenia la pagina vieja en cache, pide un archivo que ya no existe y revienta:
  // es el caso mas comun y se arregla recargando sin cache.
  const esAppVieja =
    error.name === "ChunkLoadError" ||
    /Loading chunk|dynamically imported module|Importing a module script failed/i.test(
      error.message || ""
    )

  /** Borra service workers y caches de este sitio y recarga de cero. */
  const limpiarYRecargar = useCallback(async () => {
    setLimpiando(true)
    try {
      if ("serviceWorker" in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registros.map((r) => r.unregister()))
      }
      if ("caches" in window) {
        const nombres = await caches.keys()
        await Promise.all(nombres.map((n) => caches.delete(n)))
      }

      // Los archivos JS se sirven con `immutable`, asi que si uno quedo cortado
      // o corrupto en la cache del navegador, este lo sigue usando sin pedirlo
      // de nuevo y el error se repite para siempre. No hay API para vaciar esa
      // cache, pero `cache: "reload"` fuerza bajarlo otra vez y sobrescribe la
      // entrada mala.
      await Promise.all(
        archivosDelError(error).map((url) =>
          fetch(url, { cache: "reload", mode: "no-cors" }).catch(() => undefined)
        )
      )
    } catch {
      // Si no se puede limpiar, igual recargamos.
    }
    // El parametro rompe la cache del HTML.
    window.location.replace(`${window.location.pathname}?r=${Date.now()}`)
  }, [error])

  // Si lo que fallo es un archivo JS, se intenta arreglar solo una vez por
  // pestaña: baja de nuevo el archivo y recarga. Asi el usuario no tiene que
  // entender nada ni tocar ningun boton. Si despues de eso vuelve a fallar, ya
  // se muestra la pantalla con el detalle.
  useEffect(() => {
    if (!esAppVieja) return

    let yaIntentado = true
    try {
      yaIntentado = sessionStorage.getItem(CLAVE_REINTENTO) === "1"
      if (!yaIntentado) sessionStorage.setItem(CLAVE_REINTENTO, "1")
    } catch {
      // Sin sessionStorage no hay forma de evitar el loop: no se reintenta.
      return
    }

    if (!yaIntentado) limpiarYRecargar()
  }, [esAppVieja, limpiarYRecargar])

  if (limpiando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <p className="text-yellow-400 text-sm animate-pulse">Actualizando la página...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-yellow-400/20 rounded-lg p-5 text-center">
        <h1 className="text-xl font-bold text-yellow-400 mb-2">
          {esAppVieja ? "La página se actualizó" : "Algo falló al cargar"}
        </h1>

        <p className="text-sm text-gray-400 mb-4">
          {esAppVieja
            ? "Tu teléfono está usando una versión vieja guardada. Tocá «Recargar de cero» y listo."
            : "Probá recargar. Si vuelve a pasar, mandale esta pantalla a quien administra el sitio."}
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={limpiarYRecargar}
            disabled={limpiando}
            className="w-full px-4 py-2.5 rounded-lg bg-yellow-400 text-black font-semibold text-sm hover:bg-yellow-500 transition-all disabled:opacity-50"
          >
            {limpiando ? "Recargando..." : "Recargar de cero"}
          </button>

          {reset && (
            <button
              type="button"
              onClick={reset}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 text-sm hover:bg-zinc-700 transition-all"
            >
              Reintentar
            </button>
          )}

          <a
            href="/"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-300 text-sm hover:bg-zinc-700 transition-all"
          >
            Ir al inicio
          </a>
        </div>

        {/* El detalle tecnico: es lo que hace falta para poder arreglarlo. */}
        <details className="mt-4 text-left">
          <summary className="text-xs text-gray-500 cursor-pointer">Ver detalle del error</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 border border-zinc-800 p-2 text-[10px] text-gray-400">
            {error.name}: {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      </div>
    </div>
  )
}
