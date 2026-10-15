"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight, ListChecks } from "lucide-react"
import type { CampoFaltante } from "@/lib/foco"

/**
 * Lo que falta para poder seguir, explicado.
 *
 * Antes esto era un cartelito que decía "Campos incompletos" y se iba a los
 * tres segundos: la persona quedaba mirando el formulario sin saber **qué**
 * faltaba ni **dónde** estaba. Acá se listan los datos que faltan con el mismo
 * nombre que tienen en pantalla, cada uno con una línea de ayuda, y tocando
 * cualquiera la pantalla la lleva hasta ese campo y lo marca.
 */

interface ModalFaltantesProps {
  faltantes: CampoFaltante[]
  abierto: boolean
  onCerrar: () => void
  /** Lleva a la persona al campo (lo marca y le da el foco). */
  onIrAlCampo: (id: string) => void
}

export default function ModalFaltantes({ faltantes, abierto, onCerrar, onIrAlCampo }: ModalFaltantesProps) {
  const uno = faltantes.length === 1

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      {/* Altura tope y scroll adentro: con nueve datos faltantes, en un celular
          la lista se iba de la pantalla y los botones quedaban fuera de
          alcance. */}
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col border-yellow-400/30 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left text-lg text-white">
            <ListChecks className="h-5 w-5 flex-shrink-0 text-yellow-400" aria-hidden="true" />
            {uno ? "Falta un dato para seguir" : `Faltan ${faltantes.length} datos para seguir`}
          </DialogTitle>
        </DialogHeader>

        <p className="flex-shrink-0 text-sm text-gray-400">
          {uno ? "Tocá el botón y te llevamos al campo." : "Tocá cualquiera y te llevamos hasta ese campo."}
        </p>

        <ul className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
          {faltantes.map((campo, i) => (
            <li key={campo.id}>
              <button
                type="button"
                onClick={() => onIrAlCampo(campo.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-left transition-colors hover:border-yellow-400/50 hover:bg-zinc-800"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-sm font-bold text-yellow-400"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{campo.etiqueta}</span>
                  <span className="block text-xs text-gray-400">{campo.ayuda}</span>
                </span>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-yellow-400" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-1 flex flex-shrink-0 flex-col gap-2 border-t border-zinc-800 pt-3 sm:flex-row-reverse">
          <Button
            type="button"
            onClick={() => faltantes[0] && onIrAlCampo(faltantes[0].id)}
            className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 font-bold text-black hover:brightness-110 sm:w-auto"
          >
            {uno ? "Ir al campo" : "Empezar por el primero"}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCerrar}
            className="w-full border-zinc-700 bg-transparent text-gray-300 hover:bg-zinc-800 hover:text-white sm:w-auto"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
