"use client"

import { Fragment } from "react"

/**
 * Cinta de palabras que se desliza sin parar, de lado a lado de la pantalla.
 *
 * Es el movimiento mas barato que hay: una sola animacion de `transform` sobre
 * un contenedor, sin JavaScript, sin scroll listeners y sin recalcular layout.
 * Le da ritmo a la pagina y, sobre todo, cuenta de que se trata el evento
 * (ripio, mate, grupo) sin un parrafo mas.
 *
 * La lista se repite dos veces y la animacion corre media vuelta: cuando
 * termina, la segunda copia esta exactamente donde arranco la primera, asi que
 * el empalme no se ve.
 *
 * Con "reducir movimiento" activado la cinta se queda quieta (globals.css).
 */

interface CintaPalabrasProps {
  palabras: string[]
  /** Segundos que tarda en dar una vuelta. Mas alto = mas lento. */
  duracion?: number
  /** Hacia la derecha en vez de hacia la izquierda. */
  invertida?: boolean
  className?: string
}

export function CintaPalabras({
  palabras,
  duracion = 40,
  invertida = false,
  className = "",
}: CintaPalabrasProps) {
  if (palabras.length === 0) return null

  const fila = (
    <>
      {palabras.map((palabra, i) => (
        <Fragment key={`${palabra}-${i}`}>
          <span className="whitespace-nowrap">{palabra}</span>
          <span aria-hidden="true" className="text-yellow-400/60">
            ●
          </span>
        </Fragment>
      ))}
    </>
  )

  return (
    <div
      className={`gt-cinta ${className}`}
      // El contenido es decorativo y esta duplicado: un lector de pantalla
      // leeria cada palabra dos veces.
      aria-hidden="true"
    >
      <div
        className={`gt-cinta-pista ${invertida ? "gt-cinta-invertida" : ""}`}
        style={{ animationDuration: `${duracion}s` }}
      >
        {fila}
        {fila}
      </div>
    </div>
  )
}

export default CintaPalabras
