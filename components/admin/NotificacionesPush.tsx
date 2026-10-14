"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"

/**
 * Convierte la clave VAPID base64url al buffer que pide el navegador.
 * Se construye sobre un ArrayBuffer explicito: un Uint8Array generico no
 * satisface el tipo BufferSource que espera pushManager.subscribe.
 */
function claveAUint8(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const normal = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const binaria = window.atob(normal)
  const salida = new Uint8Array(new ArrayBuffer(binaria.length))
  for (let i = 0; i < binaria.length; i += 1) salida[i] = binaria.charCodeAt(i)
  return salida
}

type Estado = "cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo"

/**
 * Activa/desactiva las notificaciones push de este dispositivo.
 *
 * Cada navegador y cada telefono se suscribe por separado: activarlo en la
 * compu no alcanza para que llegue al celular.
 */
export default function NotificacionesPush() {
  const { session } = useSupabaseContext()
  const [estado, setEstado] = useState<Estado>("cargando")
  const [trabajando, setTrabajando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const clavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

  // Estado inicial: soporte del navegador, permiso y suscripcion existente.
  useEffect(() => {
    let cancelado = false

    const revisar = async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !clavePublica
      ) {
        if (!cancelado) setEstado("no-soportado")
        return
      }

      if (Notification.permission === "denied") {
        if (!cancelado) setEstado("bloqueado")
        return
      }

      try {
        const registro = await navigator.serviceWorker.getRegistration()
        const suscripcion = await registro?.pushManager.getSubscription()
        if (!cancelado) setEstado(suscripcion ? "activo" : "inactivo")
      } catch {
        if (!cancelado) setEstado("inactivo")
      }
    }

    revisar()
    return () => {
      cancelado = true
    }
  }, [clavePublica])

  const activar = useCallback(async () => {
    if (!session?.access_token || trabajando) return

    setTrabajando(true)
    setAviso(null)

    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo")
        setAviso("No diste permiso para las notificaciones.")
        return
      }

      const registro = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      // Si ya habia una suscripcion vieja (de otras claves VAPID) se descarta.
      const previa = await registro.pushManager.getSubscription()
      if (previa) await previa.unsubscribe()

      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveAUint8(clavePublica),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(suscripcion.toJSON()),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        await suscripcion.unsubscribe()
        setAviso(data.error || "No se pudo registrar el dispositivo.")
        setEstado("inactivo")
        return
      }

      setEstado("activo")
      setAviso("Listo: este dispositivo va a recibir los avisos.")
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudieron activar las notificaciones.")
      setEstado("inactivo")
    } finally {
      setTrabajando(false)
    }
  }, [session?.access_token, clavePublica, trabajando])

  const desactivar = useCallback(async () => {
    if (!session?.access_token || trabajando) return

    setTrabajando(true)
    setAviso(null)

    try {
      const registro = await navigator.serviceWorker.getRegistration()
      const suscripcion = await registro?.pushManager.getSubscription()

      if (suscripcion) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(suscripcion.endpoint)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        await suscripcion.unsubscribe()
      }

      setEstado("inactivo")
      setAviso("Este dispositivo ya no va a recibir avisos.")
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudieron desactivar.")
    } finally {
      setTrabajando(false)
    }
  }, [session?.access_token, trabajando])

  const probar = useCallback(async () => {
    if (!session?.access_token || trabajando) return

    setTrabajando(true)
    setAviso(null)

    try {
      const res = await fetch("/api/push/probar", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.enviadas) {
        setAviso(data.motivo || data.error || "No se pudo enviar la prueba.")
        return
      }

      // Desglose por equipo: si dice "pc: aceptada" y en la pantalla no aparece
      // nada, el push salio bien y el que no la muestra es Windows.
      const detalle = Array.isArray(data.detalle)
        ? (data.detalle as { equipo: string; ok: boolean; status?: number }[])
            .map((d) => `${d.equipo}: ${d.ok ? "aceptada" : `error ${d.status ?? "?"}`}`)
            .join(" · ")
        : ""

      setAviso(
        `Enviada a ${data.enviadas} dispositivo${data.enviadas !== 1 ? "s" : ""}.` +
          (detalle ? ` (${detalle})` : "")
      )
    } catch {
      setAviso("Error de red al enviar la prueba.")
    } finally {
      setTrabajando(false)
    }
  }, [session?.access_token, trabajando])

  /**
   * Prueba local: muestra una notificacion desde el service worker sin pasar
   * por el servidor ni por el push service.
   *
   * Es el diagnostico que separa los dos problemas posibles: si esta tampoco
   * aparece, el push esta bien y quien no la muestra es el sistema (en Windows,
   * notificaciones de Chrome apagadas o "No molestar"). Si esta aparece y la
   * del boton "Probar" no, el problema es la entrega push.
   */
  const probarLocal = useCallback(async () => {
    if (trabajando) return

    setTrabajando(true)
    setAviso(null)

    try {
      const registro = await navigator.serviceWorker.getRegistration()
      if (!registro) {
        setAviso("Este equipo no tiene el service worker registrado. Volvé a activar los avisos.")
        return
      }

      await registro.showNotification("Prueba local de aviso", {
        body: "Si ves esto, el equipo muestra las notificaciones.",
        icon: "/email/logo.png",
        badge: "/email/logo.png",
        tag: "prueba-local",
      })

      setAviso(
        "Si no apareció ninguna notificación en pantalla, el problema es del sistema: revisá que " +
          "las notificaciones del navegador estén permitidas en Windows y que no esté activado " +
          "«No molestar»."
      )
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo mostrar la notificación local.")
    } finally {
      setTrabajando(false)
    }
  }, [trabajando])

  if (estado === "cargando") return null

  if (estado === "no-soportado") {
    return (
      <p className="text-xs text-gray-500">
        Este navegador no admite notificaciones push.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {estado === "activo" ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold">
              <BellRing className="w-3.5 h-3.5" />
              Avisos activados
            </span>
            <button
              type="button"
              onClick={probar}
              disabled={trabajando}
              title="Manda un push real a todos los dispositivos suscriptos"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 text-xs hover:bg-zinc-700 transition-all disabled:opacity-50"
            >
              Probar
            </button>
            <button
              type="button"
              onClick={probarLocal}
              disabled={trabajando}
              title="Muestra una notificacion en este equipo sin pasar por el servidor"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-300 text-xs hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
            >
              Probar en este equipo
            </button>
            <button
              type="button"
              onClick={desactivar}
              disabled={trabajando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-400 text-xs hover:text-white transition-all disabled:opacity-50"
            >
              <BellOff className="w-3.5 h-3.5" />
              Desactivar
            </button>
          </>
        ) : estado === "bloqueado" ? (
          <p className="text-xs text-orange-300">
            Bloqueaste las notificaciones para este sitio. Habilitalas desde el candado de la barra
            de direcciones y recarga la pagina.
          </p>
        ) : (
          <button
            type="button"
            onClick={activar}
            disabled={trabajando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-semibold hover:bg-yellow-500 transition-all disabled:opacity-50"
          >
            {trabajando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Avisarme de inscripciones nuevas
          </button>
        )}
      </div>

      {aviso && <p className="text-xs text-gray-400">{aviso}</p>}

      {estado !== "activo" && estado !== "bloqueado" && (
        <p className="text-xs text-gray-500">
          Hay que activarlo en cada dispositivo. En iPhone, primero agregá el sitio a la pantalla de
          inicio y abrilo desde ahí.
        </p>
      )}
    </div>
  )
}
