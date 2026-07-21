"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"

interface CuposRestantes {
  /** Cupo máximo configurado en event_settings (o null si aún no cargó). */
  cupoMaximo: number | null
  /** Inscriptos actuales (o null si la consulta no pudo resolverse). */
  ocupados: number | null
  /** Cupos disponibles = max - ocupados. null si falta algún dato. */
  disponibles: number | null
  /** Hay datos confiables para mostrar un número exacto. */
  hayDatos: boolean
}

// "participantes" es historico (acumula todas las ediciones via anios[]).
// El contador publico es de la edicion actual: siempre filtramos por anio.
const EDICION_ACTUAL = 2026

/**
 * Cupos disponibles en tiempo real.
 *
 * Cuenta filas de `participantes` inscriptas en la edicion actual (una por
 * inscripto) y las resta del `cupoMaximo` del evento. Si la consulta falla
 * —por ejemplo, por RLS— no inventa números: deja `disponibles` en null y
 * `hayDatos` en false para que la UI muestre un fallback en vez de un
 * "0 disponibles" alarmante.
 */
export function useCuposRestantes(): CuposRestantes {
  const { eventSettings } = useSupabaseContext()
  const [ocupados, setOcupados] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchOcupados = async () => {
      try {
        const { count, error } = await supabase
          .from("participantes")
          .select("id", { count: "exact", head: true })
          .contains("anios", [EDICION_ACTUAL])

        if (cancelled) return
        if (error || typeof count !== "number") {
          setOcupados(null)
          return
        }
        setOcupados(count)
      } catch {
        if (!cancelled) setOcupados(null)
      }
    }

    fetchOcupados()
    return () => {
      cancelled = true
    }
  }, [])

  const cupoMaximo = eventSettings?.cupoMaximo ?? null
  const disponibles =
    cupoMaximo != null && ocupados != null ? Math.max(cupoMaximo - ocupados, 0) : null

  return {
    cupoMaximo,
    ocupados,
    disponibles,
    hayDatos: disponibles != null,
  }
}
