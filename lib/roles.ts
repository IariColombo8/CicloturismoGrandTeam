// Roles del dia del evento: quien pedalea, quien ayuda, quien lleva familiares
// para ayudar y que va a hacer cada uno.
//
// Este archivo es puro (no toca Supabase ni el DOM) para poder probarlo:
// e2e/unit/roles.spec.ts cubre lo que es facil de romper sin darse cuenta.
//
// La lista la ve todo el mundo en /roles y la edita solo el admin desde
// /admin/roles. Cualquiera puede sumarse solo desde el formulario publico
// (POST /api/roles/sumarse), que entra por una API route con service_role:
// la tabla no acepta escritura del anon.

/**
 * Columnas que se piden a Supabase. Explicitas a proposito: `clave` y
 * `cargado_por` son de uso interno y no tienen por que viajar al navegador de
 * cualquiera que abra /roles.
 */
export const COLUMNAS_ROL =
  "id, participante_id, nombre, pedalea, ayuda, tareas, familiares, familiares_detalle, notas, bloqueado, orden, created_at, updated_at"

/** Una fila de la lista de roles. */
export interface RolEvento {
  id: string
  /** Inscripto al que corresponde, si se eligio de la lista de inscriptos. */
  participante_id: string | null
  nombre: string
  pedalea: boolean
  ayuda: boolean
  /** Ids de TAREAS, o texto libre si el admin escribio algo que no esta en la lista. */
  tareas: string[]
  /** Cuantos familiares/amigos trae para ayudar. */
  familiares: number
  familiares_detalle: string | null
  notas: string | null
  /**
   * Fijado por el admin: el formulario publico no lo puede volver a tocar.
   * Es la valvula para cuando el equipo ya acomodo a alguien y no quiere que
   * se lo pisen desde el celular.
   */
  bloqueado: boolean
  /** Email del admin que lo cargo, o "publico" si se sumo la persona. */
  cargado_por: string | null
  orden: number
  created_at?: string
  updated_at?: string
}

/** Lo que manda el formulario (publico o del panel) para guardar una fila. */
/**
 * Lo que manda el formulario (publico o del panel) para guardar una fila.
 *
 * No hay telefono ni email a proposito: todo lo de esta lista es publico.
 */
export interface DatosRol {
  nombre: string
  pedalea: boolean
  ayuda: boolean
  tareas: string[]
  familiares: number
  familiares_detalle?: string | null
  notas?: string | null
  participante_id?: string | null
}

// ─────────────────────────────────────────────────────────────
// Que hace cada uno el dia del evento
// ─────────────────────────────────────────────────────────────

export interface Tarea {
  id: string
  etiqueta: string
  /** Una linea de ayuda, para que dos personas no entiendan cosas distintas. */
  ayuda: string
}

/**
 * Las tareas que se ofrecen con un toque. No es una lista cerrada: el admin
 * puede escribir cualquier otra cosa y se guarda tal cual (`etiquetaTarea`
 * devuelve el texto libre sin tocarlo).
 */
export const TAREAS: Tarea[] = [
  { id: "acreditacion", etiqueta: "Acreditación", ayuda: "Escanear los QR y entregar los números" },
  { id: "remeras", etiqueta: "Remeras", ayuda: "Entregar los pedidos de remera" },
  { id: "hidratacion", etiqueta: "Puesto de hidratación", ayuda: "Agua y fruta en el puesto" },
  { id: "ruta", etiqueta: "Apoyo en ruta", ayuda: "Pedalea acompañando al grupo" },
  { id: "barrido", etiqueta: "Cierre y barrido", ayuda: "Va último para que nadie quede solo" },
  { id: "vehiculo", etiqueta: "Apoyo con vehículo", ayuda: "Camioneta o auto de apoyo" },
  { id: "mecanica", etiqueta: "Mecánica", ayuda: "Inflador, parches y herramientas" },
  { id: "salud", etiqueta: "Primeros auxilios", ayuda: "Botiquín y contacto con la ambulancia" },
  { id: "comida", etiqueta: "Comida y asado", ayuda: "Preparar y servir la comida" },
  { id: "sorteos", etiqueta: "Sorteos y escenario", ayuda: "Bolillero, micrófono y premios" },
  { id: "fotos", etiqueta: "Fotos y video", ayuda: "Registro del día" },
  { id: "armado", etiqueta: "Armado y desarme", ayuda: "Gazebos, mesas, cartelería" },
  { id: "estacionamiento", etiqueta: "Estacionamiento", ayuda: "Ordenar los autos a la llegada" },
]

const TAREA_POR_ID = new Map(TAREAS.map((t) => [t.id, t]))

/** Etiqueta de una tarea; si es texto libre, lo devuelve tal cual. */
export function etiquetaTarea(id: string): string {
  return TAREA_POR_ID.get(id)?.etiqueta ?? id
}

/** True si el id es una de las tareas de la lista (no texto libre). */
export function esTareaConocida(id: string): boolean {
  return TAREA_POR_ID.has(id)
}

// ─────────────────────────────────────────────────────────────
// Pedalea / ayuda: dos datos, una sola pregunta en pantalla
// ─────────────────────────────────────────────────────────────

/**
 * En la base son dos booleanos (asi se puede preguntar "quienes pedalean" o
 * "quienes ayudan" sin cuentas raras), pero en pantalla es UNA pregunta con
 * cuatro respuestas: nadie tiene que entender dos casillas para anotarse.
 */
export type ModoRol = "pedalea" | "pedalea_ayuda" | "ayuda" | "acompana"

export interface ModoInfo {
  modo: ModoRol
  etiqueta: string
  ayuda: string
  pedalea: boolean
  /** Clases del badge; el tono distingue de un vistazo quien ayuda. */
  badge: string
}

export const MODOS: ModoInfo[] = [
  {
    modo: "pedalea",
    etiqueta: "Pedaleo",
    ayuda: "Hago el recorrido y no estoy asignado a una tarea",
    pedalea: true,
    badge: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  },
  {
    modo: "pedalea_ayuda",
    etiqueta: "Pedaleo y ayudo",
    ayuda: "Hago el recorrido y además doy una mano",
    pedalea: true,
    badge: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  },
  {
    modo: "ayuda",
    etiqueta: "Ayudo y no pedaleo",
    ayuda: "Me quedo dando una mano en el evento",
    pedalea: false,
    badge: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  },
  {
    modo: "acompana",
    etiqueta: "No pedaleo, acompaño",
    ayuda: "Vengo al evento sin tarea asignada",
    pedalea: false,
    badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
  },
]

const MODO_POR_ID = new Map(MODOS.map((m) => [m.modo, m]))

/** Los dos booleanos que corresponden a cada respuesta de pantalla. */
export function banderasDeModo(modo: ModoRol): { pedalea: boolean; ayuda: boolean } {
  switch (modo) {
    case "pedalea":
      return { pedalea: true, ayuda: false }
    case "pedalea_ayuda":
      return { pedalea: true, ayuda: true }
    case "ayuda":
      return { pedalea: false, ayuda: true }
    default:
      return { pedalea: false, ayuda: false }
  }
}

/** La respuesta de pantalla que corresponde a una fila de la base. */
export function modoDeRol(rol: Pick<RolEvento, "pedalea" | "ayuda">): ModoRol {
  if (rol.pedalea && rol.ayuda) return "pedalea_ayuda"
  if (rol.pedalea) return "pedalea"
  if (rol.ayuda) return "ayuda"
  return "acompana"
}

export function infoModo(modo: ModoRol): ModoInfo {
  return MODO_POR_ID.get(modo) ?? MODOS[MODOS.length - 1]
}

// ─────────────────────────────────────────────────────────────
// Nombres
// ─────────────────────────────────────────────────────────────

const ACENTOS = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ"
const SIN_ACENTOS = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC"

/**
 * Clave con la que se decide si dos filas son la misma persona: sin acentos,
 * sin mayusculas y sin espacios de mas. Los nombres se cargan a mano desde el
 * celular, asi que "Jose Perez", "JOSÉ  PÉREZ" y "josé pérez" son uno solo.
 *
 * La base calcula lo mismo en un trigger (ver la migracion): esta copia es
 * para poder avisar en pantalla antes de guardar.
 */
export function normalizarNombre(nombre: string): string {
  const limpio = (nombre || "").trim().replace(/\s+/g, " ").toLowerCase()
  let salida = ""
  for (const caracter of limpio) {
    const i = ACENTOS.indexOf(caracter)
    salida += i === -1 ? caracter : SIN_ACENTOS[i]
  }
  return salida
}

/**
 * Nombre listo para guardar. Nunca rechaza: si no viene nada, el formulario
 * publico ya avisa; el servidor usa esto para no guardar basura.
 */
export function limpiarNombre(nombre: string): string {
  return (nombre || "").trim().replace(/\s+/g, " ").slice(0, 80)
}

/** Las iniciales del avatar. */
export function inicialesDe(nombre: string): string {
  return limpiarNombre(nombre)
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("")
}

// ─────────────────────────────────────────────────────────────
// Resumen y filtros de la lista
// ─────────────────────────────────────────────────────────────

export interface ResumenRoles {
  total: number
  pedalean: number
  ayudan: number
  /** Ayudan y no pedalean: es el numero que hace falta para cubrir los puestos. */
  soloAyudan: number
  /** Cuantos familiares suman entre todos. */
  familiares: number
  /** Cuanta gente hay en total contando los familiares que trae cada uno. */
  conFamiliares: number
  /** Cuanta gente anotada en cada tarea, de la mas cubierta a la menos. */
  porTarea: { id: string; etiqueta: string; cantidad: number }[]
  /** Tareas de la lista que todavia no tienen a nadie. */
  tareasSinGente: Tarea[]
}

export function resumirRoles(lista: RolEvento[]): ResumenRoles {
  const cuenta = new Map<string, number>()

  for (const rol of lista) {
    for (const tarea of rol.tareas) {
      cuenta.set(tarea, (cuenta.get(tarea) ?? 0) + 1)
    }
  }

  const porTarea = [...cuenta.entries()]
    .map(([id, cantidad]) => ({ id, etiqueta: etiquetaTarea(id), cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta, "es"))

  const familiares = lista.reduce((suma, rol) => suma + Math.max(0, rol.familiares || 0), 0)

  return {
    total: lista.length,
    pedalean: lista.filter((r) => r.pedalea).length,
    ayudan: lista.filter((r) => r.ayuda).length,
    soloAyudan: lista.filter((r) => r.ayuda && !r.pedalea).length,
    familiares,
    conFamiliares: lista.length + familiares,
    porTarea,
    tareasSinGente: TAREAS.filter((t) => !cuenta.has(t.id)),
  }
}

export interface FiltroRoles {
  /** Busca en el nombre, en las tareas y en las notas. */
  texto?: string
  modo?: ModoRol | "todos"
  tarea?: string | "todas"
  /** Solo los que traen familiares. */
  conFamiliares?: boolean
}

export function filtrarRoles(lista: RolEvento[], filtro: FiltroRoles): RolEvento[] {
  const texto = normalizarNombre(filtro.texto ?? "")

  return lista.filter((rol) => {
    if (filtro.modo && filtro.modo !== "todos" && modoDeRol(rol) !== filtro.modo) return false
    if (filtro.tarea && filtro.tarea !== "todas" && !rol.tareas.includes(filtro.tarea)) return false
    if (filtro.conFamiliares && (rol.familiares || 0) <= 0) return false

    if (!texto) return true

    const buscable = normalizarNombre(
      [rol.nombre, ...rol.tareas.map(etiquetaTarea), rol.notas ?? "", rol.familiares_detalle ?? ""].join(" "),
    )
    return buscable.includes(texto)
  })
}

/**
 * Orden de la lista: primero el orden que puso el admin, y a igual orden por
 * nombre. Los que ayudan van antes que los que solo pedalean, porque la lista
 * se mira el dia del evento para saber quien esta cubriendo cada puesto.
 */
export function ordenarRoles(lista: RolEvento[]): RolEvento[] {
  return [...lista].sort((a, b) => {
    if (a.orden !== b.orden) return a.orden - b.orden
    if (a.ayuda !== b.ayuda) return a.ayuda ? -1 : 1
    return a.nombre.localeCompare(b.nombre, "es")
  })
}

/**
 * Normaliza lo que llega del formulario. Igual que en la inscripcion: solo el
 * nombre es obligatorio y nada mas puede frenar el guardado. Un `familiares`
 * negativo, un telefono con letras o una tarea repetida se acomodan en vez de
 * devolver "datos invalidos".
 */
export function normalizarDatosRol(datos: Partial<DatosRol>): DatosRol | null {
  const nombre = limpiarNombre(String(datos.nombre ?? ""))
  if (!nombre) return null

  const tareas = [...new Set((datos.tareas ?? []).map((t) => String(t).trim()).filter(Boolean))].slice(0, 20)
  const familiaresCrudos = Number(datos.familiares ?? 0)
  const familiares = Number.isFinite(familiaresCrudos)
    ? Math.min(20, Math.max(0, Math.trunc(familiaresCrudos)))
    : 0

  const texto = (valor: unknown, maximo: number) => {
    const limpio = String(valor ?? "").trim()
    return limpio ? limpio.slice(0, maximo) : null
  }

  return {
    nombre,
    pedalea: Boolean(datos.pedalea),
    ayuda: Boolean(datos.ayuda),
    tareas,
    familiares,
    familiares_detalle: texto(datos.familiares_detalle, 300),
    notas: texto(datos.notas, 500),
    participante_id: typeof datos.participante_id === "string" ? datos.participante_id : null,
  }
}
