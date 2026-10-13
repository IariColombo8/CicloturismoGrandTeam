// lib/push/inscripcion.ts
// Arma y manda el aviso de "inscripcion nueva" a los organizadores.
// Uso exclusivo en servidor.

import { enviarPushATodos } from "./enviar"
import { calcularSaldoEsperado, formatearPesos } from "@/lib/finanzas/saldoEsperado"

export interface DatosInscripcionNueva {
  nombre: string
  localidad?: string
  grupo?: string
}

/**
 * Notifica una inscripcion nueva incluyendo cuanta plata deberia haber en el
 * BNA contando esa transferencia.
 *
 * Nunca lanza: el alta de la inscripcion ya esta hecha y no puede fallar por
 * un problema de notificaciones.
 */
export async function notificarInscripcionNueva(datos: DatosInscripcionNueva): Promise<void> {
  try {
    const saldo = await calcularSaldoEsperado()

    const detalle = [datos.localidad, datos.grupo && datos.grupo !== "Sin grupo" ? datos.grupo : null]
      .filter(Boolean)
      .join(" · ")

    // Plata ya verificada + SOLO esta inscripcion. No se suman las pendientes
    // viejas: son transferencias sin confirmar y harian crecer el numero con
    // plata que quiza nunca entro.
    const montoBna = saldo
      ? `En el BNA deberia haber ${formatearPesos(saldo.verificado + saldo.precio)} con esta`
      : null

    const lineas = [detalle || null, montoBna].filter(Boolean)

    await enviarPushATodos({
      titulo: `Nueva inscripcion: ${datos.nombre}`,
      cuerpo: lineas.join("\n"),
      url: "/admin/registro-inscripciones",
      tag: "inscripcion-nueva",
    })
  } catch (error) {
    console.warn(
      "[push] no se pudo notificar la inscripcion nueva:",
      error instanceof Error ? error.message : error
    )
  }
}
