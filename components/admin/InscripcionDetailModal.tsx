"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Users,
  Stethoscope,
  FileText,
  CreditCard,
  Clock
} from "lucide-react"

interface InscripcionDetailModalProps {
  inscripcion: any
  isOpen: boolean
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export default function InscripcionDetailModal({
  inscripcion,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: InscripcionDetailModalProps) {
  if (!inscripcion) return null

  const getStatusBadge = (estado: string) => {
    const badges = {
      pendiente: (
        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
          <Clock className="w-4 h-4 mr-1" />
          Pendiente
        </Badge>
      ),
      confirmada: (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-4 h-4 mr-1" />
          Confirmada
        </Badge>
      ),
      rechazada: (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
          <XCircle className="w-4 h-4 mr-1" />
          Rechazada
        </Badge>
      )
    }
    return badges[estado] || badges.pendiente
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Detalle de Inscripción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Estado */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Estado actual</span>
                {getStatusBadge(inscripcion.estado)}
              </div>
            </CardContent>
          </Card>

          {/* Información Personal */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Nombre Completo</label>
                  <p className="text-sm font-medium mt-1">{inscripcion.nombreCompleto}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">DNI/Cédula</label>
                  <p className="text-sm mt-1">{inscripcion.dni || inscripcion.cedula || "-"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Fecha de Nacimiento
                  </label>
                  <p className="text-sm mt-1">{inscripcion.fechaNacimiento || "-"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Género</label>
                  <p className="text-sm mt-1 capitalize">{inscripcion.genero || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Contacto */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="text-sm mt-1 break-words">{inscripcion.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono
                  </label>
                  <p className="text-sm mt-1">{inscripcion.telefono}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Localidad
                  </label>
                  <p className="text-sm mt-1">{inscripcion.localidad || "-"}</p>
                </div>
                {inscripcion.telefonoEmergencia && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Tel. Emergencia</label>
                    <p className="text-sm mt-1">{inscripcion.telefonoEmergencia}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Evento */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Información del Evento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inscripcion.categoria && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Categoría</label>
                    <p className="text-sm mt-1 capitalize">{inscripcion.categoria}</p>
                  </div>
                )}
                {inscripcion.talleRemera && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Talle de Remera</label>
                    <p className="text-sm mt-1 uppercase">{inscripcion.talleRemera}</p>
                  </div>
                )}
                {inscripcion.grupoCiclistas && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Grupo de Ciclistas</label>
                    <p className="text-sm mt-1">{inscripcion.grupoCiclistas}</p>
                  </div>
                )}
                {inscripcion.recorrido && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Recorrido</label>
                    <p className="text-sm mt-1">{inscripcion.recorrido}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de Salud */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Información de Salud
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inscripcion.grupoSanguineo && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Grupo Sanguíneo</label>
                    <p className="text-sm mt-1 font-medium">{inscripcion.grupoSanguineo}</p>
                  </div>
                )}
                {inscripcion.tipoSangre && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Tipo de Sangre</label>
                    <p className="text-sm mt-1 font-medium">{inscripcion.tipoSangre}</p>
                  </div>
                )}
                {inscripcion.condicionSalud && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500">Condiciones de Salud</label>
                    <p className="text-sm mt-1 bg-gray-50 p-3 rounded border">
                      {inscripcion.condicionSalud}
                    </p>
                  </div>
                )}
                {inscripcion.alergias && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500">Alergias</label>
                    <p className="text-sm mt-1 bg-amber-50 p-3 rounded border border-amber-200">
                      {inscripcion.alergias}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de Pago */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Información de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inscripcion.metodoPago && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Método de Pago</label>
                    <p className="text-sm mt-1 capitalize">{inscripcion.metodoPago.replace("_", " ")}</p>
                  </div>
                )}
                {inscripcion.numeroReferencia && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Nº de Referencia</label>
                    <p className="text-sm mt-1 font-mono">{inscripcion.numeroReferencia}</p>
                  </div>
                )}
                {inscripcion.precio && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Precio</label>
                    <p className="text-sm mt-1 font-semibold text-green-600">{inscripcion.precio}</p>
                  </div>
                )}
              </div>

              {/* Comprobante */}
              {(inscripcion.comprobanteUrl || inscripcion.comprobantePagoUrl || inscripcion.imagenBase64) && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                    <FileText className="h-3 w-3" />
                    Comprobante de Pago
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <img
                      src={inscripcion.comprobanteUrl || inscripcion.comprobantePagoUrl || inscripcion.imagenBase64}
                      alt="Comprobante"
                      className="max-h-64 mx-auto rounded shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => window.open(inscripcion.comprobanteUrl || inscripcion.comprobantePagoUrl || inscripcion.imagenBase64, "_blank")}
                    />
                    <p className="text-xs text-center text-gray-500 mt-2">Click para ver en tamaño completo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas adicionales */}
          {inscripcion.nota && (
            <Card className="border-amber-200 shadow-sm bg-amber-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-amber-800">
                  Notas Administrativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{inscripcion.nota}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {inscripcion.estado === "pendiente" && (
            <>
              <Button
                variant="outline"
                className="border-red-500/50 text-red-600 hover:bg-red-50"
                onClick={() => {
                  onReject(inscripcion.id)
                  onClose()
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  onApprove(inscripcion.id)
                  onClose()
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Inscripción
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}