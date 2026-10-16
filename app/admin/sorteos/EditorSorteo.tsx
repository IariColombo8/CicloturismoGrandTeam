"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Gift,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react"
import {
  claveTexto,
  participantesElegibles,
  tiradasDePremios,
  PREMIO_PLACEHOLDER,
  type FilaParticipante,
  type Premio,
  type Sorteo,
} from "@/lib/sorteos"
import { claveBorrador, useBorradorFormulario } from "@/hooks/useBorradorFormulario"
import BannerBorrador from "@/components/admin/BannerBorrador"
import DialogoSalirSinGuardar from "@/components/admin/DialogoSalirSinGuardar"
import SelectorPersonas from "./SelectorPersonas"

type SorteoEditable = Omit<Sorteo, "id"> & { id?: string }

const SORTEO_VACIO: SorteoEditable = {
  nombre: "",
  descripcion: "",
  total_sorteos: 1,
  estado: "borrador",
  publico: false,
  orden: 0,
  excluir_grupos: [],
  excluir_participantes: [],
  incluir_participantes: [],
  solo_confirmados: true,
  solo_acreditados: false,
}

interface Props {
  sorteo: Sorteo | null
  /** Todos los premios cargados (se filtran por sorteo adentro). */
  premios: Premio[]
  participantes: FilaParticipante[]
  ordenSugerido: number
  onCerrar: () => void
  onGuardado: () => void
}

/**
 * Configuracion de una tanda de sorteo: datos, quien entra al bolillero y los
 * premios que se muestran en la web.
 *
 * Se edita con internet (es la parte que se "sube con wifi"); el dia del
 * evento el bolillero funciona con lo precargado.
 */
export default function EditorSorteo({
  sorteo,
  premios,
  participantes,
  ordenSugerido,
  onCerrar,
  onGuardado,
}: Props) {
  const esNuevo = !sorteo
  const [datos, setDatos] = useState<SorteoEditable>(
    sorteo ? { ...sorteo } : { ...SORTEO_VACIO, orden: ordenSugerido },
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const referenciaRef = useRef(JSON.stringify(sorteo ?? { ...SORTEO_VACIO, orden: ordenSugerido }))

  const hayCambios = useMemo(
    () => JSON.stringify(datos) !== referenciaRef.current,
    [datos],
  )

  const { borrador, guardarAhora, descartarBorrador, ocultarAviso } =
    useBorradorFormulario<SorteoEditable>({
      clave: claveBorrador("sorteo", sorteo?.id || "nuevo"),
      datos,
      hayCambios,
    })

  // ── Premios de este sorteo ────────────────────────────────
  const premiosDelSorteo = useMemo(
    () => premios.filter((p) => p.sorteo_id === sorteo?.id).sort((a, b) => a.orden - b.orden),
    [premios, sorteo?.id],
  )
  const [listaPremios, setListaPremios] = useState<Premio[]>(premiosDelSorteo)
  const [subiendo, setSubiendo] = useState<string | null>(null)

  useEffect(() => {
    setListaPremios(premiosDelSorteo)
  }, [premiosDelSorteo])

  // ── Grupos detectados en las inscripciones ────────────────
  const grupos = useMemo(() => {
    const conteo = new Map<string, { nombre: string; cantidad: number }>()
    for (const fila of participantes) {
      const nombre = fila.grupo_ciclistas?.trim()
      if (!nombre) continue
      const clave = claveTexto(nombre)
      const actual = conteo.get(clave)
      conteo.set(clave, { nombre: actual?.nombre ?? nombre, cantidad: (actual?.cantidad ?? 0) + 1 })
    }
    return [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad)
  }, [participantes])

  // Cuanta gente entra con la configuracion actual.
  const elegibles = useMemo(
    () => participantesElegibles(participantes, { ...datos, id: datos.id ?? "" } as Sorteo),
    [participantes, datos],
  )

  const tiradasConPremio = tiradasDePremios(listaPremios)

  const alternarGrupo = (nombre: string) => {
    const clave = claveTexto(nombre)
    const actuales = datos.excluir_grupos ?? []
    const estaba = actuales.some((g) => claveTexto(g) === clave)
    setDatos({
      ...datos,
      excluir_grupos: estaba
        ? actuales.filter((g) => claveTexto(g) !== clave)
        : [...actuales, nombre],
    })
  }

  const guardar = async () => {
    if (!datos.nombre.trim()) {
      setError("Ponele un nombre al sorteo.")
      return
    }
    if (!Number.isFinite(datos.total_sorteos) || datos.total_sorteos < 1) {
      setError("La cantidad de sorteos tiene que ser 1 o más.")
      return
    }

    setGuardando(true)
    setError(null)

    const payload = {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || null,
      total_sorteos: Math.floor(datos.total_sorteos),
      publico: datos.publico,
      orden: datos.orden ?? 0,
      excluir_grupos: datos.excluir_grupos ?? [],
      excluir_participantes: datos.excluir_participantes ?? [],
      incluir_participantes: datos.incluir_participantes ?? [],
      solo_confirmados: datos.solo_confirmados,
      solo_acreditados: datos.solo_acreditados,
    }

    const { error: errorDb } = esNuevo
      ? await supabase.from("sorteos").insert(payload)
      : await supabase.from("sorteos").update(payload).eq("id", sorteo!.id)

    setGuardando(false)

    if (errorDb) {
      console.error("Error guardando el sorteo:", errorDb)
      setError(
        errorDb.message?.includes("sorteos")
          ? "No se pudo guardar. Si es la primera vez, corré la migración 20261015_sorteos.sql en Supabase."
          : "No se pudo guardar el sorteo. ¿Hay internet?",
      )
      return
    }

    descartarBorrador()
    onGuardado()
    onCerrar()
  }

  // ── Premios ───────────────────────────────────────────────
  const agregarPremio = async () => {
    if (!sorteo) return
    const orden = listaPremios.reduce((max, p) => Math.max(max, p.orden), -1) + 1
    const { data, error: errorDb } = await supabase
      .from("sorteo_premios")
      .insert({ sorteo_id: sorteo.id, nombre: `Premio ${orden + 1}`, orden })
      .select()
      .single()

    if (errorDb || !data) {
      setError("No se pudo agregar el premio. ¿Hay internet?")
      return
    }
    setListaPremios((prev) => [...prev, data as Premio])
    onGuardado()
  }

  const actualizarPremio = async (id: string, cambios: Partial<Premio>) => {
    setListaPremios((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)))
    const { error: errorDb } = await supabase.from("sorteo_premios").update(cambios).eq("id", id)
    if (errorDb) setError("No se pudo guardar el premio. ¿Hay internet?")
    else onGuardado()
  }

  const borrarPremio = async (premio: Premio) => {
    if (!window.confirm(`¿Borrar el premio "${premio.nombre}"?`)) return
    setListaPremios((prev) => prev.filter((p) => p.id !== premio.id))
    await supabase.from("sorteo_premios").delete().eq("id", premio.id)
    onGuardado()
  }

  const moverPremio = async (index: number, direccion: -1 | 1) => {
    const destino = index + direccion
    if (destino < 0 || destino >= listaPremios.length) return
    const lista = [...listaPremios]
    ;[lista[index], lista[destino]] = [lista[destino], lista[index]]
    const conOrden = lista.map((p, i) => ({ ...p, orden: i }))
    setListaPremios(conOrden)
    await Promise.all(
      conOrden.map((p) => supabase.from("sorteo_premios").update({ orden: p.orden }).eq("id", p.id)),
    )
    onGuardado()
  }

  const subirFoto = async (premio: Premio, archivo: File) => {
    setSubiendo(premio.id)
    try {
      const formData = new FormData()
      formData.append("file", archivo)
      formData.append("nombre", premio.nombre)
      const res = await fetch("/api/sorteos/upload-imagen", { method: "POST", body: formData })
      const resultado = await res.json()
      if (!res.ok) {
        setError(resultado.error || "No se pudo subir la foto.")
        return
      }
      await actualizarPremio(premio.id, { imagen_url: resultado.url })
    } catch {
      setError("No se pudo subir la foto. ¿Hay internet?")
    } finally {
      setSubiendo(null)
    }
  }

  const intentarCerrar = () => {
    if (hayCambios) {
      setConfirmarSalida(true)
      return
    }
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-yellow-400/30 bg-zinc-950 shadow-2xl">
        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Gift className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            {esNuevo ? "Nuevo sorteo" : datos.nombre || "Sorteo"}
          </h2>
          <button
            type="button"
            onClick={intentarCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          {borrador && (
            <BannerBorrador
              guardadoEn={borrador.guardadoEn}
              onRetomar={() => {
                setDatos(borrador.datos)
                ocultarAviso()
              }}
              onDescartar={() => {
                descartarBorrador()
                ocultarAviso()
              }}
            />
          )}

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          {/* ── Datos ─────────────────────────────────── */}
          <section className="space-y-4">
            <div>
              <Label htmlFor="sorteo-nombre" className="text-zinc-300">
                Nombre del sorteo
              </Label>
              <Input
                id="sorteo-nombre"
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                placeholder="Sorteo de premios / Sorteo de la bici"
                className="mt-1 border-zinc-700 bg-zinc-900 text-white"
              />
            </div>

            <div>
              <Label htmlFor="sorteo-descripcion" className="text-zinc-300">
                Descripción (se ve en la web)
              </Label>
              <Textarea
                id="sorteo-descripcion"
                value={datos.descripcion ?? ""}
                onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
                rows={2}
                placeholder="Sorteo entre todos los inscriptos presentes el día del evento"
                className="mt-1 border-zinc-700 bg-zinc-900 text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sorteo-total" className="text-zinc-300">
                  ¿Cuántos sorteos querés hacer?
                </Label>
                <Input
                  id="sorteo-total"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={datos.total_sorteos}
                  onChange={(e) =>
                    setDatos({ ...datos, total_sorteos: Number.parseInt(e.target.value || "1", 10) })
                  }
                  className="mt-1 border-zinc-700 bg-zinc-900 text-white"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Cantidad de tiradas de esta tanda. La bici va en un sorteo aparte.
                </p>
              </div>

              <div>
                <Label htmlFor="sorteo-orden" className="text-zinc-300">
                  Orden en la web
                </Label>
                <Input
                  id="sorteo-orden"
                  type="number"
                  value={datos.orden}
                  onChange={(e) => setDatos({ ...datos, orden: Number.parseInt(e.target.value || "0", 10) })}
                  className="mt-1 border-zinc-700 bg-zinc-900 text-white"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <input
                type="checkbox"
                checked={datos.publico}
                onChange={(e) => setDatos({ ...datos, publico: e.target.checked })}
                className="h-4 w-4 accent-yellow-400"
              />
              <span className="text-sm text-zinc-200">
                Mostrar en la web pública{" "}
                <span className="text-zinc-500">(premios y ganadores en /sorteos)</span>
              </span>
            </label>
          </section>

          {/* ── Quien entra al bolillero ──────────────── */}
          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-yellow-400">
              <Users className="h-4 w-4" aria-hidden="true" />
              Quién entra al sorteo
            </h3>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <input
                  type="checkbox"
                  checked={datos.solo_confirmados}
                  onChange={(e) => setDatos({ ...datos, solo_confirmados: e.target.checked })}
                  className="h-4 w-4 accent-yellow-400"
                />
                <span className="text-sm text-zinc-200">Solo inscripciones confirmadas</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <input
                  type="checkbox"
                  checked={datos.solo_acreditados}
                  onChange={(e) => setDatos({ ...datos, solo_acreditados: e.target.checked })}
                  className="h-4 w-4 accent-yellow-400"
                />
                <span className="text-sm text-zinc-200">
                  Solo los acreditados <span className="text-zinc-500">(check-in del día)</span>
                </span>
              </label>
            </div>

            {/* Grupos excluidos */}
            <div>
              <p className="mb-2 text-sm text-zinc-300">
                Grupos que no participan{" "}
                <span className="text-zinc-500">(tocá para dejarlos afuera)</span>
              </p>
              {grupos.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Todavía no hay grupos cargados en las inscripciones.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {grupos.map((grupo) => {
                    const excluido = (datos.excluir_grupos ?? []).some(
                      (g) => claveTexto(g) === claveTexto(grupo.nombre),
                    )
                    return (
                      <button
                        key={grupo.nombre}
                        type="button"
                        onClick={() => alternarGrupo(grupo.nombre)}
                        className={[
                          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          excluido
                            ? "border-red-500/50 bg-red-500/15 text-red-200 line-through"
                            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-yellow-400/50 hover:text-yellow-400",
                        ].join(" ")}
                      >
                        {excluido ? <X className="h-3 w-3" /> : <Check className="h-3 w-3 opacity-40" />}
                        {grupo.nombre}
                        <span className="text-[10px] text-zinc-500">({grupo.cantidad})</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Personas excluidas e incluidas a mano */}
            <SelectorPersonas
              titulo="Personas que no entran"
              ayuda="Buscá por nombre y marcá a quien quieras dejar afuera (el que ya ganó algo, el equipo de la organización)."
              participantes={participantes}
              seleccionados={datos.excluir_participantes ?? []}
              onCambio={(ids) => setDatos({ ...datos, excluir_participantes: ids })}
              tono="rojo"
            />

            <SelectorPersonas
              titulo="Lista cerrada (opcional)"
              ayuda="Si marcás gente acá, el sorteo es SOLO entre ellos y se ignoran los filtros de arriba. Dejalo vacío para sortear entre todos."
              participantes={participantes}
              seleccionados={datos.incluir_participantes ?? []}
              onCambio={(ids) => setDatos({ ...datos, incluir_participantes: ids })}
              tono="dorado"
            />

            <p className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-sm font-semibold text-yellow-300">
              Entran {elegibles.length} personas al bolillero
              {datos.total_sorteos > elegibles.length && elegibles.length > 0 && (
                <span className="ml-1 font-normal text-yellow-200/80">
                  · hay más sorteos que gente: cuando salgan todos, arranca una ronda nueva
                </span>
              )}
            </p>
          </section>

          {/* ── Premios ───────────────────────────────── */}
          <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-yellow-400">
                <Gift className="h-4 w-4" aria-hidden="true" />
                Premios con foto
              </h3>
              {!esNuevo && (
                <Button
                  type="button"
                  size="sm"
                  onClick={agregarPremio}
                  className="bg-yellow-400 font-bold text-black hover:bg-yellow-500"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar premio
                </Button>
              )}
            </div>

            {esNuevo ? (
              <p className="text-xs text-zinc-500">
                Guardá el sorteo y después cargás los premios con sus fotos.
              </p>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  No hace falta cargarlos todos: con los más importantes alcanza. Las tiradas sin
                  premio cargado se anuncian como “Premio N”.
                </p>

                {listaPremios.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">Todavía no cargaste premios.</p>
                ) : (
                  <ul className="space-y-3">
                    {listaPremios.map((premio, index) => (
                      <li
                        key={premio.id}
                        className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 sm:flex-row sm:items-start"
                      >
                        {/* Foto */}
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element -- viene de Supabase Storage */}
                          <img
                            src={premio.imagen_url || PREMIO_PLACEHOLDER}
                            alt={premio.nombre}
                            className="h-full w-full object-cover"
                          />
                          <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/60 opacity-0 transition-opacity hover:opacity-100">
                            {subiendo === premio.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-yellow-400" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const archivo = e.target.files?.[0]
                                if (archivo) subirFoto(premio, archivo)
                                e.target.value = ""
                              }}
                            />
                          </label>
                        </div>

                        {/* Datos */}
                        <div className="min-w-0 flex-1 space-y-2">
                          <Input
                            value={premio.nombre}
                            onChange={(e) =>
                              setListaPremios((prev) =>
                                prev.map((p) => (p.id === premio.id ? { ...p, nombre: e.target.value } : p)),
                              )
                            }
                            onBlur={(e) => actualizarPremio(premio.id, { nombre: e.target.value.trim() || "Premio" })}
                            placeholder="Nombre del premio"
                            className="border-zinc-700 bg-zinc-950 text-white"
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                              Cantidad
                              <Input
                                type="number"
                                min={1}
                                value={premio.cantidad}
                                onChange={(e) =>
                                  actualizarPremio(premio.id, {
                                    cantidad: Math.max(1, Number.parseInt(e.target.value || "1", 10)),
                                  })
                                }
                                className="h-8 w-16 border-zinc-700 bg-zinc-950 text-white"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => actualizarPremio(premio.id, { visible: !premio.visible })}
                              className={[
                                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                                premio.visible
                                  ? "border-green-500/40 bg-green-500/10 text-green-300"
                                  : "border-zinc-700 bg-zinc-900 text-zinc-400",
                              ].join(" ")}
                            >
                              {premio.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              {premio.visible ? "En la web" : "Oculto"}
                            </button>

                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moverPremio(index, -1)}
                                aria-label="Subir premio"
                                className="rounded p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moverPremio(index, 1)}
                                aria-label="Bajar premio"
                                className="rounded p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => borrarPremio(premio)}
                                aria-label="Borrar premio"
                                className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {tiradasConPremio > datos.total_sorteos && (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    Los premios cargados ocupan {tiradasConPremio} tiradas y el sorteo tiene{" "}
                    {datos.total_sorteos}: los últimos no se van a sortear.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* Pie */}
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={intentarCerrar}
            className="border-zinc-700 text-zinc-300 hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="bg-yellow-400 font-bold text-black hover:bg-yellow-500"
          >
            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar sorteo
          </Button>
        </div>
      </div>

      <DialogoSalirSinGuardar
        abierto={confirmarSalida}
        onGuardarYSalir={() => {
          guardarAhora()
          onCerrar()
        }}
        onSeguirEditando={() => setConfirmarSalida(false)}
        onDescartar={() => {
          descartarBorrador()
          onCerrar()
        }}
      />
    </div>
  )
}
