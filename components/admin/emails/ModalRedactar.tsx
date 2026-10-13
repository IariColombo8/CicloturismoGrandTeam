"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Users } from "lucide-react"

export interface DatosRedaccion {
  para: string
  asunto: string
  mensaje: string
  conPlantilla: boolean
  individual: boolean
}

/**
 * Modal para redactar un email nuevo desde el panel.
 * Admite varios destinatarios separados por coma; con "uno por persona" se
 * manda un email individual a cada uno (nadie ve las otras direcciones).
 */
export default function ModalRedactar({
  abierto,
  onCerrar,
  onEnviar,
  destinatarioInicial = "",
}: {
  abierto: boolean
  onCerrar: () => void
  onEnviar: (datos: DatosRedaccion) => Promise<boolean>
  destinatarioInicial?: string
}) {
  const [para, setPara] = useState(destinatarioInicial)
  const [asunto, setAsunto] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [conPlantilla, setConPlantilla] = useState(true)
  const [individual, setIndividual] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const cantidadDestinatarios = para
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean).length

  const puedeEnviar = cantidadDestinatarios > 0 && asunto.trim() !== "" && mensaje.trim() !== ""

  const enviar = async () => {
    if (!puedeEnviar || enviando) return
    setEnviando(true)
    try {
      const ok = await onEnviar({ para, asunto, mensaje, conPlantilla, individual })
      if (ok) {
        setPara("")
        setAsunto("")
        setMensaje("")
        onCerrar()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !enviando && onCerrar()}>
      <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Redactar correo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="para" className="text-zinc-300">
              Para
            </Label>
            <Input
              id="para"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="alguien@mail.com, otro@mail.com"
              className="mt-1.5 border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
            />
            {cantidadDestinatarios > 1 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-yellow-400/80">
                <Users className="h-3.5 w-3.5" />
                {cantidadDestinatarios} destinatarios
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="asunto" className="text-zinc-300">
              Asunto
            </Label>
            <Input
              id="asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Novedades del evento"
              className="mt-1.5 border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
            />
          </div>

          <div>
            <Label htmlFor="mensaje" className="text-zinc-300">
              Mensaje
            </Label>
            <Textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={9}
              placeholder={"Escribi el mensaje.\n\nUna linea en blanco separa parrafos."}
              className="mt-1.5 resize-y border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={conPlantilla}
                onChange={(e) => setConPlantilla(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-yellow-400"
              />
              <span>
                Usar el diseño del evento
                <span className="block text-xs text-zinc-500">
                  Agrega logo, encabezado y pie de Grand Team Bike.
                </span>
              </span>
            </label>

            {cantidadDestinatarios > 1 && (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={individual}
                  onChange={(e) => setIndividual(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-yellow-400"
                />
                <span>
                  Un email por persona
                  <span className="block text-xs text-zinc-500">
                    Recomendado: cada uno recibe su copia y no ve las demas direcciones.
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCerrar}
            disabled={enviando}
            className="border-zinc-700 text-zinc-300 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={enviar}
            disabled={!puedeEnviar || enviando}
            className="bg-yellow-400 font-semibold text-black hover:bg-yellow-500"
          >
            {enviando ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
