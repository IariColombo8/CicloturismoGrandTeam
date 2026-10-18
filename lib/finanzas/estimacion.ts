// lib/finanzas/estimacion.ts
// "Si se inscriben N personas, ¿rinde?": la cuenta del estimador de inscriptos.
//
// Vive aca, puro y sin Supabase, porque la hacen dos cosas distintas que tienen
// que coincidir: la tarjeta de /admin/gastos y el PDF de la estimacion. Cuando
// cada una tenia su propia version, el PDF podia decir otro numero que la
// pantalla desde la que se descargo.
//
// Lo cubre e2e/unit/estimacion.spec.ts.

/** Lo unico que el calculo necesita saber de un gasto. */
export interface GastoEstimado {
  monto: number
  /** Si es true, `monto` es por persona y se multiplica por la cantidad. */
  porParticipante: boolean
  estado: string
}

export interface EntradaEstimacion {
  /** Cuanta gente se proyecta. */
  cantidad: number
  precioBase: number
  gastos: GastoEstimado[]
  ingresosCobrados: number
  ingresosPorCobrar: number
  /** Inscripciones sin cargo que ya hay cargadas. */
  gratis: number
  /**
   * true = tener en cuenta las inscripciones gratis: no pagan (salen de lo que
   * entra) pero igual comen y llevan remera (siguen contando en los gastos por
   * participante). false = calcular como si los N pagaran todos.
   */
  contarGratis: boolean
}

export interface Estimacion {
  cantidad: number
  /** Cuantos de los N estan pagando la inscripcion. */
  pagan: number
  /** Cuantos gratis se descontaron (0 si no se tienen en cuenta). */
  gratisDescontados: number
  /** Plata de inscripciones. */
  entraInscripciones: number
  /** Sponsors, donaciones y demas (cobrado + por cobrar). */
  entraOtros: number
  entra: number
  /** Gastos que no dependen de la cantidad de gente. */
  gastosFijos: number
  /** Suma de los montos unitarios de los gastos por participante. */
  montoPorParticipante: number
  /** `montoPorParticipante` x cantidad. */
  gastosVariables: number
  sale: number
  neto: number
  /** Lo que cuesta cada persona (gastos / cantidad). */
  costoPorPersona: number
  /** Lo que tendria que pagar cada uno para no perder plata. */
  precioQueEmpata: number
  /** Veredicto para mostrar en grande. */
  veredicto: "RINDE" | "JUSTO" | "FALTA PLATA"
}

/**
 * Hace la cuenta. Toma los gastos aprobados **y pendientes** (el peor caso
 * realista: lo pendiente se suele terminar aprobando) y deja afuera los
 * rechazados.
 */
export function calcularEstimacion(entrada: EntradaEstimacion): Estimacion {
  const cantidad = Math.max(0, Math.floor(entrada.cantidad) || 0)
  const gratis = Math.max(0, Math.floor(entrada.gratis) || 0)

  let gastosFijos = 0
  let montoPorParticipante = 0
  for (const gasto of entrada.gastos) {
    if (gasto.estado === "rechazado") continue
    if (gasto.porParticipante) montoPorParticipante += gasto.monto
    else gastosFijos += gasto.monto
  }

  // Los gratis no pagan, pero tampoco se restan de la gente que come.
  const gratisDescontados = entrada.contarGratis ? Math.min(gratis, cantidad) : 0
  const pagan = cantidad - gratisDescontados

  const entraInscripciones = pagan * entrada.precioBase
  const entraOtros = entrada.ingresosCobrados + entrada.ingresosPorCobrar
  const entra = entraInscripciones + entraOtros

  const gastosVariables = montoPorParticipante * cantidad
  const sale = gastosFijos + gastosVariables
  const neto = entra - sale

  return {
    cantidad,
    pagan,
    gratisDescontados,
    entraInscripciones,
    entraOtros,
    entra,
    gastosFijos,
    montoPorParticipante,
    gastosVariables,
    sale,
    neto,
    costoPorPersona: cantidad > 0 ? sale / cantidad : 0,
    // Lo que deberia salir cada inscripcion paga para que el neto sea cero.
    precioQueEmpata: pagan > 0 ? (sale - entraOtros) / pagan : 0,
    veredicto: neto > 0 ? "RINDE" : neto === 0 ? "JUSTO" : "FALTA PLATA",
  }
}
