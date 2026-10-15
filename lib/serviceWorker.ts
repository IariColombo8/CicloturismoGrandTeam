/**
 * Registro del Service Worker, en un solo lugar.
 *
 * Importa porque el Service Worker hace dos cosas (notificaciones push y que
 * el sitio abra sin internet) y las dos dependen de que haya **un** registro
 * con la misma URL. Si una parte lo registrara como "/sw.js" y otra como
 * "/sw.js?v=123", el navegador tomaría el segundo como un worker distinto,
 * reemplazaría al primero y la suscripción al push se perdería.
 *
 * La version va en la query para que cada deploy instale un worker nuevo (el
 * navegador compara el archivo byte a byte, y el nombre de la cache sale de
 * ahí).
 */

export const VERSION_SITIO = process.env.NEXT_PUBLIC_BUILD_ID || "dev"

export const URL_SW = `/sw.js?v=${encodeURIComponent(VERSION_SITIO)}`

export function soportaServiceWorker() {
  return typeof window !== "undefined" && "serviceWorker" in navigator
}

/**
 * Registra (o actualiza) el worker. Devuelve null si el navegador no puede o
 * si falla, y nunca lanza: que el sitio no abra por un Service Worker sería
 * peor que no tener Service Worker.
 *
 * Se registra también en desarrollo, para poder probar el modo sin internet.
 * Las páginas siempre se piden primero a la red, así que en `npm run dev` no
 * se ve contenido viejo; si alguna vez molesta, se desregistra desde
 * DevTools > Application > Service Workers.
 */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!soportaServiceWorker()) return null

  try {
    const registro = await navigator.serviceWorker.register(URL_SW, { scope: "/" })
    return registro
  } catch (error) {
    console.error("No se pudo registrar el Service Worker:", error)
    return null
  }
}

/** La version que publica el servidor ahora mismo, o "" si no se pudo saber. */
export async function versionPublicada(): Promise<string> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" })
    if (!res.ok) return ""
    const data = (await res.json()) as { version?: string }
    return data.version || ""
  } catch {
    // Sin internet: no sabemos, y no se avisa nada.
    return ""
  }
}
