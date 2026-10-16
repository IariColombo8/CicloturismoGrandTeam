"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle2,
  CloudOff,
  Dices,
  Download,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Ticket,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"
import {
  ganadores,
  participantesElegibles,
  slotsSinReclamar,
  slotsSinTirar,
  type Sorteo,
} from "@/lib/sorteos"
import { fechaSnapshot } from "@/lib/sorteosLocal"
import { useSorteos } from "./useSorteos"
import EditorSorteo from "./EditorSorteo"
import Bolillero from "./Bolillero"

type Pestaña = "sortear" | "configuracion"

/**
 * Panel de Sorteos.
 *
 * Dos partes, como el resto del panel: "Sortear" (el bolillero del escenario) y
 * "Configuración" (los premios con foto y quién entra al sorteo).
 *
 * Pensado para el día del evento: todo lo necesario queda precargado en el
 * dispositivo, así el sorteo funciona sin internet (ver lib/sorteosLocal.ts).
 */
export default function AdminSorteosPage() {
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const autorizado = userRole === "admin" || userRole === "grandteam"

  const datos = useSorteos(autorizado && !!user)
  const [pestaña, setPestaña] = useState<Pestaña>("sortear")
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [editando, setEditando] = useState<Sorteo | null>(null)
  const [creando, setCreando] = useState(false)

  // Al cargar, se elige el sorteo en curso (o el primero).
  useEffect(() => {
    if (seleccionado || datos.sorteos.length === 0) return
    const enCurso = datos.sorteos.find((s) => s.estado === "en_curso")
    setSeleccionado((enCurso ?? datos.sorteos[0]).id)
  }, [datos.sorteos, seleccionado])

  const sorteoActivo = useMemo(
    () => datos.sorteos.find((s) => s.id === seleccionado) ?? null,
    [datos.sorteos, seleccionado],
  )

  const borrarSorteo = async (sorteo: Sorteo) => {
    if (
      !window.confirm(
        `¿Borrar el sorteo "${sorteo.nombre}"? Se borran también sus premios y sus ganadores.`,
      )
    ) {
      return
    }
    await supabase.from("sorteos").delete().eq("id", sorteo.id)
    if (seleccionado === sorteo.id) setSeleccionado(null)
    datos.recargar()
  }

  const alternarPublico = async (sorteo: Sorteo) => {
    await supabase.from("sorteos").update({ publico: !sorteo.publico }).eq("id", sorteo.id)
    datos.recargar()
  }

  if (authLoading || datos.cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    )
  }

  if (!autorizado) {
    return (
      <div className="p-6">
        <p className="text-zinc-300">No tenés permisos para ver esta sección.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Cabecera ─────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Ticket className="h-6 w-6 text-yellow-400" aria-hidden="true" />
            Sorteos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            El bolillero del día del evento y los premios que se muestran en la web.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => datos.recargar()}
            className="border-zinc-700 text-zinc-300 hover:bg-white/5"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar datos
          </Button>
          <Button
            onClick={() => setCreando(true)}
            className="bg-yellow-400 font-bold text-black hover:bg-yellow-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo sorteo
          </Button>
        </div>
      </div>

      {/* ── Estado de la precarga (lo que hace que ande sin wifi) ── */}
      <div
        className={[
          "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm",
          datos.sinConexion
            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
            : "border-green-500/30 bg-green-500/5 text-green-200",
        ].join(" ")}
      >
        {datos.sinConexion ? (
          <CloudOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        )}

        <span className="min-w-0 flex-1">
          {datos.sinConexion ? (
            <>
              Sin conexión: se está usando lo que quedó guardado en este dispositivo
              {datos.precargadoEn > 0 && <> ({fechaSnapshot(datos.precargadoEn)})</>}. El sorteo
              funciona igual.
            </>
          ) : (
            <>
              Datos precargados en este dispositivo
              {datos.precargadoEn > 0 && <> · {fechaSnapshot(datos.precargadoEn)}</>} ·{" "}
              {datos.participantes.length} inscriptos listos para sortear sin internet.
            </>
          )}
        </span>

        {datos.pendientes > 0 && (
          <Button
            size="sm"
            onClick={() => {
              datos.sincronizar().then((ok) => {
                if (ok) datos.recargar()
              })
            }}
            className="bg-amber-400 font-bold text-black hover:bg-amber-300"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 rotate-180" />
            Subir {datos.pendientes} cambios
          </Button>
        )}
      </div>

      {datos.error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {datos.error}
        </p>
      )}

      {/* ── Pestañas ─────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
        {(
          [
            { id: "sortear" as Pestaña, label: "Sortear", icono: Dices },
            { id: "configuracion" as Pestaña, label: "Configuración", icono: Settings2 },
          ] satisfies { id: Pestaña; label: string; icono: typeof Dices }[]
        ).map(({ id, label, icono: Icono }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPestaña(id)}
            className={[
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
              pestaña === id
                ? "bg-yellow-400 text-black"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <Icono className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {datos.sorteos.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="space-y-3 py-12 text-center">
            <Ticket className="mx-auto h-10 w-10 text-zinc-700" aria-hidden="true" />
            <p className="text-zinc-400">Todavía no hay sorteos cargados.</p>
            <Button
              onClick={() => setCreando(true)}
              className="bg-yellow-400 font-bold text-black hover:bg-yellow-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear el primer sorteo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selector de tanda */}
          <div className="flex flex-wrap gap-2">
            {datos.sorteos.map((sorteo) => {
              const activo = sorteo.id === seleccionado
              const delSorteo = datos.resultados.filter((r) => r.sorteo_id === sorteo.id)
              const hechas = sorteo.total_sorteos - slotsSinTirar(delSorteo, sorteo.total_sorteos).length
              return (
                <button
                  key={sorteo.id}
                  type="button"
                  onClick={() => setSeleccionado(sorteo.id)}
                  className={[
                    "rounded-xl border px-4 py-2.5 text-left transition-colors",
                    activo
                      ? "border-yellow-400/60 bg-yellow-400/10"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700",
                  ].join(" ")}
                >
                  <span
                    className={`block text-sm font-bold ${activo ? "text-yellow-300" : "text-zinc-200"}`}
                  >
                    {sorteo.nombre}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {hechas}/{sorteo.total_sorteos} sorteados
                    {sorteo.publico && " · en la web"}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Contenido ──────────────────────────── */}
          {pestaña === "sortear" ? (
            sorteoActivo ? (
              <Bolillero
                sorteo={sorteoActivo}
                premios={datos.premios}
                participantes={datos.participantes}
                resultados={datos.resultados}
                datos={datos}
              />
            ) : (
              <p className="text-sm text-zinc-400">Elegí un sorteo para empezar.</p>
            )
          ) : (
            <ul className="space-y-3">
              {datos.sorteos.map((sorteo) => {
                const delSorteo = datos.resultados.filter((r) => r.sorteo_id === sorteo.id)
                const premiosDelSorteo = datos.premios.filter((p) => p.sorteo_id === sorteo.id)
                const elegibles = participantesElegibles(datos.participantes, sorteo)
                return (
                  <li
                    key={sorteo.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-2 font-bold text-white">
                          {sorteo.nombre}
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              sorteo.estado === "finalizado"
                                ? "bg-green-500/15 text-green-300"
                                : sorteo.estado === "en_curso"
                                  ? "bg-yellow-400/15 text-yellow-300"
                                  : "bg-zinc-700/40 text-zinc-300",
                            ].join(" ")}
                          >
                            {sorteo.estado === "en_curso" ? "en curso" : sorteo.estado}
                          </span>
                        </h3>
                        {sorteo.descripcion && (
                          <p className="mt-1 text-sm text-zinc-400">{sorteo.descripcion}</p>
                        )}
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Dices className="h-3.5 w-3.5 text-yellow-400/70" aria-hidden="true" />
                            {sorteo.total_sorteos} sorteos
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-yellow-400/70" aria-hidden="true" />
                            {elegibles.length} participan
                          </span>
                          <span className="flex items-center gap-1">
                            <Gift className="h-3.5 w-3.5 text-yellow-400/70" aria-hidden="true" />
                            {premiosDelSorteo.length} premios con foto
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5 text-yellow-400/70" aria-hidden="true" />
                            {ganadores(delSorteo).length} ganadores
                          </span>
                          {slotsSinReclamar(delSorteo).length > 0 && (
                            <span className="text-amber-300">
                              {slotsSinReclamar(delSorteo).length} sin reclamar
                            </span>
                          )}
                        </p>
                        {sorteo.excluir_grupos.length > 0 && (
                          <p className="mt-1 text-xs text-zinc-500">
                            No participan: {sorteo.excluir_grupos.join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => alternarPublico(sorteo)}
                          aria-label={sorteo.publico ? "Ocultar de la web" : "Mostrar en la web"}
                          title={sorteo.publico ? "Se ve en /sorteos" : "Oculto"}
                          className={[
                            "rounded-lg p-2 transition-colors",
                            sorteo.publico
                              ? "text-green-400 hover:bg-green-500/10"
                              : "text-zinc-500 hover:bg-white/5",
                          ].join(" ")}
                        >
                          {sorteo.publico ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(sorteo)}
                          aria-label="Editar sorteo"
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-yellow-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => borrarSorteo(sorteo)}
                          aria-label="Borrar sorteo"
                          className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {(creando || editando) && (
        <EditorSorteo
          sorteo={editando}
          premios={datos.premios}
          participantes={datos.participantes}
          ordenSugerido={datos.sorteos.reduce((max, s) => Math.max(max, s.orden), -1) + 1}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
          onGuardado={() => datos.recargar()}
        />
      )}
    </div>
  )
}
