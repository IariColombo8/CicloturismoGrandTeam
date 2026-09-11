"use client"

import { useEffect, useState } from "react"
import { isRemeraCerrada } from "@/lib/remeraDeadline"

// Devuelve true cuando paso la fecha limite de pedidos de remera.
// Se evalua despues del montaje para no generar diferencias de hidratacion
// entre el reloj del servidor y el del navegador.
export function useRemeraCerrada(): boolean {
  const [cerrada, setCerrada] = useState(false)

  useEffect(() => {
    setCerrada(isRemeraCerrada())
  }, [])

  return cerrada
}
