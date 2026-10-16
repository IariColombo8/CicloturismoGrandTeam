// Sorteos del evento: tipos y toda la logica del bolillero.
//
// Este archivo es puro (no toca Supabase ni el DOM) para poder probarlo:
// e2e/unit/sorteos.spec.ts cubre las reglas que importan y que son faciles de
// romper sin darse cuenta.
//
// Reglas del bolillero:
//  1. Nadie sale dos veces en la misma ronda. Si hay mas sorteos que gente,
//     primero salen TODOS y recien ahi arranca la ronda 2 con el bolillero
//     lleno otra vez.
//  2. Los que no reclaman quedan afuera de lo que resta del sorteo, pero
//     entran en la "repesca": rehacer el sorteo solo entre ellos, por los
//     premios que quedaron sin dueño.
//  3. Cada tanda de sorteo arranca de cero: haber salido en el sorteo de
//     premios no saca a nadie del sorteo de la bici.

export type EstadoSorteo = "borrador" | "en_curso" | "finalizado"
export type EstadoResultado = "pendiente" | "reclamado" | "no_reclamo"

export interface Sorteo {
  id: string
  nombre: string
  descripcion: string | null
  /** Cuantas tiradas tiene la tanda ("cuantos sorteos quiero hacer"). */
  total_sorteos: number
  estado: EstadoSorteo
  publico: boolean
  orden: number
  excluir_grupos: string[]
  excluir_participantes: string[]
  incluir_participantes: string[]
  solo_confirmados: boolean
  solo_acreditados: boolean
}

/**
 * Jerarquia del premio en la pagina publica: el mejor, el segundo y el resto.
 *
 * Solo cambia como se MUESTRA (el mejor grande arriba, los otros en grilla).
 * El orden en que se sortea lo sigue mandando `orden`, con las flechas del
 * panel: son dos cosas distintas y mezclarlas dejaria al admin sin poder
 * elegir, por ejemplo, sortear la bici al final y mostrarla primera.
 */
export type NivelPremio = "principal" | "segundo" | "otro"

export interface Premio {
  id: string
  sorteo_id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  cantidad: number
  visible: boolean
  orden: number
  nivel: NivelPremio
}

export interface NivelPremioInfo {
  nivel: NivelPremio
  /** Lo que elige el admin en el panel. */
  etiqueta: string
  /** Titulo del bloque en la web cuando hay uno solo. */
  titulo: string
  /** Titulo del bloque cuando hay varios. */
  tituloPlural: string
}

/** Los tres niveles, del mas importante al resto (este es el orden de la web). */
export const NIVELES_PREMIO: NivelPremioInfo[] = [
  {
    nivel: "principal",
    etiqueta: "Mejor premio",
    titulo: "El mejor premio",
    tituloPlural: "Los mejores premios",
  },
  {
    nivel: "segundo",
    etiqueta: "Segundo premio",
    titulo: "El segundo premio",
    tituloPlural: "Los segundos premios",
  },
  {
    nivel: "otro",
    etiqueta: "Otros premios",
    titulo: "Otro premio",
    tituloPlural: "Otros premios",
  },
]

const PESO_NIVEL: Record<NivelPremio, number> = { principal: 0, segundo: 1, otro: 2 }

/**
 * Nivel de un premio, tolerante: los premios cargados antes de que existiera
 * la columna (y las copias guardadas en el telefono para el dia del evento)
 * vienen sin nivel y son "otros premios".
 */
export function nivelDePremio(premio: { nivel?: string | null } | null | undefined): NivelPremio {
  const nivel = premio?.nivel
  return nivel === "principal" || nivel === "segundo" ? nivel : "otro"
}

/** Premios como se muestran en la web: primero los mejores, despues por orden. */
export function premiosOrdenados(premios: Premio[]): Premio[] {
  return [...premios].sort(
    (a, b) =>
      PESO_NIVEL[nivelDePremio(a)] - PESO_NIVEL[nivelDePremio(b)] ||
      a.orden - b.orden ||
      a.nombre.localeCompare(b.nombre),
  )
}

export interface BloquePremios {
  nivel: NivelPremio
  /** Titulo ya resuelto en singular o plural. */
  titulo: string
  premios: Premio[]
}

/**
 * Los premios agrupados por jerarquia para la pagina publica.
 *
 * Los niveles vacios no vuelven: un titulo "Segundo premio" sin nada abajo se
 * ve peor que no tener el bloque.
 */
export function premiosPorNivel(premios: Premio[]): BloquePremios[] {
  return NIVELES_PREMIO.map(({ nivel, titulo, tituloPlural }) => {
    const propios = premiosOrdenados(premios.filter((p) => nivelDePremio(p) === nivel))
    return { nivel, titulo: propios.length === 1 ? titulo : tituloPlural, premios: propios }
  }).filter((bloque) => bloque.premios.length > 0)
}

export interface Resultado {
  id: string
  sorteo_id: string
  premio_id: string | null
  premio_nombre: string | null
  orden: number
  /** Puesto que resuelve la tirada (1..total_sorteos). */
  slot: number
  ronda: number
  /** 0 = sorteo original, 1 = repesca de los que no reclamaron. */
  vuelta: number
  participante_id: string | null
  nombre: string
  localidad: string | null
  grupo: string | null
  estado: EstadoResultado
  resuelto_en: string | null
  created_at: string
}

/** Una persona dentro del bolillero. */
export interface Candidato {
  id: string
  nombre: string
  localidad: string | null
  grupo: string | null
}

/** Fila de `participantes` tal como la necesita el sorteo. */
export interface FilaParticipante {
  id: string
  nombre: string | null
  apellido: string | null
  estado: string | null
  localidad: string | null
  grupo_ciclistas: string | null
  checked_in: boolean | null
}

export const SIN_GRUPO = "Sin grupo"

/**
 * Clave de comparacion de grupos y nombres: sin acentos, sin mayusculas y sin
 * espacios de mas. Los grupos se cargan a mano, asi que "Grand Team Bike" y
 * "grand team bike " tienen que ser el mismo grupo excluido.
 */
export function claveTexto(valor: string | null | undefined): string {
  if (!valor) return ""
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

export function nombreDeFila(fila: FilaParticipante): string {
  return `${fila.nombre ?? ""} ${fila.apellido ?? ""}`.trim() || "Sin nombre"
}

/** Estados de inscripcion que cuentan como "va al evento". */
const ESTADOS_CONFIRMADOS = new Set(["confirmada", "aprobado"])
const ESTADOS_FUERA = new Set(["rechazada"])

/**
 * Armado del bolillero a partir de las inscripciones.
 *
 * Las rechazadas nunca entran. Despues se aplican, en este orden: lista
 * cerrada (si hay), filtros de estado/acreditacion, grupos excluidos y
 * personas excluidas a mano.
 */
export function participantesElegibles(filas: FilaParticipante[], sorteo: Sorteo): Candidato[] {
  const lista = new Set(sorteo.incluir_participantes ?? [])
  const excluidos = new Set(sorteo.excluir_participantes ?? [])
  const gruposExcluidos = new Set((sorteo.excluir_grupos ?? []).map(claveTexto).filter(Boolean))

  return filas
    .filter((fila) => {
      const estado = claveTexto(fila.estado)
      if (ESTADOS_FUERA.has(estado)) return false

      // Lista cerrada: si el admin eligio a mano quienes participan, manda eso
      // (pero una persona excluida a mano sigue afuera, por si se arrepintio).
      if (lista.size > 0) return lista.has(fila.id) && !excluidos.has(fila.id)

      if (excluidos.has(fila.id)) return false
      if (sorteo.solo_confirmados && !ESTADOS_CONFIRMADOS.has(estado)) return false
      if (sorteo.solo_acreditados && !fila.checked_in) return false
      if (gruposExcluidos.has(claveTexto(fila.grupo_ciclistas))) return false

      return true
    })
    .map((fila) => ({
      id: fila.id,
      nombre: nombreDeFila(fila),
      localidad: fila.localidad?.trim() || null,
      grupo: fila.grupo_ciclistas?.trim() || null,
    }))
}

/**
 * Plan de premios: que premio le toca a cada tirada del sorteo original.
 *
 * Los premios cargados (con foto) se reparten en orden segun su cantidad —
 * 3 gorras ocupan 3 tiradas. Las tiradas que sobran quedan sin premio
 * asociado y se anuncian como "Premio N": el admin carga solo los premios
 * importantes y el resto se dice de viva voz.
 */
export function planDePremios(premios: Premio[], total: number): (Premio | null)[] {
  const ordenados = [...premios].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  const plan: (Premio | null)[] = []

  for (const premio of ordenados) {
    const cantidad = Math.max(1, premio.cantidad ?? 1)
    for (let i = 0; i < cantidad && plan.length < total; i++) plan.push(premio)
  }

  while (plan.length < total) plan.push(null)
  return plan.slice(0, total)
}

/** Cuantas tiradas ocupan los premios cargados (para avisar si no cierran). */
export function tiradasDePremios(premios: Premio[]): number {
  return premios.reduce((suma, premio) => suma + Math.max(1, premio.cantidad ?? 1), 0)
}

export interface EstadoBolillero {
  /** Ronda en la que caeria la proxima tirada. */
  ronda: number
  /** Quienes pueden salir ahora. */
  disponibles: Candidato[]
  /** true si la proxima tirada empieza una ronda nueva (ya salieron todos). */
  rondaNueva: boolean
}

/** Cuantas veces salio cada persona en una vuelta. */
function aparicionesPorPersona(resultados: Resultado[], vuelta: number): Map<string, number> {
  const conteo = new Map<string, number>()
  for (const fila of resultados) {
    if (fila.vuelta !== vuelta) continue
    const id = fila.participante_id ?? ""
    conteo.set(id, (conteo.get(id) ?? 0) + 1)
  }
  return conteo
}

/** Quienes ya tienen un premio de otra vuelta (ganado o esperando respuesta). */
function conPremioDeOtraVuelta(resultados: Resultado[], vuelta: number): Set<string> {
  return new Set(
    resultados
      .filter((r) => r.vuelta !== vuelta && (r.estado === "reclamado" || r.estado === "pendiente"))
      .map((r) => r.participante_id ?? ""),
  )
}

/**
 * Quien puede salir en la proxima tirada de una vuelta.
 *
 * En la primera pasada (ronda 1) vale una sola cosa por persona: quedan afuera
 * los que ya salieron y tambien los que se llevaron un premio en la otra vuelta
 * (el que gano en la repesca no vuelve a entrar en el sorteo principal).
 *
 * Cuando ya salieron todos, se abre la ronda siguiente con el bolillero lleno
 * otra vez: asi un sorteo de 300 premios con 100 inscriptos reparte 3 a cada
 * uno en vez de trabarse, y nadie repite hasta que salio el ultimo. La cuenta
 * se lleva por apariciones (nadie puede salir R veces antes de que el resto
 * salga R-1), que es lo que mantiene las rondas parejas.
 */
export function estadoBolillero(
  pool: Candidato[],
  resultados: Resultado[],
  vuelta: number,
): EstadoBolillero {
  const apariciones = aparicionesPorPersona(resultados, vuelta)
  const ronda = resultados
    .filter((r) => r.vuelta === vuelta)
    .reduce((max, r) => Math.max(max, r.ronda), 1)

  const deOtraVuelta = ronda === 1 ? conPremioDeOtraVuelta(resultados, vuelta) : new Set<string>()

  const puedeSalir = (c: Candidato, tope: number) =>
    (apariciones.get(c.id) ?? 0) < tope && !deOtraVuelta.has(c.id)

  const disponibles = pool.filter((c) => puedeSalir(c, ronda))

  if (disponibles.length > 0 || pool.length === 0) {
    return { ronda, disponibles, rondaNueva: false }
  }

  // Ya salieron todos: ronda nueva, bolillero lleno otra vez.
  return {
    ronda: ronda + 1,
    disponibles: pool.filter((c) => (apariciones.get(c.id) ?? 0) < ronda + 1),
    rondaNueva: true,
  }
}

/** La vuelta original y la repesca. */
export const VUELTA_SORTEO = 0
export const VUELTA_REPESCA = 1

/** El ultimo resultado de cada puesto (slot), que es el que vale. */
export function ultimoPorSlot(resultados: Resultado[]): Map<number, Resultado> {
  const porSlot = new Map<number, Resultado>()
  for (const fila of [...resultados].sort((a, b) => a.vuelta - b.vuelta || a.orden - b.orden)) {
    porSlot.set(fila.slot, fila)
  }
  return porSlot
}

/**
 * Puestos que quedaron sin dueño: el ultimo que salio no reclamo.
 *
 * Trabajar por puesto (y no "lo que quedo de la vuelta anterior") es lo que
 * garantiza que ningun premio se pierda: se puede repescar en cualquier
 * momento, tantas veces como haga falta, sin llevar la cuenta a mano.
 */
export function slotsSinReclamar(resultados: Resultado[]): Resultado[] {
  return [...ultimoPorSlot(resultados).values()]
    .filter((r) => r.estado === "no_reclamo")
    .sort((a, b) => a.slot - b.slot)
}

/** La lista de los que no reclamaron (una vez cada uno). */
export function candidatosRepesca(resultados: Resultado[], elegibles: Candidato[]): Candidato[] {
  const porId = new Map(elegibles.map((c) => [c.id, c]))
  const candidatos: Candidato[] = []
  const vistos = new Set<string>()

  for (const fila of slotsSinReclamar(resultados)) {
    const id = fila.participante_id
    if (!id || vistos.has(id)) continue
    vistos.add(id)
    // Si la persona ya no esta en el bolillero (la excluyeron despues) igual se
    // la respeta con los datos de la tirada en la que salio.
    candidatos.push(porId.get(id) ?? { id, nombre: fila.nombre, localidad: fila.localidad, grupo: fila.grupo })
  }

  return candidatos
}

/** Tiradas ya hechas en una vuelta. */
export function tiradasHechas(resultados: Resultado[], vuelta: number): number {
  return resultados.filter((r) => r.vuelta === vuelta).length
}

/** Puestos del sorteo original que todavia no se tiraron. */
export function slotsSinTirar(resultados: Resultado[], total: number): number[] {
  const usados = new Set(resultados.map((r) => r.slot))
  const libres: number[] = []
  for (let slot = 1; slot <= total; slot++) if (!usados.has(slot)) libres.push(slot)
  return libres
}

export interface Tirada {
  candidato: Candidato
  /** Puesto que se esta sorteando (1..total_sorteos). */
  slot: number
  orden: number
  ronda: number
  vuelta: number
  premio_id: string | null
  premio_nombre: string | null
}

export interface EntradaTirada {
  elegibles: Candidato[]
  resultados: Resultado[]
  premios: Premio[]
  /** total_sorteos del sorteo. */
  total: number
  /** 0 = sorteo original, 1 = repesca de los que no reclamaron. */
  vuelta: number
  /** Inyectable para poder probar sin azar. */
  aleatorio?: () => number
}

/**
 * Prepara la proxima tirada: quien sale y por que premio.
 *
 * Devuelve null cuando no hay nada mas que sortear: en el sorteo original
 * porque ya se hicieron todas las tiradas, en la repesca porque no quedan
 * premios sin reclamar (o nadie a quien repescar).
 */
export function prepararTirada({
  elegibles,
  resultados,
  premios,
  total,
  vuelta,
  aleatorio = Math.random,
}: EntradaTirada): Tirada | null {
  const plan = planDePremios(premios, total)

  let pool: Candidato[]
  let slot: number

  if (vuelta === VUELTA_SORTEO) {
    const libres = slotsSinTirar(resultados, total)
    if (libres.length === 0) return null
    slot = libres[0]
    pool = elegibles
  } else {
    const pendientes = slotsSinReclamar(resultados)
    if (pendientes.length === 0) return null
    slot = pendientes[0].slot
    pool = candidatosRepesca(resultados, elegibles)
  }

  if (pool.length === 0) return null

  const { ronda, disponibles } = estadoBolillero(pool, resultados, vuelta)
  if (disponibles.length === 0) return null

  const indice = Math.min(disponibles.length - 1, Math.floor(aleatorio() * disponibles.length))
  const premio = plan[slot - 1] ?? null

  return {
    candidato: disponibles[indice],
    slot,
    orden: tiradasHechas(resultados, vuelta) + 1,
    ronda,
    vuelta,
    premio_id: premio?.id ?? null,
    premio_nombre: premio?.nombre ?? null,
  }
}

/** Nombre de premio para mostrar cuando la tirada no tiene premio cargado. */
export function etiquetaPremio(premioNombre: string | null, slot: number): string {
  return premioNombre || `Premio ${slot}`
}

/** Ganadores confirmados de una tanda, en orden de salida. */
export function ganadores(resultados: Resultado[]): Resultado[] {
  return resultados
    .filter((r) => r.estado === "reclamado")
    .sort((a, b) => a.vuelta - b.vuelta || a.orden - b.orden)
}

/** La tirada que esta esperando respuesta ("reclamo" / "pasar al siguiente"). */
export function tiradaEnEspera(resultados: Resultado[]): Resultado | null {
  const pendientes = resultados
    .filter((r) => r.estado === "pendiente")
    .sort((a, b) => b.vuelta - a.vuelta || b.orden - a.orden)
  return pendientes[0] ?? null
}

/** Placeholder de premio sin foto, para no dejar la tarjeta vacia. */
export const PREMIO_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" rx="24" fill="#18181b"/>
    <path d="M120 170h160v120H120z" fill="#27272a"/>
    <path d="M110 140h180v40H110z" fill="#3f3f46"/>
    <path d="M190 140h20v150h-20z" fill="#ffd700" opacity="0.85"/>
    <text x="200" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffd700">PREMIO</text>
  </svg>
`)}`
