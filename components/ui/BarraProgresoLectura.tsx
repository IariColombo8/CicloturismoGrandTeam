"use client"

import { useEffect, useRef } from "react"

/**
 * Hilo dorado arriba de todo que marca cuánto de la página se recorrió.
 *
 * Es el único indicador de "dónde estoy" en una página larga como la home.
 * Crece con `transform: scaleX`, que no recalcula el layout, y se escribe
 * directo sobre el nodo (sin estado de React) para no renderizar por cuadro.
 */
export function BarraProgresoLectura() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    let pendiente = false

    const actualizar = () => {
      pendiente = false
      const recorrible = document.documentElement.scrollHeight - window.innerHeight
      const avance = recorrible > 0 ? Math.min(window.scrollY / recorrible, 1) : 0
      nodo.style.transform = `scaleX(${avance.toFixed(4)})`
    }

    const alScrollear = () => {
      if (pendiente) return
      pendiente = true
      requestAnimationFrame(actualizar)
    }

    actualizar()
    window.addEventListener("scroll", alScrollear, { passive: true })
    window.addEventListener("resize", alScrollear, { passive: true })
    return () => {
      window.removeEventListener("scroll", alScrollear)
      window.removeEventListener("resize", alScrollear)
    }
  }, [])

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  )
}

export default BarraProgresoLectura
