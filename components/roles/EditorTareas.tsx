"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, ArrowUp, Loader2, Minus, Plus, Save, Trash2, X } from "lucide-react"
import { normalizarNombre, type CupoTarea, type TareaConCupo } from "@/lib/roles"

interface Props {
  /** El catalogo actual (incluye las tareas escritas a mano en alguna ficha). */
  tareas: TareaConCupo[]
  /** Para mostrar cuantos hay anotados en cada una mientras se edita. */
  cupos: CupoTarea[]
  onGuardar: (tareas: TareaConCupo[]) => Promise<boolean>
  onCerrar: () => void
}

const BOTON_PASO =
  "grid h-9 w-9 place-items-center rounded-md text-zinc-300 transition-all hover:bg-white/5 active:scale-95 disabled:opacity-30"

/**
 * Tareas del dia del evento y cuanta gente hace falta en cada una. De aca
 * salen el "Falta 1 de Acreditación" de las dos pantallas y las tareas que se
 * pueden elegir en el formulario.
 *
 * Una fila por tarea, con el nombre editable y el cupo con - / + (de un toque
 * desde el celular). Sacar una tarea que alguien tiene en su ficha no le borra
 * nada a esa persona: la tarea vuelve a aparecer, sin cupo, como escrita a mano.
 */
export default function EditorTareas({ tareas: iniciales, cupos, onGuardar, onCerrar }: Props) {
  const [tareas, setTareas] = useState<TareaConCupo[]>(iniciales)
  const [nueva, setNueva] = useState("")
  const [guardando, setGuardando] = useState(false)

  const tenemos = (id: string) => cupos.find((c) => c.id === id)?.tenemos ?? 0

  const cambiar = (indice: number, cambio: Partial<TareaConCupo>) =>
    setTareas((lista) => lista.map((t, i) => (i === indice ? { ...t, ...cambio } : t)))

  const mover = (indice: number, direccion: -1 | 1) =>
    setTareas((lista) => {
      const destino = indice + direccion
      if (destino < 0 || destino >= lista.length) return lista
      const copia = [...lista]
      ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
      return copia
    })

  const agregar = () => {
    const etiqueta = nueva.trim().slice(0, 60)
    if (!etiqueta) return
    // Si ya existe (con otros acentos o mayusculas) no se duplica.
    const clave = normalizarNombre(etiqueta)
    if (tareas.some((t) => normalizarNombre(t.etiqueta) === clave || normalizarNombre(t.id) === clave)) {
      setNueva("")
      return
    }
    // El id es el texto, igual que una tarea escrita a mano en una ficha.
    setTareas((lista) => [...lista, { id: etiqueta, etiqueta, necesarios: 1 }])
    setNueva("")
  }

  const guardar = async () => {
    setGuardando(true)
    // Un nombre borrado sin querer vuelve al que tenia: nunca se guarda vacio.
    const limpias = tareas.map((t) => ({ ...t, etiqueta: t.etiqueta.trim() || t.id }))
    const ok = await onGuardar(limpias)
    setGuardando(false)
    if (ok) onCerrar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-yellow-400/20 bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tareas y cuántos hacen falta"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="font-bold text-white">Tareas y cupos</h2>
            <p className="text-[11px] text-zinc-500">Cuántas personas hacen falta en cada una</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
          {tareas.map((tarea, i) => {
            const anotados = tenemos(tarea.id)
            const faltan = tarea.necesarios > 0 ? Math.max(0, tarea.necesarios - anotados) : 0
            return (
              <div key={tarea.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={tarea.etiqueta}
                    onChange={(e) => cambiar(i, { etiqueta: e.target.value })}
                    aria-label="Nombre de la tarea"
                    className="h-9 min-w-0 flex-1 border-zinc-700 bg-zinc-800 text-base text-white"
                  />
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                    className={BOTON_PASO}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === tareas.length - 1}
                    aria-label="Bajar"
                    className={BOTON_PASO}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTareas((lista) => lista.filter((_, j) => j !== i))}
                    aria-label={`Sacar ${tarea.etiqueta}`}
                    title={
                      anotados > 0
                        ? "La gente que la tiene la conserva; vuelve a aparecer sin cupo"
                        : "Sacar la tarea"
                    }
                    className={`${BOTON_PASO} text-red-400 hover:bg-red-400/10`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => cambiar(i, { necesarios: Math.max(0, tarea.necesarios - 1) })}
                      disabled={tarea.necesarios <= 0}
                      aria-label="Uno menos"
                      className={BOTON_PASO}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-base font-bold text-white" aria-live="polite">
                      {tarea.necesarios}
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiar(i, { necesarios: Math.min(200, tarea.necesarios + 1) })}
                      aria-label="Uno más"
                      className={BOTON_PASO}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="text-right text-[11px] leading-tight text-zinc-400">
                    {tarea.necesarios === 0 ? (
                      <>
                        Sin cupo · {anotados} anotado{anotados === 1 ? "" : "s"}
                      </>
                    ) : faltan > 0 ? (
                      <>
                        Tenemos {anotados} de {tarea.necesarios} ·{" "}
                        <span className="font-semibold text-amber-300">
                          {faltan === 1 ? "falta 1" : `faltan ${faltan}`}
                        </span>
                      </>
                    ) : (
                      <>
                        Tenemos {anotados} de {tarea.necesarios} ·{" "}
                        <span className="font-semibold text-emerald-300">cubierto</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            )
          })}

          <div className="flex gap-2 pt-1">
            <Input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  agregar()
                }
              }}
              placeholder="Nueva tarea (ej: Desayuno)"
              aria-label="Nueva tarea"
              className="border-zinc-700 bg-zinc-800 text-base text-white"
            />
            <Button
              type="button"
              variant="outline"
              onClick={agregar}
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Agregar
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-800 px-4 py-3 sm:flex-row-reverse">
          <Button
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 font-bold text-black hover:from-yellow-500 hover:to-yellow-700 sm:w-auto"
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {guardando ? "Guardando..." : "Guardar tareas"}
          </Button>
          <Button
            variant="outline"
            onClick={onCerrar}
            className="w-full border-zinc-700 text-zinc-300 hover:text-white sm:w-auto"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
