"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface MedallasRestantes {
  /** Cantidad de medallas garantizadas para esta edicion. */
  limiteMedallas: number
  /** Inscriptos actuales de la edicion (o null si la consulta no pudo resolverse). */
  ocupados: number | null
  /** Medallas disponibles = limite - ocupados (nunca negativo). null si falta el dato. */
  disponibles: number | null
  /** Hay datos confiables para mostrar un numero exacto. */
  hayDatos: boolean
}

// "participantes" es historico (acumula todas las ediciones via anios[]).
// El contador publico es de la edicion actual: siempre filtramos por anio.
const EDICION_ACTUAL = 2026

/** Solo las primeras 220 inscripciones de la edicion tienen medalla garantizada. */
export const LIMITE_MEDALLAS = 220

/**
 * Medallas disponibles en tiempo real.
 *
 * Cuenta filas de `participantes` inscriptas en la edicion actual y las
 * resta del `LIMITE_MEDALLAS`. Si la consulta falla no inventa numeros:
 * deja `disponibles` en null y `hayDatos` en false para que la UI no
 * muestre un contador incorrecto.
 */
export function useMedallasRestantes(): MedallasRestantes {
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

  const disponibles = ocupados != null ? Math.max(LIMITE_MEDALLAS - ocupados, 0) : null

  return {
    limiteMedallas: LIMITE_MEDALLAS,
    ocupados,
    disponibles,
    hayDatos: disponibles != null,
  }
}
