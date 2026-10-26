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
      i > 0 && MENORES.has(palabra) ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1),
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
