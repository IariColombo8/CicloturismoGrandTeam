"use client"

import { Bike, HandHeart, Users, UserCheck } from "lucide-react"
import type { ResumenRoles as Resumen } from "@/lib/roles"

interface Props {
  resumen: Resumen
  /** Las tareas que todavia no tienen a nadie solo le sirven al equipo. */
  mostrarFaltantes?: boolean
}

/**
 * Los numeros de arriba de la lista: cuanta gente hay, cuantos pedalean,
 * cuantos ayudan y cuantos vienen con familiares. Es lo primero que se mira
 * cuando hay que saber si los puestos estan cubiertos.
 */
export default function ResumenRoles({ resumen, mostrarFaltantes = false }: Props) {
  const tarjetas = [
    { icono: UserCheck, valor: resumen.total, etiqueta: "anotados", tono: "text-yellow-400" },
    { icono: Bike, valor: resumen.pedalean, etiqueta: "pedalean", tono: "text-sky-300" },
    { icono: HandHeart, valor: resumen.ayudan, etiqueta: "ayudan", tono: "text-emerald-300" },
    { icono: Users, valor: resumen.familiares, etiqueta: "familiares", tono: "text-zinc-300" },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tarjetas.map(({ icono: Icono, valor, etiqueta, tono }) => (
          <div
            key={etiqueta}
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4"
          >
            <Icono className={`h-5 w-5 ${tono}`} aria-hidden="true" />
            <div className="mt-1.5 text-xl font-black text-white sm:text-2xl">{valor}</div>
            <div className="text-[11px] text-zinc-400 sm:text-xs">{etiqueta}</div>
          </div>
        ))}
      </div>

      {resumen.familiares > 0 && (
        <p className="text-center text-[11px] text-zinc-500">
          Somos {resumen.conFamiliares} contando a los familiares que trae cada uno, y{" "}
          {resumen.soloAyudan} ayudan sin pedalear.
        </p>
      )}

      {resumen.porTarea.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Gente por tarea
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {resumen.porTarea.map((tarea) => (
              <li
                key={tarea.id}
                className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[11px] text-zinc-300"
              >
                {tarea.etiqueta}
                <span className="font-bold text-yellow-400">{tarea.cantidad}</span>
              </li>
            ))}
          </ul>

          {mostrarFaltantes && resumen.tareasSinGente.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Sin nadie todavía
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {resumen.tareasSinGente.map((tarea) => (
                  <li
                    key={tarea.id}
                    title={tarea.ayuda}
                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300"
                  >
                    {tarea.etiqueta}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
