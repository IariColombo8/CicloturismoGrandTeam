// Helpers de la pagina publica /mi-qr.
// Logica pura, sin React ni Supabase, para poder testearla.

export type EstadoInscripcion = "pendiente" | "confirmada" | "rechazada" | string

export type RemeraItem = {
  talle?: string | null
  genero?: string | null
  cantidad?: number | null
}

/** Deja solo digitos y corta en 8, igual que el formulario de inscripcion. */
export function normalizarDni(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 8)
}

export function esDniValido(dni: string): boolean {
  return /^\d{7,8}$/.test(dni)
}

type PresentacionEstado = {
  titulo: string
  detalle: string
  /** Solo las confirmadas habilitan el QR de acreditacion. */
  muestraQR: boolean
  tono: "verde" | "amarillo" | "rojo"
}

export function presentarEstado(estado: EstadoInscripcion): PresentacionEstado {
  if (estado === "confirmada" || estado === "aprobado") {
    return {
      titulo: "Inscripción confirmada",
      detalle: "Tu lugar está asegurado. Presentá este QR el día del evento.",
      muestraQR: true,
      tono: "verde",
    }
  }

  if (estado === "rechazada") {
    return {
      titulo: "Inscripción rechazada",
      detalle: "Hubo un problema con tu inscripción. Escribinos por WhatsApp y lo resolvemos.",
      muestraQR: false,
      tono: "rojo",
    }
  }

  return {
    titulo: "Inscripción pendiente",
    detalle:
      "Recibimos tu inscripción y estamos verificando el pago. Cuando la confirmemos vas a poder descargar tu QR desde acá.",
    muestraQR: false,
    tono: "amarillo",
  }
}

/** "1 x M (hombre) · 2 x L" — resumen legible de los talles pedidos. */
export function resumirTalles(items: readonly RemeraItem[] | null | undefined): string {
  if (!items?.length) return ""

  return items
    .filter((item) => item?.talle)
    .map((item) => {
      const cantidad = item.cantidad && item.cantidad > 0 ? item.cantidad : 1
      const genero = item.genero ? ` (${item.genero})` : ""
      return `${cantidad} x ${item.talle}${genero}`
    })
    .join(" · ")
}

export function totalRemeras(items: readonly RemeraItem[] | null | undefined): number {
  if (!items?.length) return 0
  return items.reduce((total, item) => total + (item?.cantidad && item.cantidad > 0 ? item.cantidad : 1), 0)
}

/** Como recibe la remera: la retira el dia del evento o se la enviamos. */
export function describirEntrega(envioTipo: string | null | undefined): string {
  if (envioTipo === "envio") return "Envío a domicilio"
  if (envioTipo === "retiro") return "Retiro en el evento"
  return "A coordinar"
}

/**
 * El estado de entrega solo aporta cuando la remera viaja. Si se retira en
 * el evento, "Retiro en el evento" ya dice todo y un "Pendiente de entrega"
 * al lado solo genera ruido.
 */
export function muestraEstadoEntrega(envioTipo: string | null | undefined): boolean {
  return envioTipo !== "retiro"
}

export function describirEntregaRemera(estado: string | null | undefined, entregado: boolean): string {
  if (entregado || estado === "entregado") return "Ya entregada"
  return "Pendiente de entrega"
}
