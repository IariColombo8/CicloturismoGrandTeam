"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  calcularPanorama,
  calcularRemeras,
  mapPersona,
  type FilaParticipante,
  type FilaRemera,
  type Panorama,
  type PanoramaRemeras,
  type Persona,
} from "./panorama"

// "participantes" es historico y acumula todas las ediciones en anios[].
const EDICION_ACTUAL = 2026

/** Sobre quien se calculan las estadisticas de gente. */
export type Alcance = "todos" | "confirmados"

interface UsePanoramaResult {
  /** Todas las personas de la edicion, sin las rechazadas. */
  personas: Persona[]
  /** Panorama del alcance elegido. */
  panorama: Panorama
  /** Panorama de todos (para los totales de la cabecera). */
  panoramaTotal: Panorama
  remeras: PanoramaRemeras
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
}

const COLUMNAS_PARTICIPANTE =
  "id, nombre, apellido, dni, email, telefono, estado, localidad, pais, grupo_ciclistas, " +
  "es_celiaco, tiene_problemas_salud, condicion_salud, tiene_alergias, alergias, grupo_sanguineo, " +
  "fecha_nacimiento, ha_recorrido_distancia, checked_in, fecha_inscripcion, numero_inscripcion"

/**
 * Carga las inscripciones de la edicion y los pedidos de remera, y calcula el
 * panorama de gente.
 *
 * Trae las filas completas a proposito: el dashboard antes pedia solo conteos y
 * las ultimas 5 filas, y con eso dibujaba graficos de "todo el evento". Son
 * decenas de filas con pocas columnas, asi que el costo es menor que la
 * confusion de mostrar numeros que no cierran.
 */
export function usePanorama(alcance: Alcance, habilitado: boolean): UsePanoramaResult {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [filasRemera, setFilasRemera] = useState<FilaRemera[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const [resParticipantes, resRemeras] = await Promise.all([
        supabase
          .from("participantes")
          .select(COLUMNAS_PARTICIPANTE)
          .contains("anios", [EDICION_ACTUAL])
          .order("fecha_inscripcion", { ascending: false }),
        supabase
          .from("remera")
          .select("id, dni, nombre, items, estado, envio_tipo, entregado, esta_registrado, tiene_comprobante"),
      ])

      if (resParticipantes.error) throw resParticipantes.error

      setPersonas(((resParticipantes.data ?? []) as unknown as FilaParticipante[]).map(mapPersona))
      // Los pedidos de remera no son criticos para el resto del panel.
      setFilasRemera(resRemeras.error ? [] : ((resRemeras.data ?? []) as unknown as FilaRemera[]))
      setError(null)
    } catch (err: unknown) {
      console.error("Error cargando el panorama del dashboard:", err)
      setError(err instanceof Error ? err.message : "No se pudieron cargar las inscripciones")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (!habilitado) return
    recargar()

    const canal = supabase
      .channel("dashboard-panorama")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "remera" }, () => recargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [habilitado, recargar])

  // Las rechazadas no van al evento: no cuentan para salud, grupos ni cupo.
  const activas = useMemo(() => personas.filter((p) => p.estado !== "rechazada"), [personas])

  const panoramaTotal = useMemo(() => calcularPanorama(personas), [personas])

  const panorama = useMemo(
    () => calcularPanorama(alcance === "confirmados" ? activas.filter((p) => p.estado === "confirmada") : activas),
    [activas, alcance],
  )

  const remeras = useMemo(() => calcularRemeras(filasRemera), [filasRemera])

  return { personas, panorama, panoramaTotal, remeras, cargando, error, recargar }
}
