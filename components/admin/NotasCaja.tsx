"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, StickyNote, Trash2, Check, RotateCcw } from "lucide-react"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import {
  agregarNotaCaja,
  borrarNotaCaja,
  listarNotasCaja,
  marcarNotaCaja,
  type NotaCaja,
} from "@/lib/notasCaja"

interface NotasCajaProps {
  /**
   * Notas ya cargadas por la pantalla. Si no se pasan, el componente las carga
   * solo (asi sirve igual en inscripciones, que no tiene el hook de finanzas).
   */
  notas?: NotaCaja[]
  /** Se llama despues de cada cambio, para que la pantalla recargue sus datos. */
  onCambio?: () => void | Promise<void>
  /** En false solo muestra las notas, sin poder editarlas. */
  puedeEditar?: boolean
  /** Texto de ayuda bajo el titulo. */
  descripcion?: string
}

/**
 * Notas de caja: observaciones sobre la plata que no son un gasto ni un ingreso
 * formal ("pagaron $700 uruguayos y falta la transferencia de Lore").
 *
 * Se cargan desde el registro de inscripciones, que es donde se ven los pagos
 * raros, y se leen tambien en finanzas y en el PDF.
 */
export default function NotasCaja({
  notas: notasExternas,
  onCambio,
  puedeEditar = true,
  descripcion = "Lo que no entra en gastos ni ingresos: pagos en otra moneda, transferencias que faltan, acuerdos de palabra.",
}: NotasCajaProps) {
  const { user } = useSupabaseContext()
  const controlado = notasExternas !== undefined

  const [internas, setInternas] = useState<NotaCaja[]>([])
  const [texto, setTexto] = useState("")
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notas = controlado ? (notasExternas as NotaCaja[]) : internas

  const cargar = useCallback(async () => {
    try {
      setInternas(await listarNotasCaja())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las notas.")
    }
  }, [])

  useEffect(() => {
    if (!controlado) cargar()
  }, [controlado, cargar])

  /** Refresca lo que haga falta despues de un cambio. */
  const refrescar = useCallback(async () => {
    if (!controlado) await cargar()
    await onCambio?.()
  }, [controlado, cargar, onCambio])

  const agregar = async () => {
    if (!texto.trim() || trabajando) return

    setTrabajando(true)
    setError(null)
    try {
      await agregarNotaCaja(texto, user?.email ?? null)
      setTexto("")
      await refrescar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la nota.")
    } finally {
      setTrabajando(false)
    }
  }

  const alternar = async (nota: NotaCaja) => {
    setTrabajando(true)
    setError(null)
    try {
      await marcarNotaCaja(nota.id, !nota.resuelta)
      await refrescar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la nota.")
    } finally {
      setTrabajando(false)
    }
  }

  const borrar = async (nota: NotaCaja) => {
    if (!window.confirm(`¿Borrar la nota "${nota.texto}"?`)) return

    setTrabajando(true)
    setError(null)
    try {
      await borrarNotaCaja(nota.id)
      await refrescar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar la nota.")
    } finally {
      setTrabajando(false)
    }
  }

  const pendientes = notas.filter((n) => !n.resuelta)

  return (
    <div className="bg-zinc-900/80 border border-yellow-400/20 rounded-lg p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            Notas de caja
            {pendientes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold">
                {pendientes.length}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
        </div>
      </div>

      {puedeEditar && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") agregar()
            }}
            maxLength={300}
            placeholder="Ej: Pagaron $700 uruguayos y falta la transferencia de Lore"
            className="flex-1 px-3 py-2 bg-zinc-800 border border-yellow-400/20 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400/40"
          />
          <button
            type="button"
            onClick={agregar}
            disabled={trabajando || !texto.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold text-sm hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {trabajando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {notas.length === 0 ? (
        <p className="text-xs text-gray-500">No hay notas cargadas.</p>
      ) : (
        <ul className="space-y-1.5">
          {notas.map((nota) => (
            <li
              key={nota.id}
              className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 ${
                nota.resuelta
                  ? "border-zinc-700 bg-zinc-800/30"
                  : "border-yellow-400/20 bg-zinc-800/60"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`text-sm break-words ${
                    nota.resuelta ? "text-gray-500 line-through" : "text-white"
                  }`}
                >
                  {nota.texto}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(nota.creadaEn).toLocaleDateString("es-AR")}
                  {nota.creadaPor ? ` · ${nota.creadaPor}` : ""}
                  {nota.resuelta ? " · resuelta" : ""}
                </p>
              </div>

              {puedeEditar && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => alternar(nota)}
                    disabled={trabajando}
                    title={nota.resuelta ? "Marcar como pendiente" : "Marcar como resuelta"}
                    className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-white transition-all disabled:opacity-50"
                  >
                    {nota.resuelta ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(nota)}
                    disabled={trabajando}
                    title="Borrar la nota"
                    className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-red-400 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
