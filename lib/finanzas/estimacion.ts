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
  /**
   * false = no se paga por las personas con discapacidad (el lugar del evento
   * no les cobra). Sin el dato se cobra por todos.
   */
  cobraDiscapacidad?: boolean
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
  /** Personas con discapacidad que ya hay cargadas (confirmadas). */
  conDiscapacidad?: number
  /**
   * true = las personas con discapacidad no cuentan en los gastos por persona
   * que no se les cobran (el lugar). Siguen pagando el seguro y lo demas, y la
   * inscripcion depende de su pago (si son gratis ya estan en `gratis`).
   */
  contarDiscapacidad?: boolean
}

export interface Estimacion {
  cantidad: number
  /** Cuantos de los N estan pagando la inscripcion. */
  pagan: number
  /** Cuantos gratis se descontaron (0 si no se tienen en cuenta). */
  gratisDescontados: number
  /** Cuantas personas con discapacidad se descontaron de los gastos que no les cobran. */
  discapacidadDescontados: number
  /** Suma de los montos por persona que NO se pagan por ellas (ej: el lugar). */
  montoNoCobraDiscapacidad: number
  /** Lo que no se paga por las personas con discapacidad (`montoNoCobraDiscapacidad` x ellas). */
  ahorroDiscapacidad: number
  /** Plata de inscripciones. */
  entraInscripciones: number
  /** Sponsors, donaciones y demas (cobrado + por cobrar). */
  entraOtros: number
  entra: number
  /** Gastos que no dependen de la cantidad de gente. */
  gastosFijos: number
  /** Suma de los montos unitarios de los gastos por participante. */
  montoPorParticipante: number
  /** `montoPorParticipante` x cantidad, menos `ahorroDiscapacidad`. */
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

  const conDiscapacidad = Math.max(0, Math.floor(entrada.conDiscapacidad ?? 0) || 0)

  let gastosFijos = 0
  let montoPorParticipante = 0
  let montoNoCobraDiscapacidad = 0
  for (const gasto of entrada.gastos) {
    if (gasto.estado === "rechazado") continue
    if (gasto.porParticipante) {
      montoPorParticipante += gasto.monto
      if (gasto.cobraDiscapacidad === false) montoNoCobraDiscapacidad += gasto.monto
    } else gastosFijos += gasto.monto
  }

  // Los gratis no pagan, pero tampoco se restan de la gente que come.
  const gratisDescontados = entrada.contarGratis ? Math.min(gratis, cantidad) : 0
  const pagan = cantidad - gratisDescontados

  // Las personas con discapacidad solo se restan de los gastos que no se les
  // cobran (el lugar): el seguro, la bolsita y lo demas siguen.
  const discapacidadDescontados = entrada.contarDiscapacidad ? Math.min(conDiscapacidad, cantidad) : 0
  const ahorroDiscapacidad = montoNoCobraDiscapacidad * discapacidadDescontados

  const entraInscripciones = pagan * entrada.precioBase
  const entraOtros = entrada.ingresosCobrados + entrada.ingresosPorCobrar
  const entra = entraInscripciones + entraOtros

  const gastosVariables = montoPorParticipante * cantidad - ahorroDiscapacidad
  const sale = gastosFijos + gastosVariables
  const neto = entra - sale

  return {
    cantidad,
    pagan,
    gratisDescontados,
    discapacidadDescontados,
    montoNoCobraDiscapacidad,
    ahorroDiscapacidad,
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

/**
 * Por cuantas personas de la estimacion se paga un gasto por persona: todas,
 * menos las personas con discapacidad si ese gasto no se les cobra.
 */
export function personasDelGasto(
  gasto: Pick<GastoEstimado, "cobraDiscapacidad">,
  est: Pick<Estimacion, "cantidad" | "discapacidadDescontados">,
): number {
  return gasto.cobraDiscapacidad === false ? est.cantidad - est.discapacidadDescontados : est.cantidad
}
