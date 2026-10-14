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
  /** Si es false, el gasto esta aprobado pero todavia no se abono (se paga a ultimo momento). */
  pagado: boolean
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

/**
 * Como esta el pago de una inscripcion (columna pago_estado de participantes).
 * "otro" = pago de una forma que no entro a la caja (otra moneda, se lo dio a
 * alguien del equipo); la aclaracion va en `pagoNota`.
 */
export type EstadoPago = "pagado" | "pendiente" | "gratis" | "otro"

export interface InscripcionPago {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  estado: string
  montoPagado: number | null
  pagoEstado: EstadoPago
  /** Aclaracion del pago cuando `pagoEstado` es "otro". */
  pagoNota: string | null
}

// Nota suelta sobre la caja ("pagaron en pesos uruguayos", "falta la
// transferencia de X"). Vive en lib/notasCaja.ts porque la comparten dos
// pantallas: se carga en inscripciones y se lee en finanzas.
export type { NotaCaja } from "@/lib/notasCaja"

/**
 * Desglose de las inscripciones confirmadas segun lo que pago cada una.
 * Existe porque "confirmados x precio" miente: hay confirmados que todavia no
 * transfirieron, otros que pagaron un monto distinto y algunos que no pagan.
 */
export interface DesglosePagos {
  /** Pagaron exactamente el precio de lista. */
  precioLista: { cantidad: number; total: number }
  /** Pagaron un monto distinto al de lista (mas o menos). */
  otroMonto: { cantidad: number; total: number; items: InscripcionPago[] }
  /** Confirmados que todavia no pagaron: `total` es lo que falta que entre. */
  sinPagar: { cantidad: number; total: number; items: InscripcionPago[] }
  /**
   * Pagaron de una forma que no entro a la caja (ver `pagoNota` de cada uno).
   * `total` es lo que deberia entrar cuando esa plata llegue.
   */
  otraForma: { cantidad: number; total: number; items: InscripcionPago[] }
  /** Inscripciones sin cargo. */
  gratis: { cantidad: number; items: InscripcionPago[] }
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
  /**
   * Nombres que componen una fila calculada (quienes no pagaron, quienes
   * pagaron otro monto). Van en un modal aparte: pegados en el detalle hacian
   * ilegible la fila.
   */
  listado?: { titulo: string; items: string[] }
}

/**
 * Formatea un monto en pesos argentinos. Sin decimales si es un numero entero,
 * con hasta 2 decimales si los tiene (ej: 147,42), para no perder centavos
 * cargados a mano (como intereses bancarios).
 */
export function formatARS(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/**
 * Plata que YA entro por esa inscripcion.
 * Si esta marcada como pendiente de pago o gratis es 0, aunque la inscripcion
 * este confirmada: confirmar no es cobrar.
 */
export function montoCobrado(inscripcion: InscripcionPago, precioBase: number): number {
  if (inscripcion.pagoEstado !== "pagado") return 0
  return inscripcion.montoPagado ?? precioBase
}

/**
 * Plata que DEBERIA entrar por esa inscripcion (para las proyecciones).
 * Las gratis no suman; las demas, el monto registrado o el precio de lista.
 */
export function montoEsperado(inscripcion: InscripcionPago, precioBase: number): number {
  if (inscripcion.pagoEstado === "gratis") return 0
  if (inscripcion.pagoEstado === "pagado") return inscripcion.montoPagado ?? precioBase
  // Pendiente de pago, o pago que no entro a la caja: se espera el precio de
  // lista (el 0 guardado al confirmar significa "no entro", no "paga cero").
  return precioBase
}


/**
 * Total de un gasto segun la cantidad de participantes.
 * Los gastos por participante multiplican su monto unitario.
 */
export function totalGasto(gasto: Gasto, cantidadParticipantes: number): number {
  return gasto.porParticipante ? gasto.monto * cantidadParticipantes : gasto.monto
}

/**
 * Convierte un texto de monto ingresado por el usuario a numero, aceptando
 * tanto "," como "." como separador decimal (en Argentina se usa coma).
 * Los inputs de monto usan type="text" en vez de type="number" porque el
 * input nativo number no acepta coma y descarta la parte decimal.
 */
export function parseMonto(valor: string): number {
  const normalizado = valor.trim().replace(",", ".")
  return Number.parseFloat(normalizado)
}

/**
 * true solo si se esta corriendo en localhost. Se usa para habilitar edicion
 * de gastos ya procesados (aprobados/rechazados), algo que no se permite en produccion.
 */
export function esLocalhost(): boolean {
  if (typeof window === "undefined") return false
  const host = window.location.hostname
  return host === "localhost" || host === "127.0.0.1"
}
