// Agrupar texto cargado a mano (localidades, sobre todo) sin tocar la base.
//
// La gente escribe la misma ciudad de mil formas: "concepcion del uruguay",
// "Concepcion Del Uruguay", "CONCEPCIÓN DEL URUGUAY", con dos espacios en el
// medio... En la base queda tal cual lo escribio cada uno; aca se decide que
// todas esas son UNA sola, para los filtros y los conteos.
//
// Puro (sin Supabase ni DOM): lo cubre e2e/unit/agrupar-texto.spec.ts.

/** Clave de comparacion: sin acentos, sin mayusculas y sin espacios de mas. */
export function claveTexto(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

/** Palabras que van en minuscula en el medio de un nombre ("Concepción del Uruguay"). */
const MENORES = new Set(["de", "del", "la", "las", "los", "el", "y", "e"])

/** "CONCEPCIÓN DEL URUGUAY" -> "Concepción del Uruguay". */
export function nombrePropio(valor: string): string {
  return valor
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((palabra, i) =>
      i > 0 && MENORES.has(palabra)
        ? palabra
        : // Tambien despues de un guion: "coronda -santa fe" -> "Coronda -Santa Fe".
          palabra.replace(/(^|-)(\p{L})/gu, (_, guion: string, letra: string) => guion + letra.toUpperCase()),
    )
    .join(" ")
}

export interface GrupoTexto {
  /** Clave comun (la de `claveTexto`). Sirve como value de un select. */
  clave: string
  /** Como se muestra: la variante mas comun, preferida la que tiene acentos. */
  etiqueta: string
  /** Los textos tal cual estan en la base, para filtrar con `.in(...)`. */
  variantes: string[]
  cantidad: number
}

const TIENE_ACENTO = /[^\x00-\x7F]/

/**
 * Junta los valores que son "lo mismo" escritos distinto. Los vacios se
 * ignoran. Sale ordenado alfabeticamente por la etiqueta.
 */
export function agruparTextos(valores: (string | null | undefined)[]): GrupoTexto[] {
  const grupos = new Map<string, { variantes: Map<string, number>; cantidad: number }>()

  for (const valor of valores) {
    const clave = claveTexto(valor)
    if (!clave) continue
    const grupo = grupos.get(clave) ?? { variantes: new Map<string, number>(), cantidad: 0 }
    grupo.cantidad += 1
    const crudo = valor as string
    grupo.variantes.set(crudo, (grupo.variantes.get(crudo) ?? 0) + 1)
    grupos.set(clave, grupo)
  }

  return [...grupos.entries()]
    .map(([clave, grupo]) => {
      // La que se muestra: primero las que tienen acento ("Concepción" esta
      // mejor escrita que "Concepcion"), y entre esas la mas usada.
      const [elegida] = [...grupo.variantes.entries()].sort(
        (a, b) =>
          Number(TIENE_ACENTO.test(b[0])) - Number(TIENE_ACENTO.test(a[0])) || b[1] - a[1],
      )[0]
      return {
        clave,
        etiqueta: nombrePropio(elegida),
        variantes: [...grupo.variantes.keys()],
        cantidad: grupo.cantidad,
      }
    })
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"))
}

// ---------------------------------------------------------------------------
// Agrupar "parecidos": ademas de mayusculas y acentos, junta los errores de
// tipeo y los agregados ("Concepción del uruguayo", "CONCEPCION DRL URUGUAY",
// "Concepción del Uruguay (3260)", "Federación Entre Rios", "Grand theam").
// Lo usa el registro de inscripciones para los filtros de ciudad y de grupo.
// ---------------------------------------------------------------------------

/** Abreviaturas que no se parecen en nada a lo que abrevian. */
const ALIAS_CIUDAD: Record<string, string> = {
  cdelu: "concepciondeluruguay",
  cdu: "concepciondeluruguay",
}

/** Respuestas que en el campo "grupo" quieren decir que no tiene grupo. */
const SIN_GRUPO = new Set(["singrupo", "no", "solo", "sola", "ninguno", "ninguna", "nada", "independiente"])

/** Palabras de relleno en los nombres de grupo ("La heroica montan bike" = "La heroica bike"). */
const RELLENO_GRUPO = new Set(["la", "las", "los", "el", "bike", "bikes", "bikers", "montan", "mountain"])

/** Largo minimo para que un nombre pueda "contener" a otro o tener un error de tipeo. */
const LARGO_MINIMO_PARECIDO = 6

export type TipoParecido = "ciudad" | "grupo"

/** Clave compacta: solo letras, sin acentos, sin espacios ni signos. */
export function claveCompacta(valor: string | null | undefined, tipo: TipoParecido): string {
  let palabras = claveTexto(valor)
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (tipo === "grupo") {
    const sinRelleno = palabras.filter((p) => !RELLENO_GRUPO.has(p))
    if (sinRelleno.length > 0) palabras = sinRelleno
  }
  const compacta = palabras.join("")
  if (tipo === "ciudad") return ALIAS_CIUDAD[compacta] ?? compacta
  return SIN_GRUPO.has(compacta) ? "singrupo" : compacta
}

/** true si las dos claves difieren en a lo sumo una letra (cambiada, sobrante o faltante). */
function difierenEnUnaLetra(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

/**
 * Dos claves compactas son "la misma" si son iguales, si una empieza con la
 * otra ("federacionentrerios" / "federacion") o si difieren en una letra
 * ("gualeguychu" / "gualeguaychu"). Para lo de "empieza con" y el error de
 * tipeo la mas corta tiene que tener 6 letras o mas: asi "Colón" no se come a
 * "Colonia".
 */
export function sonParecidas(a: string, b: string): boolean {
  if (a === b) return true
  const [corta, larga] = a.length <= b.length ? [a, b] : [b, a]
  if (corta.length < LARGO_MINIMO_PARECIDO) return false
  return larga.startsWith(corta) || difierenEnUnaLetra(a, b)
}

/** "Grand Team Bike CdelU" se respeta; "GRAND TEAM" o "grand team" se ordenan. */
function etiquetaGrupo(valor: string): string {
  const limpio = valor.trim().replace(/\s+/g, " ")
  return limpio === limpio.toUpperCase() || limpio === limpio.toLowerCase() ? nombrePropio(limpio) : limpio
}

/**
 * Como `agruparTextos`, pero ademas junta los parecidos (ver `sonParecidas`).
 * La etiqueta es la forma mas usada: la ciudad que la mayoria escribio bien le
 * pone el nombre al grupo entero. Ordenado alfabeticamente por la etiqueta.
 */
export function agruparParecidos(
  valores: (string | null | undefined)[],
  tipo: TipoParecido,
): GrupoTexto[] {
  // Primero lo exacto (mayusculas/acentos), mas usados primero: el mas usado
  // de cada familia es el que le da el nombre.
  const exactos = agruparTextos(valores).sort((a, b) => b.cantidad - a.cantidad)
  const familias: { compactas: string[]; miembros: GrupoTexto[] }[] = []

  for (const grupo of exactos) {
    const compacta = claveCompacta(grupo.clave, tipo)
    const familia = familias.find((f) => f.compactas.some((c) => sonParecidas(c, compacta)))
    if (familia) {
      familia.miembros.push(grupo)
      if (!familia.compactas.includes(compacta)) familia.compactas.push(compacta)
    } else {
      familias.push({ compactas: [compacta], miembros: [grupo] })
    }
  }

  return familias
    .map(({ miembros }) => {
      const [principal] = miembros
      const sinGrupo = tipo === "grupo" && claveCompacta(principal.clave, tipo) === "singrupo"
      return {
        clave: principal.clave,
        etiqueta: sinGrupo
          ? "Sin grupo"
          : tipo === "grupo"
            ? etiquetaGrupo(varianteElegida(principal))
            : principal.etiqueta,
        variantes: miembros.flatMap((m) => m.variantes),
        cantidad: miembros.reduce((suma, m) => suma + m.cantidad, 0),
      }
    })
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"))
}

/**
 * La variante tal cual se escribio que dio la etiqueta de `agruparTextos`.
 * En los grupos se usa esa y no la etiqueta, para respetar "Grand Team Bike CdelU".
 */
function varianteElegida(grupo: GrupoTexto): string {
  return grupo.variantes.find((v) => nombrePropio(v) === grupo.etiqueta) ?? grupo.variantes[0]
}
