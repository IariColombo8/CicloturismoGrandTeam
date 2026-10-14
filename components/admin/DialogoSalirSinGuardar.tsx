"use client"

import { AlertTriangle } from "lucide-react"

/**
 * Se muestra cuando se intenta cerrar un formulario con cambios sin guardar.
 * Tres salidas claras: seguir editando, dejarlo guardado para despues, o tirarlo.
 *
 * Va con z-[60] para quedar arriba de los modales (z-50), y se renderiza dentro
 * del modal que lo abre para no pelearse con el foco de Radix.
 */
export default function DialogoSalirSinGuardar({
  abierto,
  onSeguirEditando,
  onGuardarYSalir,
  onDescartar,
  titulo = "¿Salir de la edicion?",
  descripcion = "Tenes cambios sin guardar. Podes dejarlos guardados como borrador y completarlos despues.",
}: {
  abierto: boolean
  onSeguirEditando: () => void
  onGuardarYSalir: () => void
  onDescartar: () => void
  titulo?: string
  descripcion?: string
}) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onSeguirEditando} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-xl border border-yellow-400/30 bg-zinc-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
          {titulo}
        </h3>
        <p className="text-zinc-400 text-sm mt-2">{descripcion}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onGuardarYSalir}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-colors"
          >
            Guardar borrador y salir
          </button>
          <button
            type="button"
            onClick={onSeguirEditando}
            className="w-full px-4 py-2.5 rounded-lg text-sm text-zinc-200 border border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={onDescartar}
            className="w-full px-4 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            Descartar cambios
          </button>
        </div>
      </div>
    </div>
  )
}
