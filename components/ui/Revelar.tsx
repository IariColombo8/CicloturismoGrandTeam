"use client"

import { useEffect, useRef, type ElementType, type ReactNode } from "react"

/**
 * Aparecer al llegar con el scroll.
 *
 * El bloque se renderiza ya con la clase `gt-revelar` (igual en el servidor y
 * en el cliente, asi que no hay parpadeo al hidratar) y cuando entra en
 * pantalla se le agrega `gt-visible`. Las dos clases viven en globals.css y
 * animan solo `opacity` y `transform`: son las dos propiedades que el navegador
 * resuelve en la GPU, sin recalcular el layout.
 *
 * Sin JavaScript el contenido igual se ve: el <noscript> de app/layout.tsx
 * desactiva el efecto.
 *
 * Un solo IntersectionObserver para toda la pagina: la home tiene mas de
 * cincuenta bloques revelables y un observer por bloque se nota en un celular.
 */

const EFECTOS = {
  subir: "gt-revelar-subir",
  bajar: "gt-revelar-bajar",
  izquierda: "gt-revelar-izquierda",
  derecha: "gt-revelar-derecha",
  escala: "gt-revelar-escala",
  aparecer: "",
} as const

export type EfectoRevelar = keyof typeof EFECTOS

let observador: IntersectionObserver | null = null

function obtenerObservador(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null
  if (observador) return observador

  observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        entrada.target.classList.add("gt-visible")
        // Una sola vez: no se vuelve a esconder al subir.
        observador?.unobserve(entrada.target)
      }
    },
    // -8% abajo: el bloque arranca cuando ya entro de verdad, no al asomar
    // el primer pixel.
    { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
  )

  return observador
}

interface RevelarProps {
  children: ReactNode
  /** Etiqueta a renderizar. Por defecto un div. */
  as?: ElementType
  className?: string
  /** Direccion desde la que entra. */
  efecto?: EfectoRevelar
  /** Retraso en milisegundos, para escalonar una grilla. */
  retraso?: number
  [prop: string]: unknown
}

export function Revelar({
  children,
  as: Etiqueta = "div",
  className = "",
  efecto = "subir",
  retraso = 0,
  ...resto
}: RevelarProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    const obs = obtenerObservador()
    if (!obs) {
      // Navegador sin IntersectionObserver: se muestra sin animacion.
      nodo.classList.add("gt-visible")
      return
    }

    obs.observe(nodo)
    return () => obs.unobserve(nodo)
  }, [])

  return (
    <Etiqueta
      ref={ref}
      className={`gt-revelar ${EFECTOS[efecto]} ${className}`.trim()}
      style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
      {...resto}
    >
      {children}
    </Etiqueta>
  )
}

export default Revelar
