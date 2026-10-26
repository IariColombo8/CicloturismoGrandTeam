"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ID_AJUSTES_ROLES, leerAjustesRoles, type AjustesRoles } from "@/lib/roles"

/**
 * El catalogo de tareas del dia del evento con cuanta gente hace falta en
 * cada una (content_settings.id = "roles"). Lo editan en /admin/roles y lo
 * leen las dos pantallas; se actualiza solo si alguien lo cambia.
 *
 * Si la fila todavia no existe (o no se pudo leer), devuelve la lista de
 * siempre sin cupos: la pagina nunca se queda sin tareas para elegir.
 */
export function useAjustesRoles() {
  const [ajustes, setAjustes] = useState<AjustesRoles>(() => leerAjustesRoles(null))

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("content_settings")
      .select("data")
      .eq("id", ID_AJUSTES_ROLES)
      .maybeSingle()
    if (error) {
      console.error("No se pudieron leer las tareas de roles:", error)
      return
    }
    setAjustes(leerAjustesRoles(data?.data ?? null))
  }, [])

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel("roles-ajustes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_settings", filter: `id=eq.${ID_AJUSTES_ROLES}` },
        () => cargar(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [cargar])

  return { ajustes, setAjustes, recargar: cargar }
}
