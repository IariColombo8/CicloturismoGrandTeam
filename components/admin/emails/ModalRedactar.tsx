"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Users } from "lucide-react"
import { claveBorrador, useBorradorFormulario } from "@/hooks/useBorradorFormulario"
import BannerBorrador from "@/components/admin/BannerBorrador"
import DialogoSalirSinGuardar from "@/components/admin/DialogoSalirSinGuardar"

interface BorradorCorreo {
  para: string
  asunto: string
  mensaje: string
  conPlantilla: boolean
  individual: boolean
}

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
  const [confirmarSalida, setConfirmarSalida] = useState(false)

  const cantidadDestinatarios = para
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean).length

  const puedeEnviar = cantidadDestinatarios > 0 && asunto.trim() !== "" && mensaje.trim() !== ""

  // Un correo a medio escribir no se tira: queda guardado hasta enviarlo o descartarlo.
  const datosBorrador = useMemo<BorradorCorreo>(
    () => ({ para, asunto, mensaje, conPlantilla, individual }),
    [para, asunto, mensaje, conPlantilla, individual],
  )
  const hayCambios =
    abierto && (para.trim() !== destinatarioInicial.trim() || asunto.trim() !== "" || mensaje.trim() !== "")

  const { borrador, guardarAhora, descartarBorrador, ocultarAviso } =
    useBorradorFormulario<BorradorCorreo>({
      clave: abierto ? claveBorrador("email", "redactar") : null,
      datos: abierto ? datosBorrador : null,
      hayCambios,
    })

  const limpiar = () => {
    setPara("")
    setAsunto("")
    setMensaje("")
  }

  const enviar = async () => {
    if (!puedeEnviar || enviando) return
    setEnviando(true)
    try {
      const ok = await onEnviar({ para, asunto, mensaje, conPlantilla, individual })
      if (ok) {
        descartarBorrador()
        limpiar()
        onCerrar()
      }
    } finally {
      setEnviando(false)
    }
  }

  const intentarCerrar = () => {
    if (enviando) return
    if (hayCambios) {
      setConfirmarSalida(true)
      return
    }
    onCerrar()
  }

  const retomarBorrador = () => {
    if (!borrador) return
    setPara(borrador.datos.para)
    setAsunto(borrador.datos.asunto)
    setMensaje(borrador.datos.mensaje)
    setConPlantilla(borrador.datos.conPlantilla)
    setIndividual(borrador.datos.individual)
    ocultarAviso()
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && intentarCerrar()}>
      <DialogContent
        className="max-w-2xl border-zinc-800 bg-zinc-950 text-white"
        onEscapeKeyDown={(e) => {
          // El cierre pasa siempre por el aviso de cambios sin guardar.
          e.preventDefault()
          intentarCerrar()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Redactar correo</DialogTitle>
        </DialogHeader>

        {borrador && (
          <BannerBorrador
            guardadoEn={borrador.guardadoEn}
            onRetomar={retomarBorrador}
            onDescartar={descartarBorrador}
            titulo="Tenias un correo a medio escribir"
          />
        )}

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
            onClick={intentarCerrar}
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

        <DialogoSalirSinGuardar
          abierto={confirmarSalida}
          onSeguirEditando={() => setConfirmarSalida(false)}
          onGuardarYSalir={() => {
            guardarAhora()
            limpiar()
            setConfirmarSalida(false)
            onCerrar()
          }}
          onDescartar={() => {
            descartarBorrador()
            limpiar()
            setConfirmarSalida(false)
            onCerrar()
          }}
          titulo="¿Cerrar el correo?"
          descripcion="Tenes un correo a medio escribir. Podes guardarlo como borrador y terminarlo despues."
        />
      </DialogContent>
    </Dialog>
  )
}
