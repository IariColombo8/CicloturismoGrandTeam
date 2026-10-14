// lib/push/enviar.ts
// Envio de notificaciones Web Push a los dispositivos de los administradores.
// Uso exclusivo en servidor: la clave privada VAPID nunca sale de aca.

import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase-admin"

export interface PayloadPush {
  titulo: string
  cuerpo: string
  /** A donde lleva el click. Por defecto, el listado de inscripciones. */
  url?: string
  /** Agrupa notificaciones del mismo tipo (la nueva reemplaza a la anterior). */
  tag?: string
}

/** Como le fue a cada dispositivo. Sirve para diagnosticar "a mi no me llega". */
export interface DetalleEnvio {
  equipo: "celular" | "pc"
  ok: boolean
  /** Status que devolvio el push service cuando fallo. */
  status?: number
  /** True si la suscripcion se borro por estar vencida (404/410). */
  dadaDeBaja?: boolean
}

export interface ResultadoEnvio {
  enviadas: number
  fallidas: number
  /** Suscripciones que el navegador ya no reconoce y se dieron de baja. */
  limpiadas: number
  /** Motivo por el que no se envio nada (sin configurar, sin dispositivos). */
  motivo?: string
  /** Resultado por dispositivo, en el mismo orden que se consultaron. */
  detalle?: DetalleEnvio[]
}

/** True si el servidor tiene configuradas las claves VAPID. */
export function pushConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  )
}

let vapidListo = false

function configurarVapid(): void {
  if (vapidListo) return

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:grandteamcdelu@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  )
  vapidListo = true
}

interface FilaSuscripcion {
  id: number
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
}

/** Celular o compu, segun el user agent que guardo el navegador al suscribirse. */
function equipoDe(userAgent: string | null): "celular" | "pc" {
  return /mobile|android|iphone|ipad/i.test(userAgent || "") ? "celular" : "pc"
}

/**
 * Manda la notificacion a todos los dispositivos registrados.
 *
 * Nunca lanza: si el push falla no debe tumbar la operacion que lo disparo
 * (por ejemplo, el alta de una inscripcion).
 */
export async function enviarPushATodos(payload: PayloadPush): Promise<ResultadoEnvio> {
  const vacio: ResultadoEnvio = { enviadas: 0, fallidas: 0, limpiadas: 0 }

  if (!pushConfigurado()) {
    return { ...vacio, motivo: "Faltan las claves VAPID en el servidor" }
  }

  try {
    configurarVapid()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_agent")

    if (error) {
      return { ...vacio, motivo: `No se pudieron leer las suscripciones: ${error.message}` }
    }

    const suscripciones = (data || []) as FilaSuscripcion[]
    if (suscripciones.length === 0) {
      return { ...vacio, motivo: "No hay dispositivos suscriptos" }
    }

    const cuerpo = JSON.stringify(payload)
    const idsMuertas: number[] = []
    const idsOk: number[] = []

    const detalle = await Promise.all(
      suscripciones.map(async (sub): Promise<DetalleEnvio> => {
        const equipo = equipoDe(sub.user_agent)
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            cuerpo,
            { TTL: 60 * 60 * 12 }
          )
          idsOk.push(sub.id)
          return { equipo, ok: true }
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          // 404/410: el navegador dio de baja ese endpoint (desinstalaron la
          // app, limpiaron datos). Se borra para no reintentar por siempre.
          if (status === 404 || status === 410) {
            idsMuertas.push(sub.id)
            return { equipo, ok: false, status, dadaDeBaja: true }
          }

          console.warn(
            `[push] fallo el envio a una suscripcion (${status ?? "sin status"}):`,
            error instanceof Error ? error.message : error
          )
          return { equipo, ok: false, status }
        }
      })
    )

    if (idsMuertas.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", idsMuertas)
    }

    if (idsOk.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ ultimo_ok: new Date().toISOString() })
        .in("id", idsOk)
    }

    return {
      enviadas: idsOk.length,
      fallidas: suscripciones.length - idsOk.length - idsMuertas.length,
      limpiadas: idsMuertas.length,
      detalle,
    }
  } catch (error) {
    console.warn("[push] error general:", error instanceof Error ? error.message : error)
    return { ...vacio, motivo: "Error al enviar las notificaciones" }
  }
}
