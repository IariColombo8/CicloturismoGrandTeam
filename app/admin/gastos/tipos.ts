// Tipos y helpers compartidos del modulo de finanzas (/admin/gastos)

export type EstadoGasto = "pendiente" | "aprobado" | "rechazado"
export type EstadoIngreso = "cobrado" | "por_cobrar"

export interface Gasto {
  id: string
  descripcion: string
  monto: number
  porParticipante: boolean
  categoria: string
  estado: EstadoGasto
  fecha: string | null
  comprobante: string | null
  creadoPor: string | null
  rolCreador: string | null
  aprobadoPor: string | null
  fechaAprobacion: string | null
  motivoRechazo: string | null
}

export interface Ingreso {
  id: string
  descripcion: string
  monto: number
  categoria: string
  estado: EstadoIngreso
  fecha: string | null
  comprobante: string | null
  creadoPor: string | null
  notas: string | null
}

export interface InscripcionPago {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  estado: string
  montoPagado: number | null
}

/**
 * Extrae un mensaje legible de un error de Supabase o de una excepcion.
 * Evita el "Object" inutil en consola y muestra la causa real al usuario.
 */
export function mensajeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    const partes = [e.message, e.details, e.hint].filter(Boolean)
    if (partes.length > 0) return `${partes.join(" — ")}${e.code ? ` (${e.code})` : ""}`
  }
  return "Error desconocido"
}

/** Fila unificada de la vista "Todo": gastos, ingresos e inscripciones juntos. */
export interface Movimiento {
  id: string
  tipo: "gasto" | "ingreso"
  descripcion: string
  detalle: string | null
  categoria: string
  /** Positivo si entra plata, negativo si sale. */
  monto: number
  estado: string
  fecha: string | null
  /** El gasto/ingreso original, para abrir el detalle. Null en filas calculadas. */
  origen: Gasto | null
}

/** Formatea un monto en pesos argentinos, sin decimales. */
export function formatARS(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`
}

/** Monto real abonado por un inscripto: su excepcion o el precio base. */
export function montoEfectivo(inscripcion: InscripcionPago, precioBase: number): number {
  return inscripcion.montoPagado ?? precioBase
}

/**
 * Total de un gasto segun la cantidad de participantes.
 * Los gastos por participante multiplican su monto unitario.
 */
export function totalGasto(gasto: Gasto, cantidadParticipantes: number): number {
  return gasto.porParticipante ? gasto.monto * cantidadParticipantes : gasto.monto
}
