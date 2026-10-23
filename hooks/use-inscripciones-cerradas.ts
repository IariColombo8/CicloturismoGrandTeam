"use client"

import { useEffect, useState } from "react"
import { inscripcionesCerradas, msHastaCierre } from "@/lib/inscripcion/cierre"

// setTimeout no acepta mas de ~24,8 dias: si falta mas, no se programa nada
// (nadie deja la pestaña abierta tanto tiempo).
const MAX_TIMEOUT_MS = 2_147_483_647

/**
 * Si las inscripciones ya cerraron. Arranca en false (igual que en el
 * servidor) y se calcula en el cliente; si la pagina queda abierta, pasa a
 * true sola a la hora del cierre.
 */
export function useInscripcionesCerradas(): boolean {
  const [cerradas, setCerradas] = useState(false)

  useEffect(() => {
    if (inscripcionesCerradas()) {
      setCerradas(true)
      return
    }
    const falta = msHastaCierre()
    if (falta > MAX_TIMEOUT_MS) return
    const timer = window.setTimeout(() => setCerradas(true), falta + 500)
    return () => window.clearTimeout(timer)
  }, [])

  return cerradas
}
