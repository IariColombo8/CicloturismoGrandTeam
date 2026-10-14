"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ListaModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  items: string[]
}

/**
 * Lista de nombres en un modal.
 *
 * Las filas de inscripciones (quienes no pagaron, quienes pagaron otro monto)
 * mostraban los 16 nombres pegados dentro de la fila y no se podia leer nada:
 * ahora la fila dice la cantidad y el detalle se abre aca.
 */
export function ListaModal({ abierto, onCerrar, titulo, descripcion, items }: ListaModalProps) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="bg-gray-800 border-yellow-400/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">{titulo}</DialogTitle>
          {descripcion && <p className="text-xs text-gray-400">{descripcion}</p>}
        </DialogHeader>

        <ol className="max-h-[60vh] overflow-y-auto space-y-1.5 pr-1">
          {items.map((texto, i) => (
            <li
              key={`${i}-${texto}`}
              className="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2"
            >
              <span className="text-xs text-gray-500 w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
              <span className="text-sm text-white break-words">{texto}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
