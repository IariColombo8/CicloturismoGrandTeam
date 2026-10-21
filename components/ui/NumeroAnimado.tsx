"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Un numero que sube desde cero cuando entra en pantalla.
 *
 * Solo se anima lo que ya es un dato real (los kilometros, los cupos que
 * quedan, los dias que faltan). Si el dato todavia no llego, se muestra lo que
 * se pase en `mientrasCarga` en vez de un cero que despues salta.
 *
 * El conteo va con requestAnimationFrame y escribe en el nodo con
 * `textContent`: no provoca un render de React por cuadro.
 */

interface NumeroAnimadoProps {
  valor: number | null
  /** Milisegundos que dura el conteo. */
  duracion?: number
  prefijo?: string
  sufijo?: string
  /** Texto a mostrar mientras `valor` sea null. */
  mientrasCarga?: string
  className?: string
  /** Rellena con ceros a la izquierda hasta esta cantidad de digitos. */
  digitos?: number
}

// Desaceleracion: arranca rapido y frena al final.
const suavizar = (t: number) => 1 - Math.pow(1 - t, 3)

export function NumeroAnimado({
  valor,
  duracion = 1400,
  prefijo = "",
  sufijo = "",
  mientrasCarga = "—",
  className = "",
  digitos = 0,
}: NumeroAnimadoProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [enPantalla, setEnPantalla] = useState(false)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || typeof IntersectionObserver === "undefined") {
      setEnPantalla(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setEnPantalla(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    obs.observe(nodo)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || !enPantalla || valor == null) return

    const formatear = (n: number) =>
      `${prefijo}${String(Math.round(n)).padStart(digitos, "0")}${sufijo}`

    // Quien pidio menos movimiento ve el numero final, sin conteo.
    const sinMovimiento =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (sinMovimiento || duracion <= 0) {
      nodo.textContent = formatear(valor)
      return
    }

    let cuadro = 0
    const inicio = performance.now()

    const paso = (ahora: number) => {
      const avance = Math.min((ahora - inicio) / duracion, 1)
      nodo.textContent = formatear(valor * suavizar(avance))
      if (avance < 1) cuadro = requestAnimationFrame(paso)
    }

    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [enPantalla, valor, duracion, prefijo, sufijo, digitos])

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {valor == null ? mientrasCarga : `${prefijo}${String(valor).padStart(digitos, "0")}${sufijo}`}
    </span>
  )
}

export default NumeroAnimado
