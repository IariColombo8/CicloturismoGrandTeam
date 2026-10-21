"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Clock, QrCode } from "lucide-react"

/**
 * "Ya estás inscripta": lo que ve alguien que pone su DNI en el formulario
 * cuando ya tiene su inscripción cargada en esta edición.
 *
 * No tiene sentido que vuelva a llenar los cuatro pasos (y el alta es un
 * UPSERT por DNI: cargar de nuevo pisaría lo que el equipo ya revisó). Así que
 * se le dice cómo está su inscripción y se la lleva a /mi-qr, que es donde
 * puede ver el estado y descargar el código.
 *
 * Tampoco se le muestran sus propios datos acá: el servidor ni siquiera los
 * manda, así que nadie puede ver los datos de otra persona escribiendo un DNI.
 */

const SEGUNDOS_PARA_IR = 6

interface ModalYaInscriptoProps {
  abierto: boolean
  /** Nombre de pila, para saludar. */
  nombre: string
  /** Estado de la inscripción, tal como está en la base. */
  estado: string
  dni: string
  /** Para quien está inscribiendo a otra persona: limpia y sigue. */
  onInscribirOtro: () => void
}

export default function ModalYaInscripto({
  abierto,
  nombre,
  estado,
  dni,
  onInscribirOtro,
}: ModalYaInscriptoProps) {
  const [restan, setRestan] = useState(SEGUNDOS_PARA_IR)

  const confirmada = ["confirmada", "aprobado", "aprobada"].includes(estado.toLowerCase())
  const destino = `/mi-qr?dni=${encodeURIComponent(dni)}`

  const irAhora = () => window.location.assign(destino)

  // Cuenta regresiva: si no toca nada, se la lleva igual. Se corta apenas la
  // persona elige otra cosa (el modal se desmonta).
  useEffect(() => {
    if (!abierto) {
      setRestan(SEGUNDOS_PARA_IR)
      return
    }

    const tic = window.setInterval(() => {
      setRestan((quedan) => Math.max(quedan - 1, 0))
    }, 1_000)

    return () => window.clearInterval(tic)
  }, [abierto])

  // La navegacion va aca y no dentro del setRestan: React puede ejecutar esa
  // funcion dos veces (en desarrollo lo hace siempre) y la segunda navegacion
  // cancelaba la primera (net::ERR_ABORTED).
  useEffect(() => {
    if (abierto && restan === 0) window.location.assign(destino)
  }, [abierto, restan, destino])

  return (
    <Dialog open={abierto}>
      <DialogContent
        className="max-w-md border-yellow-400/30 bg-zinc-900 text-white [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-left text-xl text-white">
            {nombre ? `${nombre}, ya estás inscripto/a` : "Ya estás inscripto/a"}
          </DialogTitle>
        </DialogHeader>

        <div
          className={`flex items-start gap-3 rounded-lg border p-3 ${
            confirmada ? "border-green-500/40 bg-green-500/10" : "border-yellow-400/40 bg-yellow-400/10"
          }`}
        >
          {confirmada ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" aria-hidden="true" />
          ) : (
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-bold ${confirmada ? "text-green-400" : "text-yellow-400"}`}>
              {confirmada ? "Tu inscripción está confirmada" : "Tu inscripción está pendiente de aprobación"}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {confirmada
                ? "Ya tenés tu lugar y tu código QR para el día del evento."
                : "El equipo está revisando tu pago. Cuando la aprueben te llega un correo con tu código QR."}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          No hace falta que cargues nada de nuevo. Te llevamos a tu inscripción
          {restan > 0 ? ` en ${restan}…` : "…"}
        </p>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={irAhora}
            className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 font-bold text-black hover:brightness-110"
          >
            <QrCode className="mr-1 h-4 w-4" aria-hidden="true" />
            Ver mi inscripción y mi QR
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onInscribirOtro}
            className="w-full border-zinc-700 bg-transparent text-gray-300 hover:bg-zinc-800 hover:text-white"
          >
            Inscribir a otra persona
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
