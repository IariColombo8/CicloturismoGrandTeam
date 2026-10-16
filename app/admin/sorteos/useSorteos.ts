"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type {
  EstadoResultado,
  EstadoSorteo,
  FilaParticipante,
  Premio,
  Resultado,
  Sorteo,
} from "@/lib/sorteos"
import {
  cambiosPendientes,
  encolarBorrado,
  encolarEstadoSorteo,
  encolarResultado,
  guardarCola,
  guardarSnapshot,
  leerCola,
  leerSnapshot,
  mezclarResultados,
  vaciarCola,
  type ColaSorteos,
  type FilaResultado,
} from "@/lib/sorteosLocal"

// "participantes" es historico: acumula todas las ediciones en anios[].
const EDICION_ACTUAL = 2026

const COLUMNAS_PARTICIPANTE = "id, nombre, apellido, estado, localidad, grupo_ciclistas, checked_in"

export interface DatosSorteos {
  sorteos: Sorteo[]
  premios: Premio[]
  resultados: Resultado[]
  participantes: FilaParticipante[]
  cargando: boolean
  error: string | null
  /** La ultima carga no pudo hablar con el servidor (se esta usando lo precargado). */
  sinConexion: boolean
  /** Fecha de la copia local, 0 si nunca se precargo. */
  precargadoEn: number
  /** Cambios del sorteo que todavia no se subieron. */
  pendientes: number
  recargar: () => Promise<void>
  sincronizar: () => Promise<boolean>
  /** Guarda una tirada: primero en el telefono, despues en la base. */
  registrarTirada: (fila: FilaResultado) => Promise<void>
  cambiarEstadoResultado: (id: string, estado: EstadoResultado) => Promise<void>
  borrarResultado: (id: string) => Promise<void>
  cambiarEstadoSorteo: (sorteoId: string, estado: EstadoSorteo) => Promise<void>
}

/**
 * Datos de los sorteos, pensados para andar sin internet.
 *
 * Al abrir con conexion se baja todo y queda precargado en el telefono. Sin
 * conexion se usa esa copia, y lo que se sortea se guarda local y se sube solo
 * cuando la conexion vuelve.
 */
export function useSorteos(habilitado: boolean): DatosSorteos {
  const [sorteos, setSorteos] = useState<Sorteo[]>([])
  const [premios, setPremios] = useState<Premio[]>([])
  const [resultadosBase, setResultadosBase] = useState<Resultado[]>([])
  const [participantes, setParticipantes] = useState<FilaParticipante[]>([])
  const [cola, setCola] = useState<ColaSorteos>({ resultados: {}, borrados: [], estados: {} })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sinConexion, setSinConexion] = useState(false)
  const [precargadoEn, setPrecargadoEn] = useState(0)

  // Lo precargado se lee antes que nada: si no hay señal, el panel abre igual.
  const usarSnapshot = useCallback(() => {
    const snapshot = leerSnapshot()
    if (!snapshot) return false
    setSorteos(snapshot.sorteos)
    setPremios(snapshot.premios)
    setResultadosBase(snapshot.resultados)
    setParticipantes(snapshot.participantes)
    setPrecargadoEn(snapshot.guardadoEn)
    return true
  }, [])

  const recargar = useCallback(async () => {
    try {
      const [resSorteos, resPremios, resResultados, resParticipantes] = await Promise.all([
        supabase.from("sorteos").select("*").order("orden").order("created_at"),
        supabase.from("sorteo_premios").select("*").order("orden"),
        supabase.from("sorteo_resultados").select("*").order("vuelta").order("orden"),
        supabase
          .from("participantes")
          .select(COLUMNAS_PARTICIPANTE)
          .contains("anios", [EDICION_ACTUAL]),
      ])

      const falla =
        resSorteos.error || resPremios.error || resResultados.error || resParticipantes.error
      if (falla) throw falla

      const nuevos = {
        sorteos: (resSorteos.data ?? []) as unknown as Sorteo[],
        premios: (resPremios.data ?? []) as unknown as Premio[],
        resultados: (resResultados.data ?? []) as unknown as Resultado[],
        participantes: (resParticipantes.data ?? []) as unknown as FilaParticipante[],
      }

      setSorteos(nuevos.sorteos)
      setPremios(nuevos.premios)
      setResultadosBase(nuevos.resultados)
      setParticipantes(nuevos.participantes)
      setSinConexion(false)
      setError(null)

      // Queda precargado para el dia del evento.
      const snapshot = guardarSnapshot(nuevos)
      setPrecargadoEn(snapshot.guardadoEn)
    } catch (err: unknown) {
      console.error("Error cargando los sorteos:", err)
      const hayCopia = usarSnapshot()
      setSinConexion(true)
      setError(
        hayCopia
          ? null
          : "No se pudieron cargar los sorteos y todavía no hay datos precargados en este dispositivo.",
      )
    } finally {
      setCargando(false)
    }
  }, [usarSnapshot])

  /** Sube lo que se sorteo sin conexion. Devuelve true si no quedo nada pendiente. */
  const sincronizar = useCallback(async (): Promise<boolean> => {
    const actual = leerCola()
    if (cambiosPendientes(actual) === 0) return true

    try {
      const filas = Object.values(actual.resultados)
      if (filas.length > 0) {
        const { error: errorUpsert } = await supabase.from("sorteo_resultados").upsert(filas)
        if (errorUpsert) throw errorUpsert
      }

      if (actual.borrados.length > 0) {
        const { error: errorBorrado } = await supabase
          .from("sorteo_resultados")
          .delete()
          .in("id", actual.borrados)
        if (errorBorrado) throw errorBorrado
      }

      for (const [sorteoId, estado] of Object.entries(actual.estados)) {
        const { error: errorEstado } = await supabase
          .from("sorteos")
          .update({ estado })
          .eq("id", sorteoId)
        if (errorEstado) throw errorEstado
      }

      vaciarCola()
      setCola({ resultados: {}, borrados: [], estados: {} })
      setSinConexion(false)
      return true
    } catch (err) {
      console.error("No se pudieron subir los resultados del sorteo:", err)
      setSinConexion(true)
      return false
    }
  }, [])

  useEffect(() => {
    if (!habilitado) return
    // Primero lo precargado (instantaneo), despues la red.
    usarSnapshot()
    setCola(leerCola())
    recargar()
  }, [habilitado, recargar, usarSnapshot])

  // Al volver la conexion, se sube solo lo que quedo pendiente.
  useEffect(() => {
    if (!habilitado) return
    const alVolver = () => {
      sincronizar().then((ok) => {
        if (ok) recargar()
      })
    }
    window.addEventListener("online", alVolver)
    return () => window.removeEventListener("online", alVolver)
  }, [habilitado, recargar, sincronizar])

  // ── Mutaciones del sorteo en vivo ───────────────────────────
  // Siempre se guardan primero en el telefono: el acto no puede frenarse
  // porque no haya señal.

  const registrarTirada = useCallback(async (fila: FilaResultado) => {
    setCola(encolarResultado(fila))
    setResultadosBase((prev) => prev.filter((r) => r.id !== fila.id))
    const { error: errorInsert } = await supabase.from("sorteo_resultados").upsert(fila)
    if (errorInsert) {
      setSinConexion(true)
      return
    }
    // Ya esta arriba: sale de la cola.
    const limpia = leerCola()
    delete limpia.resultados[fila.id]
    setCola(limpia)
    guardarCola(limpia)
    setResultadosBase((prev) => [...prev.filter((r) => r.id !== fila.id), { ...fila, created_at: new Date().toISOString() } as Resultado])
  }, [])

  const cambiarEstadoResultado = useCallback(
    async (id: string, estado: EstadoResultado) => {
      const resuelto_en = new Date().toISOString()
      const enBase = resultadosBase.find((r) => r.id === id)
      const enCola = leerCola().resultados[id]
      const fila = enCola ?? (enBase ? ({ ...enBase } as FilaResultado) : null)
      if (!fila) return

      const actualizada: FilaResultado = { ...fila, estado, resuelto_en }
      await registrarTirada(actualizada)
    },
    [registrarTirada, resultadosBase],
  )

  const borrarResultado = useCallback(async (id: string) => {
    setCola(encolarBorrado(id))
    setResultadosBase((prev) => prev.filter((r) => r.id !== id))
    const { error: errorBorrado } = await supabase.from("sorteo_resultados").delete().eq("id", id)
    if (!errorBorrado) {
      const limpia = leerCola()
      limpia.borrados = limpia.borrados.filter((x) => x !== id)
      setCola(limpia)
      guardarCola(limpia)
    } else {
      setSinConexion(true)
    }
  }, [])

  const cambiarEstadoSorteo = useCallback(async (sorteoId: string, estado: EstadoSorteo) => {
    setSorteos((prev) => prev.map((s) => (s.id === sorteoId ? { ...s, estado } : s)))
    setCola(encolarEstadoSorteo(sorteoId, estado))
    const { error: errorEstado } = await supabase.from("sorteos").update({ estado }).eq("id", sorteoId)
    if (!errorEstado) {
      const limpia = leerCola()
      delete limpia.estados[sorteoId]
      setCola(limpia)
      guardarCola(limpia)
    } else {
      setSinConexion(true)
    }
  }, [])

  const resultados = useMemo(() => mezclarResultados(resultadosBase, cola), [resultadosBase, cola])

  return {
    sorteos,
    premios,
    resultados,
    participantes,
    cargando,
    error,
    sinConexion,
    precargadoEn,
    pendientes: cambiosPendientes(cola),
    recargar,
    sincronizar,
    registrarTirada,
    cambiarEstadoResultado,
    borrarResultado,
    cambiarEstadoSorteo,
  }
}
