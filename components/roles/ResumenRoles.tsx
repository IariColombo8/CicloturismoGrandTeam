"use client"

import type { ReactNode } from "react"
import { AlertCircle, Bike, CheckCircle2, HandHeart, Users, UserCheck } from "lucide-react"
import { textoFalta, type CupoTarea, type ResumenRoles as Resumen } from "@/lib/roles"

interface Props {
  resumen: Resumen
  /** Las tareas que todavia no tienen a nadie ni cupo solo le sirven al equipo. */
  mostrarFaltantes?: boolean
  /** Tocar una tarea filtra la lista por ella. */
  onElegirTarea?: (id: string) => void
}

const TITULO = "mb-2 text-xs font-semibold uppercase tracking-wider"

/**
 * Los numeros de arriba de la lista y como esta cada tarea. El orden es el de
 * la pregunta que se hace el equipo: primero donde falta gente ("Falta 1 de
 * Acreditación"), despues las tareas con gente pero sin cupo, y lo cubierto
 * abajo de todo.
 *
 * Pensado para el celular: filas de una columna con el numero grande a la
 * derecha, nada de tablas.
 */
export default function ResumenRoles({ resumen, mostrarFaltantes = false, onElegirTarea }: Props) {
  const tarjetas = [
    { icono: UserCheck, valor: resumen.total, etiqueta: "anotados", tono: "text-yellow-400" },
    { icono: Bike, valor: resumen.pedalean, etiqueta: "pedalean", tono: "text-sky-300" },
    { icono: HandHeart, valor: resumen.ayudan, etiqueta: "ayudan", tono: "text-emerald-300" },
    { icono: Users, valor: resumen.familiares, etiqueta: "familiares", tono: "text-zinc-300" },
  ]

  const faltan = resumen.cupos.filter((c) => c.estado === "falta")
  const sinCupo = resumen.cupos.filter((c) => c.estado === "sin-cupo")
  const vacias = resumen.cupos.filter((c) => c.estado === "vacia")
  const cubiertas = resumen.cupos.filter((c) => c.estado === "cubierta")
  const hayCupos = faltan.length + cubiertas.length > 0

  const elegir = (cupo: CupoTarea) => (onElegirTarea && cupo.tenemos > 0 ? () => onElegirTarea(cupo.id) : undefined)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {tarjetas.map(({ icono: Icono, valor, etiqueta, tono }) => (
          <div
            key={etiqueta}
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-2 py-2.5 text-center sm:p-4 sm:text-left"
          >
            <Icono className={`mx-auto h-4 w-4 sm:mx-0 sm:h-5 sm:w-5 ${tono}`} aria-hidden="true" />
            <div className="mt-1 text-lg font-black text-white sm:text-2xl">{valor}</div>
            <div className="text-[10px] text-zinc-400 sm:text-xs">{etiqueta}</div>
          </div>
        ))}
      </div>

      {resumen.familiares > 0 && (
        <p className="text-center text-[11px] text-zinc-500">
          Somos {resumen.conFamiliares} contando a los familiares que trae cada uno, y{" "}
          {resumen.soloAyudan} ayudan sin pedalear.
        </p>
      )}

      {/* Donde falta gente */}
      {faltan.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
          <h3 className={`${TITULO} flex items-center gap-1.5 text-amber-300`}>
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {resumen.faltanEnTotal === 1 ? "Falta 1 persona" : `Faltan ${resumen.faltanEnTotal} personas`}
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {faltan.map((cupo) => (
              <FilaCupo key={cupo.id} cupo={cupo} onClick={elegir(cupo)} />
            ))}
          </ul>
        </section>
      )}

      {hayCupos && faltan.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Están todas las tareas cubiertas
        </p>
      )}

      {/* Con gente pero sin cupo definido */}
      {sinCupo.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
          <h3 className={`${TITULO} text-zinc-400`}>{hayCupos ? "Otras tareas" : "Gente por tarea"}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {sinCupo.map((cupo) => (
              <Chip key={cupo.id} cupo={cupo} onClick={elegir(cupo)}>
                {cupo.etiqueta}
                <span className="font-bold text-yellow-400">{cupo.tenemos}</span>
              </Chip>
            ))}
          </ul>
        </section>
      )}

      {mostrarFaltantes && vacias.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
          <h3 className={`${TITULO} text-zinc-400`}>Sin nadie y sin cupo</h3>
          <ul className="flex flex-wrap gap-1.5">
            {vacias.map((cupo) => (
              <li
                key={cupo.id}
                title={cupo.ayuda}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-500"
              >
                {cupo.etiqueta}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lo cubierto, abajo de todo */}
      {cubiertas.length > 0 && (
        <section className="rounded-xl border border-emerald-500/20 bg-zinc-900/70 p-3 sm:p-4">
          <h3 className={`${TITULO} flex items-center gap-1.5 text-emerald-300/80`}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Cubierto
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {cubiertas.map((cupo) => (
              <Chip key={cupo.id} cupo={cupo} onClick={elegir(cupo)} tono="verde">
                {cupo.etiqueta}
                <span className="font-bold">
                  {cupo.tenemos}/{cupo.necesarios}
                </span>
              </Chip>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Una tarea a la que le falta gente: el texto que se lee y cuanto va. */
function FilaCupo({ cupo, onClick }: { cupo: CupoTarea; onClick?: () => void }) {
  const avance = cupo.necesarios > 0 ? Math.min(1, cupo.tenemos / cupo.necesarios) : 0
  const contenido = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-white">{textoFalta(cupo)}</span>
        <span className="flex-shrink-0 text-[11px] text-zinc-400">
          {cupo.tenemos} de {cupo.necesarios}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${avance * 100}%` }} />
      </div>
      {cupo.ayuda && <p className="mt-1 text-[11px] text-zinc-500">{cupo.ayuda}</p>}
    </>
  )

  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5 text-left transition-colors hover:border-amber-500/40"
        >
          {contenido}
        </button>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5">{contenido}</div>
      )}
    </li>
  )
}

function Chip({
  cupo,
  onClick,
  tono = "neutro",
  children,
}: {
  cupo: CupoTarea
  onClick?: () => void
  tono?: "neutro" | "verde"
  children: ReactNode
}) {
  const clase = `flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
    tono === "verde"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
  }`
  return (
    <li title={cupo.ayuda}>
      {onClick ? (
        <button type="button" onClick={onClick} className={`${clase} hover:border-yellow-400/40`}>
          {children}
        </button>
      ) : (
        <span className={clase}>{children}</span>
      )}
    </li>
  )
}
