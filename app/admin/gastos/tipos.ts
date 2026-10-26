// Tipos y helpers compartidos del modulo de finanzas (/admin/gastos)

import type { ItemComision } from "@/lib/finanzas/comisiones"

export type EstadoGasto = "pendiente" | "aprobado" | "rechazado"
export type EstadoIngreso = "cobrado" | "por_cobrar"

export interface Gasto {
  id: string
  descripcion: string
  monto: number
  porParticipante: boolean
  /**
   * Solo en gastos por participante: false = no se paga por las personas con
   * discapacidad (el Viejo Molino no les cobra la entrada al lugar).
   */
  cobraDiscapacidad: boolean
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
  /**
   * Acreditaciones que componen el ingreso, cuando es uno acumulador (las
   * comisiones de Naranja X entran de a poco y en fechas distintas). Vacio en
   * un ingreso normal: ahi `monto` es todo lo que hay que saber.
   */
  items: ItemComision[]
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
  /** Persona con discapacidad: no paga los gastos por persona con `cobraDiscapacidad` en false. */
  discapacidad: boolean
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


/** Color del badge de estado. Cada pantalla lo traduce a sus clases. */
export type TonoEstado = "verde" | "naranja" | "amarillo" | "rojo"

/** Clases de Tailwind de cada tono, para que todas las tablas pinten igual. */
export const CLASE_BADGE: Record<TonoEstado, string> = {
  verde: "bg-green-500/20 text-green-500",
  naranja: "bg-orange-500/20 text-orange-400",
  amarillo: "bg-yellow-400/20 text-yellow-400",
  rojo: "bg-red-500/20 text-red-500",
}

/**
 * Como se muestra el estado de un gasto.
 *
 * Un gasto aprobado **no dice "Aprobado"**: a esta altura estan aprobados
 * todos, asi que esa columna no informaba nada. Lo unico que hace falta saber
 * mirando la lista es si la plata ya salio o todavia hay que pagarla, igual que
 * los ingresos dicen "Cobrado" o "Por cobrar".
 */
export function estadoGastoVisible(gasto: Pick<Gasto, "estado" | "pagado">): {
  /** Lo que se lee en el badge y en el PDF. */
  texto: string
  tono: TonoEstado
  /** Valor con el que se filtra la lista de movimientos. */
  clave: "pagado" | "por_pagar" | "pendiente" | "rechazado"
} {
  if (gasto.estado === "aprobado") {
    return gasto.pagado
      ? { texto: "Pagado", tono: "verde", clave: "pagado" }
      : { texto: "Por pagar", tono: "naranja", clave: "por_pagar" }
  }
  if (gasto.estado === "rechazado") {
    return { texto: "Rechazado", tono: "rojo", clave: "rechazado" }
  }
  // Propuesto y todavia sin aprobar: ni pagado ni por pagar.
  return { texto: "Pendiente", tono: "amarillo", clave: "pendiente" }
}

/**
 * Orden de lectura de los gastos: primero lo que ya se pago, despues lo que
 * falta pagar, y al final lo que todavia no esta aprobado o se rechazo. Es el
 * mismo orden en la pantalla, en el PDF y en el Excel.
 *
 * El sort es estable, asi que dentro de cada grupo se mantiene el orden por
 * fecha con el que vienen de la base (lo mas nuevo arriba).
 */
export function ordenarGastosPorPago(gastos: Gasto[]): Gasto[] {
  const rango = (g: Gasto): number => {
    if (g.estado === "aprobado") return g.pagado ? 0 : 1
    if (g.estado === "pendiente") return 2
    return 3 // rechazado
  }
  return [...gastos].sort((a, b) => rango(a) - rango(b))
}

/** Lo cobrado arriba, lo que falta cobrar abajo. */
export function ordenarIngresosPorCobro(ingresos: Ingreso[]): Ingreso[] {
  return [...ingresos].sort(
    (a, b) => (a.estado === "cobrado" ? 0 : 1) - (b.estado === "cobrado" ? 0 : 1),
  )
}

/**
 * Orden de la vista "Todo": la plata que ya se movio arriba (pagado / cobrado)
 * y lo que falta abajo (por pagar / por cobrar), igual que las otras listas.
 */
export function ordenarMovimientos(movimientos: Movimiento[]): Movimiento[] {
  const rango = (mov: Movimiento): number => {
    switch (estadoMovimiento(mov)) {
      case "pagado":
      case "cobrado":
        return 0
      case "por_pagar":
      case "por_cobrar":
        return 1
      case "pendiente":
        return 2
      default:
        return 3 // rechazado, o cualquier estado raro
    }
  }
  return [...movimientos].sort((a, b) => {
    const diferencia = rango(a) - rango(b)
    if (diferencia !== 0) return diferencia
    // Dentro del grupo: las filas calculadas (que no tienen fecha) primero y
    // el resto de lo mas nuevo a lo mas viejo.
    if (!a.fecha) return -1
    if (!b.fecha) return 1
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  })
}

/**
 * Estado con el que se muestra y se filtra una fila de la vista "Todo".
 * Un gasto aprobado se lee como "Pagado" o "Por pagar" (ver
 * `estadoGastoVisible`); los ingresos ya venian con su propio estado.
 */
export function estadoMovimiento(mov: Movimiento): string {
  if (mov.tipo === "gasto" && mov.origen) return estadoGastoVisible(mov.origen).clave
  return mov.estado
}

/**
 * Por cuantas personas se paga un gasto por participante. Si el gasto no se
 * cobra a las personas con discapacidad (el lugar del evento), ellas no cuentan.
 */
export function personasQuePagan(
  gasto: Pick<Gasto, "cobraDiscapacidad">,
  cantidadParticipantes: number,
  conDiscapacidad = 0,
): number {
  if (gasto.cobraDiscapacidad) return cantidadParticipantes
  return Math.max(0, cantidadParticipantes - Math.min(conDiscapacidad, cantidadParticipantes))
}

/**
 * Total de un gasto segun la cantidad de participantes.
 * Los gastos por participante multiplican su monto unitario (sin las personas
 * con discapacidad, si ese gasto no se les cobra).
 */
export function totalGasto(gasto: Gasto, cantidadParticipantes: number, conDiscapacidad = 0): number {
  return gasto.porParticipante
    ? gasto.monto * personasQuePagan(gasto, cantidadParticipantes, conDiscapacidad)
    : gasto.monto
}

/**
 * "× 119 confirmados" o, si el gasto no se cobra a las personas con
 * discapacidad, "× 117 confirmados (2 con discapacidad no pagan)".
 */
export function detallePersonas(
  gasto: Pick<Gasto, "cobraDiscapacidad">,
  cantidadParticipantes: number,
  conDiscapacidad = 0,
  palabra = "confirmados",
): string {
  const pagan = personasQuePagan(gasto, cantidadParticipantes, conDiscapacidad)
  const descontados = cantidadParticipantes - pagan
  if (descontados === 0) return `× ${cantidadParticipantes} ${palabra}`
  return `× ${pagan} ${palabra} (${descontados} con discapacidad no paga${descontados === 1 ? "" : "n"})`
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
