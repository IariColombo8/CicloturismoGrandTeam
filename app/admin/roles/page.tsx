"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
} from "lucide-react"
import { explicarError } from "@/lib/errores"
import ResumenRoles from "@/components/roles/ResumenRoles"
import FiltrosRoles from "@/components/roles/FiltrosRoles"
import TarjetaRol from "@/components/roles/TarjetaRol"
import FormularioRol, {
  VALORES_VACIOS,
  datosDeValores,
  type ValoresRol,
} from "@/components/roles/FormularioRol"
import {
  COLUMNAS_ROL,
  banderasDeModo,
  filtrarRoles,
  modoDeRol,
  ordenarRoles,
  resumirRoles,
  type FiltroRoles,
  type RolEvento,
} from "@/lib/roles"

interface Inscripto {
  id: string
  nombre: string
}

/**
 * /admin/roles — el reparto de tareas del dia del evento.
 *
 * Lo mismo que ve cualquiera en /roles, pero con las acciones del equipo:
 * cargar a mano (eligiendo un inscripto o escribiendo el nombre), corregir,
 * reordenar, borrar y "fijar" una ficha para que el formulario publico no la
 * vuelva a pisar.
 *
 * Es la unica forma de EDITAR: el alta publica solo puede crear o actualizar
 * su propia ficha, y nunca una fijada.
 */
export default function AdminRolesPage() {
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const { toast } = useToast()

  const [roles, setRoles] = useState<RolEvento[]>([])
  const [inscriptos, setInscriptos] = useState<Inscripto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroRoles>({ texto: "", modo: "todos", tarea: "todas" })

  // Edicion: null = cerrado. `id` null = alta nueva.
  const [editando, setEditando] = useState<{ id: string | null; valores: ValoresRol } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const autorizado = userRole === "admin" || userRole === "grandteam"

  const cargar = useCallback(async () => {
    const [resRoles, resInscriptos] = await Promise.all([
      supabase.from("roles_evento").select(`${COLUMNAS_ROL}, cargado_por`).order("orden"),
      supabase.from("participantes").select("id, nombre, apellido").order("nombre"),
    ])

    if (resRoles.error) {
      setError(explicarError(resRoles.error))
    } else {
      setError(null)
      setRoles((resRoles.data ?? []) as unknown as RolEvento[])
    }

    type FilaParticipante = { id: string; nombre: string | null; apellido: string | null }
    setInscriptos(
      ((resInscriptos.data ?? []) as FilaParticipante[])
        .map((p) => ({ id: p.id, nombre: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() }))
        .filter((p) => p.nombre),
    )

    setCargando(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || !autorizado) {
      setCargando(false)
      return
    }
    cargar()

    const canal = supabase
      .channel("roles-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "roles_evento" }, () => cargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [authLoading, user, autorizado, cargar])

  const ordenados = useMemo(() => ordenarRoles(roles), [roles])
  const resumen = useMemo(() => resumirRoles(roles), [roles])
  const visibles = useMemo(() => filtrarRoles(ordenados, filtro), [ordenados, filtro])
  const nombres = useMemo(() => roles.map((r) => r.nombre), [roles])

  const abrirNuevo = () => setEditando({ id: null, valores: VALORES_VACIOS })

  const abrirEdicion = (rol: RolEvento) =>
    setEditando({
      id: rol.id,
      valores: {
        nombre: rol.nombre,
        modo: modoDeRol(rol),
        tareas: rol.tareas ?? [],
        familiares: rol.familiares ?? 0,
        familiares_detalle: rol.familiares_detalle ?? "",
        notas: rol.notas ?? "",
        participante_id: rol.participante_id,
      },
    })

  const guardar = async () => {
    if (!editando) return

    const datos = datosDeValores(editando.valores)
    if (!datos.nombre.trim()) {
      toast({ title: "Falta el nombre", variant: "destructive" })
      return
    }

    setGuardando(true)
    setError(null)

    // El `orden` de una ficha nueva la manda al final de la lista.
    const maxOrden = roles.reduce((max, r) => Math.max(max, r.orden ?? 0), -1)
    const fila = {
      nombre: datos.nombre,
      participante_id: datos.participante_id,
      ...banderasDeModo(editando.valores.modo),
      tareas: datos.tareas,
      familiares: datos.familiares,
      familiares_detalle: datos.familiares_detalle,
      notas: datos.notas,
      cargado_por: user?.email ?? "panel",
    }

    // El .select() no es decorativo: sin el, una fila filtrada por RLS parece
    // un guardado exitoso.
    const { error: errorGuardado } = editando.id
      ? await supabase.from("roles_evento").update(fila).eq("id", editando.id).select().single()
      : await supabase
          .from("roles_evento")
          .insert({ ...fila, orden: maxOrden + 1 })
          .select()
          .single()

    setGuardando(false)

    if (errorGuardado) {
      const mensaje = explicarError(errorGuardado)
      setError(mensaje)
      toast({ title: "No se pudo guardar", description: mensaje, variant: "destructive" })
      return
    }

    toast({ title: editando.id ? "Ficha actualizada" : `${datos.nombre} quedó en la lista` })
    setEditando(null)
    cargar()
  }

  const borrar = async (rol: RolEvento) => {
    if (!confirm(`Sacar a ${rol.nombre} de la lista?`)) return

    setOcupado(rol.id)
    const { error: errorBorrado } = await supabase.from("roles_evento").delete().eq("id", rol.id)
    setOcupado(null)

    if (errorBorrado) {
      toast({
        title: "No se pudo borrar",
        description: explicarError(errorBorrado),
        variant: "destructive",
      })
      return
    }
    setRoles((lista) => lista.filter((r) => r.id !== rol.id))
  }

  const alternarFijado = async (rol: RolEvento) => {
    setOcupado(rol.id)
    const { error: errorFijado } = await supabase
      .from("roles_evento")
      .update({ bloqueado: !rol.bloqueado })
      .eq("id", rol.id)
      .select()
      .single()
    setOcupado(null)

    if (errorFijado) {
      toast({
        title: "No se pudo cambiar",
        description: explicarError(errorFijado),
        variant: "destructive",
      })
      return
    }
    cargar()
  }

  /** Mueve una ficha intercambiando el `orden` con su vecina. */
  const mover = async (rol: RolEvento, direccion: -1 | 1) => {
    const posicion = ordenados.findIndex((r) => r.id === rol.id)
    const vecino = ordenados[posicion + direccion]
    if (!vecino) return

    setOcupado(rol.id)
    await Promise.all([
      supabase.from("roles_evento").update({ orden: vecino.orden }).eq("id", rol.id),
      supabase.from("roles_evento").update({ orden: rol.orden }).eq("id", vecino.id),
    ])
    setOcupado(null)
    cargar()
  }

  if (authLoading || cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" aria-hidden="true" />
      </div>
    )
  }

  if (!user || !autorizado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black px-4 pt-20">
        <Card className="max-w-md border-zinc-800 bg-zinc-900/80">
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-red-400" aria-hidden="true" />
            <h2 className="mb-1 text-lg font-bold text-white">Acceso restringido</h2>
            <p className="mb-4 text-sm text-zinc-400">
              Para editar los roles hace falta rol admin o Grand Team. La lista se puede ver sin
              sesión en /roles.
            </p>
            <Link href="/roles">
              <Button variant="outline" className="border-zinc-700 text-zinc-300">
                Ver la lista pública
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Cabecera */}
      <div className="sticky top-20 z-10 border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-black text-white sm:text-3xl">
                <span className="gradient-text">Roles del evento</span>
              </h1>
              <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                {resumen.total} anotados · {resumen.pedalean} pedalean · {resumen.soloAyudan} ayudan
                sin pedalear
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                onClick={abrirNuevo}
                className="flex-1 bg-yellow-400 font-semibold text-black hover:bg-yellow-500 sm:flex-none"
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Agregar
              </Button>
              <Link href="/roles" target="_blank" className="flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Ver pública
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <p className="text-xs text-zinc-500">
          La lista es pública en{" "}
          <Link href="/roles" className="text-yellow-400 hover:underline">
            grand-team.vercel.app/roles
          </Link>{" "}
          — cualquiera puede sumarse desde ahí, pero solo el equipo puede corregir y ordenar. El
          candado fija una ficha para que el formulario público no la vuelva a tocar.
        </p>

        <ResumenRoles resumen={resumen} mostrarFaltantes />

        {roles.length > 0 && (
          <FiltrosRoles
            filtro={filtro}
            onChange={setFiltro}
            tareasConGente={resumen.porTarea.map((t) => t.id)}
          />
        )}

        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-14 text-center">
            <p className="text-sm text-zinc-400">Todavía no hay nadie en la lista.</p>
            <Button onClick={abrirNuevo} variant="outline" className="mt-3 border-zinc-700 text-zinc-300">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Agregar el primero
            </Button>
          </div>
        ) : visibles.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">Nadie coincide con ese filtro.</p>
        ) : (
          <div className="space-y-2.5">
            {visibles.map((rol) => {
              const posicion = ordenados.findIndex((r) => r.id === rol.id)
              return (
                <TarjetaRol
                  key={rol.id}
                  rol={rol}
                  acciones={
                    ocupado === rol.id ? (
                      <Loader2 className="mx-2 h-4 w-4 animate-spin text-yellow-400" aria-hidden="true" />
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEdicion(rol)}
                            aria-label={`Editar ${rol.nombre}`}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-yellow-400"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => alternarFijado(rol)}
                            aria-label={rol.bloqueado ? "Liberar la ficha" : "Fijar la ficha"}
                            title={
                              rol.bloqueado
                                ? "Liberar: la persona puede volver a editarla desde /roles"
                                : "Fijar: el formulario público no la puede tocar"
                            }
                            className={`h-8 w-8 p-0 ${
                              rol.bloqueado ? "text-yellow-400" : "text-zinc-500 hover:text-white"
                            }`}
                          >
                            {rol.bloqueado ? (
                              <Lock className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <LockOpen className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => borrar(rol)}
                            aria-label={`Sacar a ${rol.nombre}`}
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-400/10"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => mover(rol, -1)}
                            disabled={posicion <= 0}
                            aria-label="Subir en la lista"
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => mover(rol, 1)}
                            disabled={posicion >= ordenados.length - 1}
                            aria-label="Bajar en la lista"
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    )
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Alta y edicion */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setEditando(null)}
          role="presentation"
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-yellow-400/20 bg-zinc-950 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editando.id ? "Editar ficha" : "Agregar a la lista"}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
              <h2 className="font-bold text-white">
                {editando.id ? "Editar ficha" : "Agregar a la lista"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditando(null)}
                aria-label="Cerrar"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="p-4">
              <FormularioRol
                valores={editando.valores}
                onChange={(valores) => setEditando({ ...editando, valores })}
                inscriptos={inscriptos}
                nombresExistentes={editando.id ? [] : nombres}
              />

              {/* Tarea a mano: lo que no esta en la lista de siempre. */}
              <TareaLibre
                onAgregar={(texto) =>
                  setEditando((actual) =>
                    actual
                      ? {
                          ...actual,
                          valores: {
                            ...actual.valores,
                            tareas: [...new Set([...actual.valores.tareas, texto])],
                          },
                        }
                      : actual,
                  )
                }
              />
            </div>

            <div className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:flex-row-reverse">
              <Button
                onClick={guardar}
                disabled={guardando}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 font-bold text-black hover:from-yellow-500 hover:to-yellow-700 sm:w-auto"
              >
                {guardando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    Guardar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditando(null)}
                className="w-full border-zinc-700 text-zinc-300 hover:text-white sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Campo para sumar una tarea que no esta en la lista de siempre. */
function TareaLibre({ onAgregar }: { onAgregar: (texto: string) => void }) {
  const [texto, setTexto] = useState("")

  const agregar = () => {
    const limpio = texto.trim()
    if (!limpio) return
    onAgregar(limpio)
    setTexto("")
  }

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <Label className="text-xs text-zinc-300">Otra tarea (la que no está en la lista)</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              agregar()
            }
          }}
          placeholder="Ej: manejar el drone"
          className="bg-zinc-800 border-zinc-700 text-base text-white"
        />
        <Button
          type="button"
          variant="outline"
          onClick={agregar}
          className="border-zinc-700 text-zinc-300 hover:text-white"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
