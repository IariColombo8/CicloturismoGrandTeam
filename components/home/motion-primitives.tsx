"use client"

import { useRef, type ReactNode } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"

/** Curva de easing compartida (expo-out). Tipada como tupla para framer-motion. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Imagen de fondo con parallax: se desplaza más lento que el contenido
 * mientras la sección atraviesa el viewport. Usa solo `transform` (GPU).
 */
interface ParallaxImageProps {
  src: string
  alt?: string
  /** Intensidad del desplazamiento en px (mayor = más movimiento). */
  strength?: number
  /** Clases para el velo/overlay encima de la imagen. */
  overlayClassName?: string
  priority?: boolean
  className?: string
  /** Escala base para evitar bordes vacíos al desplazar. */
  scale?: number
}

export function ParallaxImage({
  src,
  alt = "",
  strength = 120,
  overlayClassName = "veil-warm",
  priority = false,
  className = "",
  scale = 1.18,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength])

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <motion.div
        style={reduce ? undefined : { y }}
        className="absolute inset-0"
      >
        <div className="relative h-[130%] w-full -top-[15%]" style={{ scale }}>
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            quality={80}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </motion.div>
      {overlayClassName && <div className={`absolute inset-0 ${overlayClassName}`} />}
    </div>
  )
}

/**
 * Revela su contenido (fade + slide) cuando entra en viewport.
 */
interface RevealProps {
  children: ReactNode
  className?: string
  /** Retraso en segundos para escalonar. */
  delay?: number
  /** Dirección de entrada. */
  from?: "up" | "down" | "left" | "right"
  /** Distancia inicial en px. */
  distance?: number
  once?: boolean
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  from = "up",
  distance = 28,
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion()

  const offsets: Record<NonNullable<RevealProps["from"]>, { x?: number; y?: number }> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  }

  const initial = reduce ? { opacity: 0 } : { opacity: 0, ...offsets[from] }
  const animate = { opacity: 1, x: 0, y: 0 }

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Capa genérica con desplazamiento vertical por scroll (para textos/figuras).
 */
export function ParallaxLayer({
  children,
  strength = 60,
  className = "",
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength])

  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  )
}
