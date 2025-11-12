import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Heart, Award, CreditCard } from "lucide-react"

interface ReviewStepProps {
  formData: any
  eventConfig: {
    costoInscripcion: number
    aliasTransferencia: string
    datosTransferencia: string
  }
}

export default function ReviewStep({ formData, eventConfig }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-300">
          <strong className="text-yellow-400">Revisa tu información:</strong> Asegúrate de que todos los datos sean
          correctos antes de enviar tu inscripción.
        </p>
      </div>

      {/* Personal Information */}
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
            <p className="text-white font-medium">
              {formData.nombres} {formData.apellidos}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Cédula/DNI</p>
            <p className="text-white font-medium">{formData.cedula}</p>
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
            <p className="text-gray-400">Ciudad</p>
            <p className="text-white font-medium">{formData.ciudad}</p>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
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

      {/* Experience & Medical */}
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
            <Badge className={`mt-1 ${formData.haRecorridoDistancia === 'si' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
              {formData.haRecorridoDistancia === 'si' ? 'Sí' : 'No'}
            </Badge>
          </div>
          <div>
            <p className="text-gray-400">Talla de Camiseta</p>
            <p className="text-white font-medium uppercase">{formData.tallaCamiseta}</p>
          </div>
          <div>
            <p className="text-gray-400">Tipo de Sangre</p>
            <p className="text-white font-medium">{formData.tipoSangre}</p>
          </div>
          <div>
            <p className="text-gray-400">¿Tiene alergias?</p>
            <Badge className={`mt-1 ${formData.tieneAlergias === 'si' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {formData.tieneAlergias === 'si' ? 'Sí' : 'No'}
            </Badge>
          </div>
          {formData.tieneAlergias === 'si' && formData.alergias && (
            <div className="md:col-span-2">
              <p className="text-gray-400">Alergias</p>
              <p className="text-white font-medium">{formData.alergias}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400">¿Tiene problemas de salud?</p>
            <Badge className={`mt-1 ${formData.tieneProblemasSalud === 'si' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {formData.tieneProblemasSalud === 'si' ? 'Sí' : 'No'}
            </Badge>
          </div>
          {formData.tieneProblemasSalud === 'si' && formData.condicionesMedicas && (
            <div className="md:col-span-2">
              <p className="text-gray-400">Condiciones Médicas</p>
              <p className="text-white font-medium">{formData.condicionesMedicas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Information */}
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
              ${eventConfig.costoInscripcion.toLocaleString('es-AR')} ARS
            </p>
          </div>
          <div>
            <p className="text-gray-400">Número de Referencia</p>
            <p className="text-white font-medium">{formData.numeroReferencia}</p>
          </div>
          <div>
            <p className="text-gray-400">Comprobante</p>
            <p className="text-green-500 font-medium">{formData.comprobanteFile?.name || "Cargado"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}