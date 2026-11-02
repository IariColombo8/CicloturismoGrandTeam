// Resumen de edades de un grupo de inscriptos: el mas chico, el mas grande y
// la edad mas repetida. Lo usa el filtro "Edad" del registro de inscripciones.
//
// La edad se calcula igual que en el dashboard (panorama.ts): una fecha que no
// da una edad creible (3 a 100 años) no se cuenta, se informa aparte.
// Puro (sin Supabase ni DOM): lo cubre e2e/unit/edades.spec.ts.

import { calcularEdad, parsearFechaNacimiento } from "@/app/admin/dashboard/panorama"

export interface FilaEdad {
  nombre?: string | null
  apellido?: string | null
  fecha_nacimiento?: string | null
}

export interface PersonaEdad {
  nombre: string
  edad: number
}

export interface ResumenEdades {
  /** Los de menor edad (puede haber mas de uno con la misma edad). */
  masChicos: PersonaEdad[]
  masGrandes: PersonaEdad[]
  /** Edad mas repetida; si empatan varias, todas, de menor a mayor. */
  modas: number[]
  /** Cuantas personas tienen la edad mas repetida. */
  cantidadModa: number
  promedio: number | null
  conEdad: number
  /** Sin fecha cargada o con una fecha que no da una edad creible. */
  sinEdad: number
}

/** Edad cumplida hoy, o null si la fecha falta o no es creible. */
export function edadDeFecha(fecha: string | null | undefined): number | null {
  return calcularEdad(parsearFechaNacimiento(fecha))
}

export function resumirEdades(filas: FilaEdad[]): ResumenEdades {
  const personas: PersonaEdad[] = []
  for (const fila of filas) {
    const edad = edadDeFecha(fila.fecha_nacimiento)
    if (edad == null) continue
    const nombre = `${fila.nombre ?? ""} ${fila.apellido ?? ""}`.trim().replace(/\s+/g, " ")
    personas.push({ nombre: nombre || "Sin nombre", edad })
  }

  const conteo = new Map<number, number>()
  for (const p of personas) conteo.set(p.edad, (conteo.get(p.edad) ?? 0) + 1)
  const cantidadModa = Math.max(0, ...conteo.values())
  const modas = [...conteo.entries()]
    .filter(([, n]) => n === cantidadModa && n > 0)
    .map(([edad]) => edad)
    .sort((a, b) => a - b)

  const edades = personas.map((p) => p.edad)
  const minima = edades.length ? Math.min(...edades) : null
  const maxima = edades.length ? Math.max(...edades) : null
  const porNombre = (a: PersonaEdad, b: PersonaEdad) => a.nombre.localeCompare(b.nombre, "es")

  return {
    masChicos: personas.filter((p) => p.edad === minima).sort(porNombre),
    masGrandes: personas.filter((p) => p.edad === maxima).sort(porNombre),
    modas,
    cantidadModa,
    promedio: edades.length ? Math.round(edades.reduce((s, e) => s + e, 0) / edades.length) : null,
    conEdad: personas.length,
    sinEdad: filas.length - personas.length,
  }
}
