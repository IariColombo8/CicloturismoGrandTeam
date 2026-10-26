// Panorama del evento: quienes se inscribieron, de donde vienen, que hay que
// saber de salud y como viene la acreditacion.
//
// El calculo vive aca, separado de Supabase, porque antes los graficos del
// dashboard se alimentaban de las ultimas 5 inscripciones y mostraban eso como
// si fuera el total: el pie de estados, los grupos y el top de localidades
// salian de 5 filas de 73. Ahora se calcula sobre todas las filas de la edicion.

import { claveTexto, nombrePropio } from "@/lib/agruparTexto"

/** Fila cruda de `participantes` tal como viene de Supabase. */
export interface FilaParticipante {
  id: string
  nombre: string | null
  apellido: string | null
  dni: string | null
  email: string | null
  telefono: string | null
  estado: string | null
  localidad: string | null
  pais: string | null
  grupo_ciclistas: string | null
  es_celiaco: boolean | null
  tiene_problemas_salud: string | null
  condicion_salud: string | null
  tiene_alergias: string | null
  alergias: string | null
  grupo_sanguineo: string | null
  fecha_nacimiento: string | null
  ha_recorrido_distancia: string | null
  checked_in: boolean | null
  fecha_inscripcion: string | null
  numero_inscripcion: number | null
}

/** Una persona inscripta, con los datos ya interpretados. */
export interface Persona {
  id: string
  nombreCompleto: string
  estado: string
  localidad: string
  pais: string
  grupo: string
  /** true solo si declaro celiaquia (NULL en la base = no informado). */
  esCeliaco: boolean
  tieneProblemaSalud: boolean
  condicionSalud: string
  tieneAlergias: boolean
  alergias: string
  grupoSanguineo: string
  /** Edad en anios, o null si la fecha de nacimiento no sirve (ver `fechaDudosa`). */
  edad: number | null
  /**
   * Hay una fecha de nacimiento cargada pero no da una edad creible.
   * Pasa de verdad: hay una inscripcion con el anio en curso como fecha de
   * nacimiento, que daria "0 años" y la contaria como menor de edad.
   */
  fechaDudosa: boolean
  /** La fecha tal como esta guardada, para poder corregirla. */
  fechaNacimiento: string
  /** Si declaro haber recorrido antes la distancia del evento. */
  conExperiencia: boolean | null
  acreditado: boolean
  fechaInscripcion: string | null
}

/** Un valor agrupado: cuantos son y quienes (los nombres van a un modal). */
export interface Conteo {
  label: string
  cantidad: number
  items: string[]
}

export const SIN_GRUPO = "Sin grupo"
const SIN_DATO = "Sin dato"

/**
 * Clave de agrupacion: sin acentos y en minuscula.
 * Los datos vienen cargados a mano, asi que "CONCORDIA", "Concordia",
 * "Paysandu" y "Paysandú" son la misma localidad y tienen que caer en la misma
 * fila del grafico.
 */
function claveAgrupacion(valor: string): string {
  // La misma clave que el filtro de ciudad del registro y /admin/ciclos.
  return claveTexto(valor)
}

/** "CONCEPCIÓN DEL URUGUAY" -> "Concepción del Uruguay" (igual que el filtro del registro). */
function capitalizar(valor: string): string {
  return nombrePropio(valor)
}

function limpiar(valor: string | null | undefined): string {
  return (valor ?? "").trim().replace(/\s+/g, " ")
}

/** true para los "si" que se guardaron como texto libre en el formulario. */
function esAfirmativo(valor: string | null | undefined): boolean {
  return /^(si|sí|s|true|1|yes)$/i.test(limpiar(valor))
}

/** false explicito: distingue "dijo que no" de "no contesto". */
function esNegativo(valor: string | null | undefined): boolean {
  return /^(no|n|false|0)$/i.test(limpiar(valor))
}

/**
 * Interpreta la fecha de nacimiento, que es texto libre: la mayoria viene
 * "YYYY-MM-DD" pero los datos migrados pueden traer "DD/MM/YYYY".
 */
export function parsearFechaNacimiento(valor: string | null | undefined): Date | null {
  const texto = limpiar(valor)
  if (!texto) return null

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const fecha = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return isNaN(fecha.getTime()) ? null : fecha
  }

  const dmy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const fecha = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    return isNaN(fecha.getTime()) ? null : fecha
  }

  return null
}

/**
 * Edad minima y maxima creibles para alguien que se anota a pedalear.
 * Fuera de ese rango la fecha esta mal cargada, no es una edad real.
 */
const EDAD_MINIMA_CREIBLE = 3
const EDAD_MAXIMA_CREIBLE = 100

/** Edad cumplida al dia de hoy, o null si la fecha no da una edad creible. */
function calcularEdad(nacimiento: Date | null): number | null {
  if (!nacimiento) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1
  return edad >= EDAD_MINIMA_CREIBLE && edad <= EDAD_MAXIMA_CREIBLE ? edad : null
}

export function mapPersona(fila: FilaParticipante): Persona {
  const nombre = limpiar(fila.nombre)
  const apellido = limpiar(fila.apellido)
  const condicionSalud = limpiar(fila.condicion_salud)
  const alergias = limpiar(fila.alergias)
  const grupo = limpiar(fila.grupo_ciclistas)
  const fechaNacimiento = limpiar(fila.fecha_nacimiento)
  const edad = calcularEdad(parsearFechaNacimiento(fila.fecha_nacimiento))

  return {
    id: fila.id,
    nombreCompleto: `${nombre} ${apellido}`.trim() || "Sin nombre",
    estado: limpiar(fila.estado) || "pendiente",
    localidad: limpiar(fila.localidad) || SIN_DATO,
    pais: limpiar(fila.pais) || SIN_DATO,
    grupo: grupo || SIN_GRUPO,
    esCeliaco: fila.es_celiaco === true,
    // El detalle cargado tambien cuenta: hay fichas con la condicion escrita
    // pero sin el "si" marcado, y esas no se pueden perder.
    tieneProblemaSalud: esAfirmativo(fila.tiene_problemas_salud) || condicionSalud !== "",
    condicionSalud,
    tieneAlergias: esAfirmativo(fila.tiene_alergias) || alergias !== "",
    alergias,
    grupoSanguineo: limpiar(fila.grupo_sanguineo).toUpperCase() || SIN_DATO,
    edad,
    // Cargo una fecha pero no sirve: hay que ir a corregirla al registro.
    fechaDudosa: fechaNacimiento !== "" && edad === null,
    fechaNacimiento,
    conExperiencia: esAfirmativo(fila.ha_recorrido_distancia)
      ? true
      : esNegativo(fila.ha_recorrido_distancia)
        ? false
        : null,
    acreditado: fila.checked_in === true,
    fechaInscripcion: fila.fecha_inscripcion,
  }
}

/**
 * Agrupa personas por un valor de texto, unificando mayusculas y acentos.
 * El label que queda es la variante con acentos si alguna la tiene (se lee
 * mejor "Paysandú" que "Paysandu").
 */
function agrupar(personas: Persona[], obtener: (p: Persona) => string): Conteo[] {
  const mapa = new Map<string, Conteo>()

  for (const persona of personas) {
    const valor = obtener(persona)
    const clave = claveAgrupacion(valor)
    const existente = mapa.get(clave)

    if (!existente) {
      mapa.set(clave, { label: capitalizar(valor), cantidad: 1, items: [persona.nombreCompleto] })
      continue
    }

    existente.cantidad += 1
    existente.items.push(persona.nombreCompleto)
    // Si esta variante tiene acentos y la guardada no, gana la acentuada.
    if (claveAgrupacion(existente.label) === clave && /[^\x00-\x7F]/.test(valor) && !/[^\x00-\x7F]/.test(existente.label)) {
      existente.label = capitalizar(valor)
    }
  }

  return [...mapa.values()].sort((a, b) => b.cantidad - a.cantidad || a.label.localeCompare(b.label))
}

/** Arma un Conteo a partir de un filtro, con el detalle que va al modal. */
function marcar(
  personas: Persona[],
  label: string,
  cumple: (p: Persona) => boolean,
  detalle?: (p: Persona) => string,
): Conteo {
  const elegidos = personas.filter(cumple)
  return {
    label,
    cantidad: elegidos.length,
    items: elegidos.map((p) => {
      const extra = detalle?.(p)
      return extra ? `${p.nombreCompleto} — ${extra}` : p.nombreCompleto
    }),
  }
}

/** Un dia de inscripciones, para la curva de crecimiento. */
export interface DiaInscripciones {
  /** dd/mm, para el eje del grafico. */
  fecha: string
  cantidad: number
  acumulado: number
}

/** Tramos de edad. El primero es el que importa operativamente (menores). */
const RANGOS_EDAD: { label: string; desde: number; hasta: number }[] = [
  { label: "Menos de 18", desde: 0, hasta: 17 },
  { label: "18 a 29", desde: 18, hasta: 29 },
  { label: "30 a 39", desde: 30, hasta: 39 },
  { label: "40 a 49", desde: 40, hasta: 49 },
  { label: "50 a 59", desde: 50, hasta: 59 },
  { label: "60 o más", desde: 60, hasta: 200 },
]

export interface Panorama {
  total: number
  confirmadas: number
  pendientes: number
  rechazadas: number
  acreditados: number

  /** Crecimiento dia por dia, en orden cronologico. */
  porDia: DiaInscripciones[]

  /** Grupos ciclistas reales, sin contar a los que van sueltos. */
  grupos: Conteo[]
  sinGrupo: Conteo
  localidades: Conteo[]
  paises: Conteo[]

  celiacos: Conteo
  problemasSalud: Conteo
  alergicos: Conteo
  sangre: Conteo[]
  sinGrupoSanguineo: Conteo

  edades: Conteo[]
  edadPromedio: number | null
  menores: Conteo
  masJoven: Persona | null
  masGrande: Persona | null
  /** Personas sin una edad usable (sin fecha cargada o con una fecha dudosa). */
  sinEdad: number
  /** Fechas de nacimiento cargadas que no dan una edad creible. Hay que corregirlas. */
  fechasDudosas: Conteo

  sinExperiencia: Conteo
  conExperiencia: number
}

/**
 * Todo el panorama de un conjunto de personas.
 * Se le pasa el subconjunto que se quiere mirar (todos los que van al evento,
 * o solo los confirmados): los numeros de salud del dia del evento son los de
 * los confirmados, no los de quien quedo con la inscripcion a medias.
 */
export function calcularPanorama(personas: Persona[]): Panorama {
  // Crecimiento por dia. Se agrupa por fecha calendario y se ordena por el dia
  // real, no por el texto del eje: "01/11" es posterior a "30/10".
  const porFecha = new Map<string, { orden: number; cantidad: number }>()
  for (const persona of personas) {
    if (!persona.fechaInscripcion) continue
    const fecha = new Date(persona.fechaInscripcion)
    if (isNaN(fecha.getTime())) continue
    const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const clave = dia.toISOString().slice(0, 10)
    const existente = porFecha.get(clave)
    if (existente) existente.cantidad += 1
    else porFecha.set(clave, { orden: dia.getTime(), cantidad: 1 })
  }

  let acumulado = 0
  const porDia: DiaInscripciones[] = [...porFecha.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([clave, { cantidad }]) => {
      acumulado += cantidad
      const [, mes, dia] = clave.split("-")
      return { fecha: `${dia}/${mes}`, cantidad, acumulado }
    })

  // Grupos: los que van sueltos se cuentan aparte para no tapar al resto.
  const todosLosGrupos = agrupar(personas, (p) => p.grupo)
  const claveSinGrupo = claveAgrupacion(SIN_GRUPO)
  const grupos = todosLosGrupos.filter((g) => claveAgrupacion(g.label) !== claveSinGrupo)
  const sinGrupo =
    todosLosGrupos.find((g) => claveAgrupacion(g.label) === claveSinGrupo) ??
    { label: SIN_GRUPO, cantidad: 0, items: [] }

  // Edades
  const conEdad = personas.filter((p) => p.edad != null)
  const edadPromedio = conEdad.length
    ? Math.round(conEdad.reduce((suma, p) => suma + (p.edad ?? 0), 0) / conEdad.length)
    : null
  const ordenadasPorEdad = [...conEdad].sort((a, b) => (a.edad ?? 0) - (b.edad ?? 0))
  const edades = RANGOS_EDAD.map((rango) =>
    marcar(
      personas,
      rango.label,
      (p) => p.edad != null && p.edad >= rango.desde && p.edad <= rango.hasta,
      (p) => `${p.edad} años`,
    ),
  )

  const sangreAgrupada = agrupar(personas, (p) => p.grupoSanguineo)
  const claveSinDato = claveAgrupacion(SIN_DATO)

  return {
    total: personas.length,
    confirmadas: personas.filter((p) => p.estado === "confirmada").length,
    pendientes: personas.filter((p) => p.estado === "pendiente").length,
    rechazadas: personas.filter((p) => p.estado === "rechazada").length,
    acreditados: personas.filter((p) => p.acreditado).length,

    porDia,

    grupos,
    sinGrupo,
    localidades: agrupar(personas, (p) => p.localidad),
    paises: agrupar(personas, (p) => p.pais),

    celiacos: marcar(personas, "Celíacos", (p) => p.esCeliaco),
    problemasSalud: marcar(
      personas,
      "Problemas de salud",
      (p) => p.tieneProblemaSalud,
      (p) => p.condicionSalud || "sin detalle cargado",
    ),
    alergicos: marcar(
      personas,
      "Alergias",
      (p) => p.tieneAlergias,
      (p) => p.alergias || "sin detalle cargado",
    ),
    sangre: sangreAgrupada.filter((s) => claveAgrupacion(s.label) !== claveSinDato),
    sinGrupoSanguineo:
      sangreAgrupada.find((s) => claveAgrupacion(s.label) === claveSinDato) ??
      { label: SIN_DATO, cantidad: 0, items: [] },

    edades,
    edadPromedio,
    menores: marcar(
      personas,
      "Menores de edad",
      (p) => p.edad != null && p.edad < 18,
      (p) => `${p.edad} años`,
    ),
    masJoven: ordenadasPorEdad[0] ?? null,
    masGrande: ordenadasPorEdad[ordenadasPorEdad.length - 1] ?? null,
    sinEdad: personas.length - conEdad.length,
    fechasDudosas: marcar(
      personas,
      "Fechas de nacimiento a revisar",
      (p) => p.fechaDudosa,
      (p) => `cargada: ${p.fechaNacimiento}`,
    ),

    sinExperiencia: marcar(personas, "Nunca hicieron la distancia", (p) => p.conExperiencia === false),
    conExperiencia: personas.filter((p) => p.conExperiencia === true).length,
  }
}

// ---------------------------------------------------------------------------
// Remeras
// ---------------------------------------------------------------------------

/** Fila cruda de `remera`. */
export interface FilaRemera {
  id: string
  dni: string | null
  nombre: string | null
  items: { talle?: string; cantidad?: number; genero?: string }[] | null
  estado: string | null
  envio_tipo: string | null
  entregado: boolean | null
  esta_registrado: boolean | null
  tiene_comprobante: boolean | null
}

export interface PanoramaRemeras {
  /** Pedidos cargados (una fila por DNI). */
  pedidos: number
  /** Remeras pedidas: suma de las cantidades de todos los items. */
  unidades: number
  entregadas: number
  pendientes: number
  paraRetirar: number
  paraEnviar: number
  conComprobante: number
  /** Pedidos de gente que no figura inscripta. */
  noInscriptos: number
  /** Unidades por talle, en el orden de la tabla de talles. */
  porTalle: { talle: string; cantidad: number }[]
  /** Unidades por genero del corte. */
  porGenero: Conteo[]
}

/** Orden de los talles tal como los ofrece el formulario. */
const ORDEN_TALLES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]

export function calcularRemeras(filas: FilaRemera[]): PanoramaRemeras {
  const porTalle = new Map<string, number>()
  const porGenero = new Map<string, number>()
  let unidades = 0

  for (const fila of filas) {
    for (const item of fila.items ?? []) {
      const cantidad = Number(item?.cantidad) || 0
      if (cantidad <= 0) continue
      unidades += cantidad
      const talle = limpiar(item?.talle).toUpperCase() || SIN_DATO
      porTalle.set(talle, (porTalle.get(talle) ?? 0) + cantidad)
      const genero = capitalizar(limpiar(item?.genero) || SIN_DATO)
      porGenero.set(genero, (porGenero.get(genero) ?? 0) + cantidad)
    }
  }

  const entregadas = filas.filter((f) => f.entregado === true || f.estado === "entregado").length

  return {
    pedidos: filas.length,
    unidades,
    entregadas,
    pendientes: filas.length - entregadas,
    paraRetirar: filas.filter((f) => f.envio_tipo === "retiro").length,
    paraEnviar: filas.filter((f) => f.envio_tipo === "envio").length,
    conComprobante: filas.filter((f) => f.tiene_comprobante === true).length,
    noInscriptos: filas.filter((f) => f.esta_registrado === false).length,
    porTalle: [...porTalle.entries()]
      .sort((a, b) => {
        const ia = ORDEN_TALLES.indexOf(a[0])
        const ib = ORDEN_TALLES.indexOf(b[0])
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
      .map(([talle, cantidad]) => ({ talle, cantidad })),
    porGenero: [...porGenero.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, cantidad]) => ({ label, cantidad, items: [] })),
  }
}
