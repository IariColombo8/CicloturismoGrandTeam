"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { ChevronDown, Search, X } from "lucide-react"
import { claveTexto, nombreDeFila, type FilaParticipante } from "@/lib/sorteos"

interface Props {
  titulo: string
  ayuda: string
  participantes: FilaParticipante[]
  seleccionados: string[]
  onCambio: (ids: string[]) => void
  tono: "rojo" | "dorado"
}

const TONOS = {
  rojo: {
    chip: "border-red-500/50 bg-red-500/15 text-red-200",
    activo: "border-red-500/60 bg-red-500/20 text-red-100",
  },
  dorado: {
    chip: "border-yellow-400/50 bg-yellow-400/15 text-yellow-200",
    activo: "border-yellow-400/60 bg-yellow-400/20 text-yellow-100",
  },
}

/**
 * Buscador de inscriptos con marcado, para armar las listas de exclusion o la
 * lista cerrada de un sorteo.
 *
 * Arranca cerrado: son cientos de nombres y lo normal es excluir a unos pocos.
 */
export default function SelectorPersonas({
  titulo,
  ayuda,
  participantes,
  seleccionados,
  onCambio,
  tono,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const marcados = useMemo(() => new Set(seleccionados), [seleccionados])

  const ordenados = useMemo(
    () =>
      [...participantes]
        .map((fila) => ({ fila, nombre: nombreDeFila(fila) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [participantes],
  )

  const filtrados = useMemo(() => {
    const clave = claveTexto(busqueda)
    if (!clave) return ordenados.slice(0, 60)
    return ordenados
      .filter(
        ({ fila, nombre }) =>
          claveTexto(nombre).includes(clave) ||
          claveTexto(fila.grupo_ciclistas).includes(clave) ||
          claveTexto(fila.localidad).includes(clave),
      )
      .slice(0, 60)
  }, [ordenados, busqueda])

  const elegidos = useMemo(
    () => ordenados.filter(({ fila }) => marcados.has(fila.id)),
    [ordenados, marcados],
  )

  const alternar = (id: string) => {
    onCambio(marcados.has(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id])
  }

  const estilo = TONOS[tono]

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-200">
            {titulo}
            {seleccionados.length > 0 && (
              <span className="ml-2 rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-300">
                {seleccionados.length}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-zinc-500">{ayuda}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Los ya marcados se ven siempre, aunque este cerrado */}
      {elegidos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-zinc-800 px-3 py-2">
          {elegidos.map(({ fila, nombre }) => (
            <button
              key={fila.id}
              type="button"
              onClick={() => alternar(fila.id)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${estilo.chip}`}
            >
              {nombre}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {abierto && (
        <div className="space-y-2 border-t border-zinc-800 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, grupo o localidad"
              className="border-zinc-700 bg-zinc-950 pl-8 text-white"
            />
          </div>

          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {filtrados.length === 0 ? (
              <li className="py-3 text-center text-xs text-zinc-500">No hay nadie con ese nombre.</li>
            ) : (
              filtrados.map(({ fila, nombre }) => {
                const marcado = marcados.has(fila.id)
                return (
                  <li key={fila.id}>
                    <button
                      type="button"
                      onClick={() => alternar(fila.id)}
                      className={[
                        "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                        marcado
                          ? estilo.activo
                          : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-white/5",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        readOnly
                        tabIndex={-1}
                        className="h-3.5 w-3.5 accent-yellow-400"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{nombre}</span>
                      {fila.grupo_ciclistas && (
                        <span className="truncate text-[10px] text-zinc-500">{fila.grupo_ciclistas}</span>
                      )}
                      {!fila.checked_in && <span className="text-[10px] text-zinc-600">sin check-in</span>}
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          {!busqueda && ordenados.length > 60 && (
            <p className="text-center text-[10px] text-zinc-600">
              Se muestran los primeros 60 de {ordenados.length}. Usá el buscador.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
