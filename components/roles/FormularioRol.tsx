"use client"

import { useId, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, Minus, Plus, Users } from "lucide-react"
import {
  MODOS,
  TAREAS,
  banderasDeModo,
  etiquetaTarea,
  normalizarNombre,
  type CupoTarea,
  type DatosRol,
  type ModoRol,
  type TareaConCupo,
} from "@/lib/roles"

/** Lo que el formulario tiene en pantalla (el modo es una sola pregunta). */
export interface ValoresRol {
  nombre: string
  modo: ModoRol
  tareas: string[]
  familiares: number
  familiares_detalle: string
  notas: string
  participante_id: string | null
}

export const VALORES_VACIOS: ValoresRol = {
  nombre: "",
  modo: "pedalea",
  tareas: [],
  familiares: 0,
  familiares_detalle: "",
  notas: "",
  participante_id: null,
}

/** Lo que se manda a guardar. */
export function datosDeValores(valores: ValoresRol): DatosRol {
  const { pedalea, ayuda } = banderasDeModo(valores.modo)
  return {
    nombre: valores.nombre,
    pedalea,
    ayuda,
    tareas: valores.tareas,
    familiares: valores.familiares,
    familiares_detalle: valores.familiares_detalle,
    notas: valores.notas,
    participante_id: valores.participante_id,
  }
}

interface Props {
  valores: ValoresRol
  onChange: (valores: ValoresRol) => void
  /** En el panel se puede elegir un inscripto de la lista. */
  inscriptos?: { id: string; nombre: string }[]
  /**
   * Nombres que ya estan en la lista: se avisa antes de guardar, asi nadie
   * descubre despues que piso lo que habia cargado otro.
   */
  nombresExistentes?: string[]
  /**
   * Las tareas para elegir: el catalogo del equipo mas las que alguien ya
   * escribio a mano. Sin esto se ofrece la lista de siempre.
   */
  tareas?: TareaConCupo[]
  /** Como esta cada tarea, para avisar en el chip cuantos faltan. */
  cupos?: CupoTarea[]
}

/**
 * Formulario de un rol del dia del evento. Es el mismo en /roles (cualquiera
 * se suma) y en /admin/roles (el equipo carga y corrige), para que las dos
 * pantallas pregunten exactamente lo mismo.
 *
 * Pensado para el celular: todo de un toque (botones grandes, nada de selects
 * anidados) y una sola columna hasta sm.
 */
export default function FormularioRol({ valores, onChange, inscriptos, nombresExistentes, tareas, cupos }: Props) {
  const idNombre = useId()
  const idLista = useId()

  const set = <K extends keyof ValoresRol>(campo: K, valor: ValoresRol[K]) =>
    onChange({ ...valores, [campo]: valor })

  const alternarTarea = (id: string) =>
    set(
      "tareas",
      valores.tareas.includes(id) ? valores.tareas.filter((t) => t !== id) : [...valores.tareas, id],
    )

  const opciones = useMemo(() => tareas ?? TAREAS.map((t) => ({ ...t, necesarios: 0 })), [tareas])
  // Tareas de la ficha que no estan en las opciones (recien escritas a mano):
  // se muestran igual, para poder sacarlas con un toque.
  const tareasLibres = useMemo(
    () => valores.tareas.filter((t) => !opciones.some((o) => o.id === t)),
    [valores.tareas, opciones],
  )
  const faltanDe = (id: string) => cupos?.find((c) => c.id === id)?.faltan ?? 0

  const repetido = useMemo(() => {
    const clave = normalizarNombre(valores.nombre)
    if (!clave) return false
    return (nombresExistentes ?? []).some((n) => normalizarNombre(n) === clave)
  }, [valores.nombre, nombresExistentes])

  return (
    <div className="space-y-5">
      {/* Nombre */}
      <div>
        <Label htmlFor={idNombre} className="text-zinc-300 text-xs">
          Nombre y apellido
        </Label>
        <Input
          id={idNombre}
          value={valores.nombre}
          list={inscriptos?.length ? idLista : undefined}
          onChange={(e) => {
            const nombre = e.target.value
            // Si el nombre coincide con un inscripto, queda vinculado a su ficha.
            const inscripto = inscriptos?.find((i) => normalizarNombre(i.nombre) === normalizarNombre(nombre))
            onChange({ ...valores, nombre, participante_id: inscripto?.id ?? null })
          }}
          placeholder="Ej: Jose Perez"
          autoComplete="name"
          className="bg-zinc-800 border-zinc-700 text-white text-base"
        />
        {inscriptos?.length ? (
          <datalist id={idLista}>
            {inscriptos.map((i) => (
              <option key={i.id} value={i.nombre} />
            ))}
          </datalist>
        ) : null}
        {repetido && (
          <p className="text-amber-300/90 text-[11px] mt-1.5">
            Ya hay alguien con ese nombre en la lista: al guardar se actualiza esa misma ficha.
          </p>
        )}
        {valores.participante_id && (
          <p className="text-emerald-300/90 text-[11px] mt-1.5">Está inscripto al evento.</p>
        )}
      </div>

      {/* Pedalea / ayuda */}
      <div>
        <Label className="text-zinc-300 text-xs block mb-2">¿Qué hacés el día del evento?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODOS.map((m) => {
            const activo = valores.modo === m.modo
            return (
              <button
                key={m.modo}
                type="button"
                onClick={() => set("modo", m.modo)}
                aria-pressed={activo}
                className={[
                  "text-left rounded-lg border px-3 py-2.5 transition-colors",
                  activo
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-600",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex items-center gap-2 text-sm font-semibold",
                    activo ? "text-yellow-400" : "text-white",
                  ].join(" ")}
                >
                  {activo && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                  {m.etiqueta}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">{m.ayuda}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tareas */}
      <div>
        <Label className="text-zinc-300 text-xs block mb-1">¿En qué das una mano?</Label>
        <p className="text-zinc-500 text-[11px] mb-2">
          Tocá todas las que correspondan. Si no sabés todavía, dejalo vacío.
        </p>
        <div className="flex flex-wrap gap-2">
          {opciones.map((tarea) => {
            const activa = valores.tareas.includes(tarea.id)
            const faltan = faltanDe(tarea.id)
            return (
              <button
                key={tarea.id}
                type="button"
                onClick={() => alternarTarea(tarea.id)}
                aria-pressed={activa}
                title={tarea.ayuda}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activa
                    ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600",
                ].join(" ")}
              >
                {tarea.etiqueta}
                {/* aria-hidden: el nombre del boton sigue siendo el de la tarea */}
                {faltan > 0 && !activa && (
                  <span aria-hidden="true" className="ml-1.5 text-[10px] font-semibold text-amber-300">
                    {faltan === 1 ? "falta 1" : `faltan ${faltan}`}
                  </span>
                )}
              </button>
            )
          })}
          {tareasLibres.map((libre) => (
            <button
              key={libre}
              type="button"
              onClick={() => alternarTarea(libre)}
              className="rounded-full border border-yellow-400 bg-yellow-400/15 px-3 py-1.5 text-xs font-medium text-yellow-300"
              title="Tocar para quitarla"
            >
              {etiquetaTarea(libre, opciones)}
            </button>
          ))}
        </div>
      </div>

      {/* Familiares */}
      <div>
        <Label className="text-zinc-300 text-xs block mb-1">¿Llevás familiares para ayudar?</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 p-1">
            <button
              type="button"
              onClick={() => set("familiares", Math.max(0, valores.familiares - 1))}
              aria-label="Uno menos"
              className="h-9 w-9 grid place-items-center rounded-md text-zinc-300 hover:bg-white/5 active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="w-10 text-center text-white font-bold text-base" aria-live="polite">
              {valores.familiares}
            </span>
            <button
              type="button"
              onClick={() => set("familiares", Math.min(20, valores.familiares + 1))}
              aria-label="Uno más"
              className="h-9 w-9 grid place-items-center rounded-md text-zinc-300 hover:bg-white/5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            {valores.familiares === 0
              ? "Voy solo"
              : `${valores.familiares} persona${valores.familiares === 1 ? "" : "s"} más`}
          </span>
        </div>

        {valores.familiares > 0 && (
          <Input
            value={valores.familiares_detalle}
            onChange={(e) => set("familiares_detalle", e.target.value)}
            placeholder="Quiénes y en qué ayudan (ej: mi hermano con la camioneta)"
            className="mt-2 bg-zinc-800 border-zinc-700 text-white text-base"
          />
        )}
      </div>

      {/* Detalles */}
      <div>
        <Label className="text-zinc-300 text-xs">Algo más que tengamos que saber</Label>
        <Textarea
          value={valores.notas}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Ej: llego 7:30, me quedo hasta el sorteo, llevo el inflador"
          rows={3}
          className="bg-zinc-800 border-zinc-700 text-white text-base"
        />
        <p className="text-zinc-600 text-[11px] mt-1">
          Esta lista la ve cualquiera que entre a la página: no pongas teléfonos ni datos privados.
        </p>
      </div>
    </div>
  )
}
