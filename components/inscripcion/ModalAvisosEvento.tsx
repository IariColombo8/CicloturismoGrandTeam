"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, CloudRain, Medal, Tent } from "lucide-react"
import { EVENTO } from "@/lib/constants"
import { CIERRE_INSCRIPCIONES_AVISO } from "@/lib/inscripcion/cierre"
import { useMedallasRestantes } from "@/hooks/useMedallasRestantes"

/**
 * Lo que hay que saber antes de inscribirse, en una ventana que aparece apenas
 * se entra a /inscripcion: hasta cuando hay tiempo, que pasa si llueve, cuanto pagan los acompañantes y,
 * cuando ya no quedan, que no hay mas medallas.
 *
 * Aparece SIEMPRE al entrar (no se recuerda que ya se vio): es la forma de que
 * nadie diga despues que no sabia. Se cierra con "Entendido" o la cruz.
 */
export default function ModalAvisosEvento() {
  const [abierto, setAbierto] = useState(false)
  const { disponibles, hayDatos } = useMedallasRestantes()

  // Se abre en el cliente: con el modal en el HTML del servidor, el formulario
  // quedaria tapado hasta que hidrate el JavaScript.
  useEffect(() => {
    setAbierto(true)
  }, [])

  // Solo con el dato real: mientras la consulta no responde no se avisa nada.
  const sinMedallas = hayDatos && disponibles === 0
  const entrada = `$${EVENTO.entradaCampingAcompanante.toLocaleString("es-AR")}`

  const avisos = [
    {
      icono: Clock,
      titulo: "Cierre de inscripciones",
      texto: CIERRE_INSCRIPCIONES_AVISO,
    },
    {
      icono: CloudRain,
      titulo: "Si llueve, se suspende",
      texto: `El evento pasa al ${EVENTO.fechaSiLlueve}.`,
    },
    {
      icono: Tent,
      titulo: `Acompañantes: ${entrada}`,
      texto: `Quien venga a acompañar paga ${entrada} para entrar al camping.`,
    },
    ...(sinMedallas
      ? [
          {
            icono: Medal,
            titulo: "Ya no hay más medallas",
            texto: "Se entregaron todas. Podés inscribirte igual, pero tu inscripción no incluye medalla.",
          },
        ]
      : []),
  ]

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogContent className="max-w-md border-yellow-400/30 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-left text-xl text-white">Antes de inscribirte</DialogTitle>
          <DialogDescription className="text-left text-gray-400">
            Leé esto para que no haya sorpresas el día del evento.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {avisos.map((aviso) => {
            const Icono = aviso.icono
            return (
              <li
                key={aviso.titulo}
                className="flex items-start gap-3 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3"
              >
                <Icono className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-yellow-400">{aviso.titulo}</p>
                  <p className="mt-0.5 text-sm text-gray-200">{aviso.texto}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <Button
          type="button"
          onClick={() => setAbierto(false)}
          className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 font-bold text-black hover:brightness-110"
        >
          Entendido
        </Button>
      </DialogContent>
    </Dialog>
  )
}
