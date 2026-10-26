"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Lock, Users } from "lucide-react"
import { etiquetaTarea, infoModo, inicialesDe, modoDeRol, type RolEvento, type TareaConCupo } from "@/lib/roles"

interface Props {
  rol: RolEvento
  /** Botones del panel (editar, borrar, fijar). En /roles no va ninguno. */
  acciones?: ReactNode
  /** Para mostrar el nombre que el equipo le puso a cada tarea. */
  catalogo?: TareaConCupo[]
}

/**
 * Una persona de la lista de roles. Es una tarjeta y no una fila de tabla a
 * proposito: esto se mira desde el celular el dia del evento, y una tabla de
 * seis columnas en 360 px no se lee.
 */
export default function TarjetaRol({ rol, acciones, catalogo }: Props) {
  const modo = infoModo(modoDeRol(rol))

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-xs font-bold text-yellow-400"
        >
          {inicialesDe(rol.nombre) || "?"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-bold text-white sm:text-base">{rol.nombre}</h3>
            <Badge className={`${modo.badge} text-[10px]`}>{modo.etiqueta}</Badge>
            {rol.bloqueado && (
              <span
                title="Lugar fijado por el equipo"
                className="inline-flex items-center gap-1 text-[10px] text-zinc-500"
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                fijado
              </span>
            )}
          </div>

          {rol.tareas.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {rol.tareas.map((tarea) => (
                <li
                  key={tarea}
                  className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  {etiquetaTarea(tarea, catalogo)}
                </li>
              ))}
            </ul>
          )}

          {rol.familiares > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-emerald-300/90">
              <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Lleva {rol.familiares} {rol.familiares === 1 ? "persona" : "personas"} para ayudar
                {rol.familiares_detalle ? `: ${rol.familiares_detalle}` : ""}
              </span>
            </p>
          )}

          {rol.notas && <p className="mt-2 text-xs text-zinc-400">{rol.notas}</p>}
        </div>

        {acciones && <div className="flex flex-shrink-0 items-center gap-1">{acciones}</div>}
      </div>
    </article>
  )
}
