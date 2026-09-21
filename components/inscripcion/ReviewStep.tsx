import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { User, Heart, Award, CreditCard, Shirt, AlertTriangle, ShieldAlert, ArrowDown } from "lucide-react"

interface ReviewStepProps {
  formData: any
  eventConfig: {
    costoInscripcion: number
    aliasTransferencia: string
    datosTransferencia: string
  }
  aceptaTerminos: boolean
  onAceptaTerminosChange: (value: boolean) => void
}

export default function ReviewStep({ formData, eventConfig, aceptaTerminos, onAceptaTerminosChange }: ReviewStepProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Al llegar al paso de revision, abrimos el deslinde automaticamente
  // y lo dejamos desplazado hasta el final para habilitar la aceptacion.
  useEffect(() => {
    if (!aceptaTerminos) setModalOpen(true)
  }, [aceptaTerminos])

  useEffect(() => {
    if (!modalOpen) return
    const timer = window.setTimeout(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
      setScrolledToEnd(true)
    }, 100)
    return () => window.clearTimeout(timer)
  }, [modalOpen])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const isAtEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 16
    if (isAtEnd) setScrolledToEnd(true)
  }

  const handleAceptarEnModal = () => {
    onAceptaTerminosChange(true)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-300">
          <strong className="text-yellow-400">Revisá tu información:</strong> asegurate de que todos los datos sean
          correctos antes de enviar tu inscripción.
        </p>
      </div>

      <Card className="bg-zinc-900 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-yellow-400" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Nombre Completo</p>
            <p className="text-white font-medium">{formData.nombre} {formData.apellido}</p>
          </div>
          <div>
            <p className="text-gray-400">DNI</p>
            <p className="text-white font-medium">{formData.dni}</p>
          </div>
          <div>
            <p className="text-gray-400">Email</p>
            <p className="text-white font-medium">{formData.email}</p>
          </div>
          <div>
            <p className="text-gray-400">Teléfono</p>
            <p className="text-white font-medium">{formData.telefono}</p>
          </div>
          <div>
            <p className="text-gray-400">Fecha de Nacimiento</p>
            <p className="text-white font-medium">{formData.fechaNacimiento}</p>
          </div>
          <div>
            <p className="text-gray-400">País</p>
            <p className="text-white font-medium">{formData.pais}</p>
          </div>
          <div>
            <p className="text-gray-400">Ciudad/Localidad</p>
            <p className="text-white font-medium">{formData.localidad}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Heart className="w-5 h-5 text-red-500" />
            Contacto de Emergencia
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Nombre</p>
            <p className="text-white font-medium">{formData.nombreEmergencia}</p>
          </div>
          <div>
            <p className="text-gray-400">Teléfono</p>
            <p className="text-white font-medium">{formData.telefonoEmergencia}</p>
          </div>
          {formData.relacionEmergencia && (
            <div>
              <p className="text-gray-400">Relación</p>
              <p className="text-white font-medium">{formData.relacionEmergencia}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-yellow-400" />
            Experiencia e Información Médica
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">¿Ha recorrido 50 km antes?</p>
            <Badge className={`mt-1 ${formData.haRecorridoDistancia === "si" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
              {formData.haRecorridoDistancia === "si" ? "Sí" : "No"}
            </Badge>
          </div>
          <div>
            <p className="text-gray-400">Grupo de ciclistas</p>
            <p className="text-white font-medium">{formData.grupoCiclistas}</p>
          </div>
          <div>
            <p className="text-gray-400">Grupo Sanguíneo</p>
            <p className="text-white font-medium uppercase">{formData.grupoSanguineo}</p>
          </div>
          <div>
            <p className="text-gray-400">¿Es celíaco/a?</p>
            <Badge className={`mt-1 ${formData.esCeliaco === "si" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
              {formData.esCeliaco === "si" ? "Sí" : "No"}
            </Badge>
          </div>
          <div>
            <p className="text-gray-400">¿Tiene alergias?</p>
            <Badge className={`mt-1 ${formData.tieneAlergias === "si" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
              {formData.tieneAlergias === "si" ? "Sí" : "No"}
            </Badge>
          </div>
          {formData.tieneAlergias === "si" && formData.alergias && (
            <div className="md:col-span-2">
              <p className="text-gray-400">Alergias</p>
              <p className="text-white font-medium">{formData.alergias}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400">¿Tiene problemas de salud?</p>
            <Badge className={`mt-1 ${formData.tieneProblemasSalud === "si" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
              {formData.tieneProblemasSalud === "si" ? "Sí" : "No"}
            </Badge>
          </div>
          {formData.tieneProblemasSalud === "si" && formData.condicionSalud && (
            <div className="md:col-span-2">
              <p className="text-gray-400">Condición de Salud</p>
              <p className="text-white font-medium">{formData.condicionSalud}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CreditCard className="w-5 h-5 text-green-500" />
            Información de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Método de Pago</p>
            <p className="text-white font-medium">Transferencia Bancaria</p>
          </div>
          <div>
            <p className="text-gray-400">Monto</p>
            <p className="text-yellow-400 font-bold text-lg">
              ${eventConfig.costoInscripcion.toLocaleString("es-AR")} ARS
            </p>
          </div>
          <div>
            <p className="text-gray-400">Nombre de quien transfirió</p>
            <p className="text-white font-medium">{formData.numeroReferencia}</p>
          </div>
          <div>
            <p className="text-gray-400">Comprobante</p>
            <p className="text-green-500 font-medium">{formData.comprobanteFile?.name || "Cargado"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-500/10 border border-blue-400/40 rounded-lg p-4 flex gap-3">
        <Shirt className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-200">
          <strong>No incluye la remera.</strong> Para pedir remera{" "}
          <a
            href="https://grand-team.vercel.app/pedir-remera"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-400 underline underline-offset-2 hover:text-blue-300"
          >
            clic aquí
          </a>.
        </p>
      </div>

      <div className="bg-red-500/15 border-2 border-red-500/60 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
        <p className="text-sm sm:text-base font-black text-red-200 uppercase">
          Una vez hecha la inscripción, no se reintegra el dinero.
        </p>
      </div>

      <Card className="bg-zinc-900 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            Deslinde de Responsabilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-300">
            Antes de enviar tu inscripción, leé y aceptá el deslinde de responsabilidad del evento.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalOpen(true)}
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
          >
            Leer Deslinde de Responsabilidad
          </Button>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="acepta-terminos"
              checked={aceptaTerminos}
              disabled={!scrolledToEnd}
              onCheckedChange={(checked) => onAceptaTerminosChange(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="acepta-terminos" className="text-sm text-gray-300 leading-snug">
              Declaro que leí y{" "}
              <strong className="text-white">acepto el deslinde de responsabilidad</strong> y los términos y
              condiciones de la inscripción.
              {!scrolledToEnd && (
                <span className="block text-xs text-yellow-400 mt-1">
                  Debes abrir y leer el deslinde completo para poder aceptarlo.
                </span>
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ShieldAlert className="w-5 h-5 text-yellow-400" />
              Deslinde de Responsabilidad
            </DialogTitle>
          </DialogHeader>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="max-h-[50vh] overflow-y-auto pr-2 text-sm text-gray-300 space-y-3 border border-zinc-700 rounded-lg p-4"
          >
            <p>
              Por medio del presente documento, declaro bajo mi exclusiva responsabilidad que me encuentro en
              buenas condiciones de salud, médicamente apto/a y adecuadamente entrenado/a para participar del
              evento de cicloturismo <strong>Grand Team Bike 2026</strong> organizado en Concepción del
              Uruguay, Entre Ríos.
            </p>
            <p>
              <strong className="text-yellow-400">Aptitud física:</strong> Confirmo que gozo de buena salud y
              que mi condición física es acorde a la exigencia de la actividad, no teniendo impedimento médico
              alguno para participar.
            </p>
            <p>
              <strong className="text-yellow-400">Asunción de riesgos:</strong> Reconozco que el ciclismo y las
              actividades de cicloturismo implican riesgos inherentes, incluyendo pero no limitados a caídas,
              lesiones físicas, accidentes de tránsito, condiciones climáticas adversas y daños materiales.
              Asumo voluntaria y libremente todos estos riesgos.
            </p>
            <p>
              <strong className="text-yellow-400">Liberación de responsabilidad:</strong> Por la presente,
              exonero y libero de toda responsabilidad civil, penal o de cualquier otra índole a los
              organizadores del evento, Grand Team Bike, sus colaboradores, voluntarios, auspiciantes,
              sponsors, propietarios de predios e instalaciones utilizadas, y a cualquier persona vinculada a
              la organización, por cualquier lesión, accidente, enfermedad, daño o pérdida de objetos
              personales que pudiera sufrir antes, durante o después del evento.
            </p>
            <p>
              <strong className="text-yellow-400">Derechos de imagen:</strong> Autorizo a los organizadores a
              utilizar fotografías y videos en los que pueda aparecer durante el evento, con fines de difusión,
              promoción y comunicación del mismo, sin derecho a compensación alguna.
            </p>
            <p>
              <strong className="text-yellow-400">Cumplimiento de normas:</strong> Me comprometo a respetar las
              normas de tránsito, las indicaciones de la organización y a utilizar los elementos de seguridad
              necesarios (casco obligatorio) durante toda la actividad.
            </p>
            <p>
              <strong className="text-yellow-400">Datos personales:</strong> Los datos e información médica
              provistos en la inscripción (grupo sanguíneo, alergias, condiciones de salud) son de carácter
              confidencial y serán utilizados exclusivamente en caso de emergencia durante el evento.
            </p>
            <p>
              <strong className="text-yellow-400">Política de reintegros:</strong> Entiendo y acepto que, una
              vez confirmada la inscripción y realizado el pago correspondiente, no corresponde reintegro del
              dinero abonado bajo ninguna circunstancia.
            </p>
            <p className="text-gray-400 italic">
              Al marcar la casilla de aceptación declaro haber leído, comprendido y aceptado en su totalidad el
              presente deslinde de responsabilidad.
            </p>
          </div>

          {!scrolledToEnd && (
            <p className="flex items-center gap-2 text-xs text-yellow-400 justify-center">
              <ArrowDown className="w-4 h-4 animate-bounce" />
              Desplazate hasta el final para poder aceptar
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={handleAceptarEnModal}
              disabled={!scrolledToEnd}
              className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Acepto el Deslinde de Responsabilidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
