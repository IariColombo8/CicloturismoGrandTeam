"use client"

import { RotateCcw } from "lucide-react"

/** "hoy 14:32" / "12 de octubre 14:32", para que se entienda de un vistazo. */
export function fechaBorrador(guardadoEn: number): string {
  const fecha = new Date(guardadoEn)
  const hora = fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  const hoy = new Date()
  const esHoy =
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  if (esHoy) return `hoy ${hora}`
  return `${fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} ${hora}`
}

/**
 * Cartel que aparece al abrir un formulario que habia quedado a medio cargar.
 * Mismo criterio que la inscripcion publica: no restauramos solos, decide la persona.
 */
export default function BannerBorrador({
  guardadoEn,
  onRetomar,
  onDescartar,
  titulo = "Quedo algo sin guardar",
}: {
  guardadoEn: number
  onRetomar: () => void
  onDescartar: () => void
  titulo?: string
}) {
  return (
    <div className="mb-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-yellow-400 font-semibold text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {titulo}
        </p>
        <p className="text-gray-400 text-xs mt-1">Guardado {fechaBorrador(guardadoEn)}</p>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onDescartar}
          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs sm:text-sm text-gray-300 hover:text-white border border-zinc-700 hover:bg-zinc-800 transition-colors"
        >
          Empezar de cero
        </button>
        <button
          type="button"
          onClick={onRetomar}
          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-500 transition-colors"
        >
          Retomar
        </button>
      </div>
    </div>
  )
}
