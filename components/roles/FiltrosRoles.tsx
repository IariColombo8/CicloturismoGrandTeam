"use client"

import { Input } from "@/components/ui/input"
import { Search, Users } from "lucide-react"
import { MODOS, TAREAS, type FiltroRoles, type ModoRol } from "@/lib/roles"

interface Props {
  filtro: FiltroRoles
  onChange: (filtro: FiltroRoles) => void
  /** Tareas que tienen al menos una persona: no se ofrece filtrar por vacias. */
  tareasConGente: string[]
}

const CHIP = "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
const CHIP_ON = "border-yellow-400 bg-yellow-400/15 text-yellow-300"
const CHIP_OFF = "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600"

/**
 * Buscador y filtros de la lista. Los chips van en una fila que se desliza con
 * el dedo (`overflow-x-auto`) en vez de envolverse en cuatro renglones: en el
 * celular la lista tiene que quedar a la vista sin scrollear media pantalla.
 */
export default function FiltrosRoles({ filtro, onChange, tareasConGente }: Props) {
  const modo = filtro.modo ?? "todos"
  const tarea = filtro.tarea ?? "todas"
  const tareas = TAREAS.filter((t) => tareasConGente.includes(t.id))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
        />
        <Input
          value={filtro.texto ?? ""}
          onChange={(e) => onChange({ ...filtro, texto: e.target.value })}
          placeholder="Buscar un nombre o una tarea..."
          aria-label="Buscar en la lista de roles"
          className="bg-zinc-900 border-zinc-700 pl-9 text-base text-white"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => onChange({ ...filtro, modo: "todos" })}
          className={`${CHIP} ${modo === "todos" ? CHIP_ON : CHIP_OFF}`}
        >
          Todos
        </button>
        {MODOS.map((m) => (
          <button
            key={m.modo}
            type="button"
            onClick={() => onChange({ ...filtro, modo: m.modo as ModoRol })}
            className={`${CHIP} ${modo === m.modo ? CHIP_ON : CHIP_OFF}`}
          >
            {m.etiqueta}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...filtro, conFamiliares: !filtro.conFamiliares })}
          className={`${CHIP} flex items-center gap-1.5 ${filtro.conFamiliares ? CHIP_ON : CHIP_OFF}`}
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Con familiares
        </button>
      </div>

      {tareas.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => onChange({ ...filtro, tarea: "todas" })}
            className={`${CHIP} ${tarea === "todas" ? CHIP_ON : CHIP_OFF}`}
          >
            Todas las tareas
          </button>
          {tareas.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ ...filtro, tarea: t.id })}
              className={`${CHIP} ${tarea === t.id ? CHIP_ON : CHIP_OFF}`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
