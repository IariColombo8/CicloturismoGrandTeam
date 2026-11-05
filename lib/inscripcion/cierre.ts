// Cierre de las inscripciones.
//
// Hasta el 5 de noviembre a las 20 hs (hora argentina; se extendio desde las 8) se puede
// inscribir; despues el servidor rechaza todo envio y /inscripcion muestra que
// cerro. La zona horaria va explicita (-03:00) porque el servidor de Vercel
// corre en UTC: sin ella, "20:00" serian las 17 hs en Argentina.
//
// Lo usan la API (/api/inscripcion/submit), el formulario y la ventana
// "Antes de inscribirte". Para mover el cierre se cambian solo estas lineas.
export const CIERRE_INSCRIPCIONES = "2026-11-05T20:00:00-03:00"

export const CIERRE_INSCRIPCIONES_AVISO =
  "Hay tiempo hasta el 5 de noviembre a las 20 hs. Después de esa hora no se aceptan más inscripciones."

// Version corta para la pastilla del precio en el hero de la home.
export const CIERRE_INSCRIPCIONES_CORTO = "hasta el 5/11, 20 h"

export const INSCRIPCIONES_CERRADAS_MENSAJE =
  "Las inscripciones cerraron el 5 de noviembre a las 20 hs. Ya no se aceptan más inscripciones."

const CIERRE_MS = new Date(CIERRE_INSCRIPCIONES).getTime()

/** true desde el momento del cierre en adelante. */
export function inscripcionesCerradas(ahora: number = Date.now()): boolean {
  return ahora >= CIERRE_MS
}

/** Milisegundos que faltan para el cierre (0 si ya cerro). */
export function msHastaCierre(ahora: number = Date.now()): number {
  return Math.max(0, CIERRE_MS - ahora)
}
