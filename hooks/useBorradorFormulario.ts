"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Borradores de formularios del panel.
 *
 * Mismo criterio que la inscripcion publica (app/inscripcion/page.tsx): lo que
 * se esta cargando se guarda solo en localStorage, y al volver a abrir el
 * formulario se ofrece "Retomar" o "Empezar de cero". Asi cerrar la pestaña
 * sin querer no borra media hora de carga.
 *
 * Lo que NO se guarda: archivos (File) ni nada que no sea serializable a JSON.
 * Las imagenes ya subidas si se conservan, porque en el borrador viaja la URL.
 */

const PREFIJO = "gtb-borrador:"
const EDAD_MAXIMA_MS = 1000 * 60 * 60 * 24 * 7 // 7 dias

export interface Borrador<T> {
  datos: T
  guardadoEn: number
}

/** Arma la clave de localStorage: claveBorrador("sponsor", id) -> "gtb-borrador:sponsor:<id>" */
export function claveBorrador(...partes: (string | number)[]): string {
  return PREFIJO + partes.join(":")
}

export function leerBorrador<T>(clave: string, edadMaximaMs = EDAD_MAXIMA_MS): Borrador<T> | null {
  if (typeof window === "undefined") return null
  try {
    const crudo = window.localStorage.getItem(clave)
    if (!crudo) return null
    const parseado = JSON.parse(crudo)
    if (!parseado?.guardadoEn || parseado.datos === undefined) {
      window.localStorage.removeItem(clave)
      return null
    }
    // Borradores viejos no se ofrecen: son ruido y confunden mas de lo que ayudan.
    if (Date.now() - parseado.guardadoEn > edadMaximaMs) {
      window.localStorage.removeItem(clave)
      return null
    }
    return parseado as Borrador<T>
  } catch {
    return null
  }
}

export function guardarBorrador<T>(clave: string, datos: T): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(clave, JSON.stringify({ datos, guardadoEn: Date.now() }))
  } catch {
    // Silenciamos errores de cuota: el borrador es una ayuda, no puede romper el formulario.
  }
}

export function borrarBorrador(clave: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(clave)
  } catch {}
}

/**
 * Devuelve { clave: guardadoEn } de todos los borradores vigentes que empiezan
 * con el prefijo dado, y de paso limpia los vencidos. Sirve para marcar en la
 * lista cuales fichas quedaron a medio cargar.
 */
export function listarBorradores(
  prefijoParcial: string,
  edadMaximaMs = EDAD_MAXIMA_MS,
): Record<string, number> {
  if (typeof window === "undefined") return {}
  const prefijo = PREFIJO + prefijoParcial
  const resultado: Record<string, number> = {}
  try {
    const claves: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const clave = window.localStorage.key(i)
      if (clave && clave.startsWith(prefijo)) claves.push(clave)
    }
    for (const clave of claves) {
      const borrador = leerBorrador<unknown>(clave, edadMaximaMs)
      if (borrador) resultado[clave] = borrador.guardadoEn
    }
  } catch {}
  return resultado
}

interface OpcionesBorrador<T> {
  /** Clave del borrador. `null` = formulario cerrado (no guarda ni avisa). */
  clave: string | null
  /** Estado actual del formulario (solo datos serializables). */
  datos: T | null
  /** Si difiere de como estaba al abrir. El componente lo calcula. */
  hayCambios: boolean
  edadMaximaMs?: number
}

/**
 * Autoguarda el formulario, avisa antes de cerrar la pestaña con cambios sin
 * guardar y expone el borrador encontrado al abrir para ofrecer "Retomar".
 *
 * Mientras hay un borrador pendiente de decision no se autoguarda nada, para
 * que el formulario recien abierto no pise lo que todavia se puede recuperar.
 */
export function useBorradorFormulario<T>({
  clave,
  datos,
  hayCambios,
  edadMaximaMs = EDAD_MAXIMA_MS,
}: OpcionesBorrador<T>) {
  const [borrador, setBorrador] = useState<Borrador<T> | null>(null)
  const claveAnteriorRef = useRef<string | null | undefined>(undefined)
  // Cuando el formulario se guarda de verdad (o se descarta) frenamos cualquier
  // autoguardado pendiente, para que no reviva un borrador ya resuelto.
  const frenadoRef = useRef(false)

  // Al abrir el formulario (cambia la clave) buscamos si quedo algo a medio cargar.
  useEffect(() => {
    if (claveAnteriorRef.current === clave) return
    claveAnteriorRef.current = clave
    frenadoRef.current = false
    setBorrador(clave ? leerBorrador<T>(clave, edadMaximaMs) : null)
  }, [clave, edadMaximaMs])

  // Autoguardado con un respiro, para no escribir en cada tecla.
  useEffect(() => {
    if (!clave || !hayCambios || datos === null || borrador) return
    const temporizador = window.setTimeout(() => {
      if (frenadoRef.current) return
      guardarBorrador(clave, datos)
    }, 400)
    return () => window.clearTimeout(temporizador)
  }, [clave, datos, hayCambios, borrador])

  // Aviso del navegador si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!clave || !hayCambios) return
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
      evento.returnValue = ""
    }
    window.addEventListener("beforeunload", avisar)
    return () => window.removeEventListener("beforeunload", avisar)
  }, [clave, hayCambios])

  /** Guarda ya mismo (para el boton "Guardar borrador y salir"). */
  const guardarAhora = useCallback(() => {
    if (clave && datos !== null) guardarBorrador(clave, datos)
  }, [clave, datos])

  /** Borra el borrador del storage (al descartar o al guardar de verdad). */
  const descartarBorrador = useCallback(() => {
    frenadoRef.current = true
    if (clave) borrarBorrador(clave)
    setBorrador(null)
  }, [clave])

  /** Oculta el cartel de recuperacion sin borrar nada (al retomar). */
  const ocultarAviso = useCallback(() => setBorrador(null), [])

  return { borrador, guardarAhora, descartarBorrador, ocultarAviso }
}
