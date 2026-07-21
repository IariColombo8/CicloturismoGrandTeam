"use client"

import { useState } from "react"
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
  Clock,
  Eye,
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
  const [comprobanteVisible, setComprobanteVisible] = useState(false)

  if (!inscripcion) return null

  const comprobanteUrl =
    inscripcion.comprobantePagoUrl || inscripcion.comprobanteUrl || inscripcion.imagenBase64 || ""

  const getStatusBadge = (estado: string) => {
    if (estado === "confirmada") {
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-4 h-4 mr-1" /> Confirmada
        </Badge>
      )
    }
    if (estado === "rechazada") {
      return (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
          <XCircle className="w-4 h-4 mr-1" /> Rechazada
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
        <Clock className="w-4 h-4 mr-1" /> Pendiente
      </Badge>
    )
  }

  const close = () => {
    setComprobanteVisible(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Detalle de Inscripción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card className="border-2">
            <CardContent className="pt-6 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Estado actual</span>
              {getStatusBadge(inscripcion.estado)}
            </CardContent>
          </Card>

          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <User className="h-5 w-5" /> Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Nombre Completo</label>
                <p className="text-sm font-medium mt-1">
                  {inscripcion.nombreCompleto || `${inscripcion.nombres || inscripcion.nombre || ""} ${inscripcion.apellidos || inscripcion.apellido || ""}`.trim()}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">DNI/Cédula</label>
                <p className="text-sm mt-1">{inscripcion.dni || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Fecha de Nacimiento
                </label>
                <p className="text-sm mt-1">{inscripcion.fechaNacimiento || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Grupo de ciclistas</label>
                <p className="text-sm mt-1">{inscripcion.grupoCiclistas || "Sin grupo"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <Mail className="h-5 w-5" /> Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Email</label>
                <p className="text-sm mt-1 break-words">{inscripcion.email || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </label>
                <p className="text-sm mt-1">{inscripcion.telefono || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">País</label>
                <p className="text-sm mt-1">{inscripcion.pais || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Ciudad/Localidad
                </label>
                <p className="text-sm mt-1">{inscripcion.localidad || inscripcion.ciudad || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <Stethoscope className="h-5 w-5" /> Información de Salud
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Grupo Sanguíneo</label>
                <p className="text-sm mt-1 font-medium uppercase">{inscripcion.grupoSanguineo || inscripcion.tipoSangre || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Celíaco/a</label>
                <p className="text-sm mt-1">
                  {inscripcion.esCeliaco === true ? "Sí" : inscripcion.esCeliaco === false ? "No" : "-"}
                </p>
              </div>
              {inscripcion.condicionSalud && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500">Condiciones de Salud</label>
                  <p className="text-sm mt-1 bg-gray-50 p-3 rounded border whitespace-pre-wrap">{inscripcion.condicionSalud}</p>
                </div>
              )}
              {inscripcion.alergias && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500">Alergias</label>
                  <p className="text-sm mt-1 bg-amber-50 p-3 rounded border border-amber-200 whitespace-pre-wrap">{inscripcion.alergias}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Información de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Método de Pago</label>
                  <p className="text-sm mt-1 capitalize">{inscripcion.metodoPago?.replace("_", " ") || "-"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Nº de Referencia</label>
                  <p className="text-sm mt-1 font-mono">{inscripcion.numeroReferencia || "-"}</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                  <FileText className="h-3 w-3" /> Comprobante de Pago
                </label>
                {comprobanteUrl ? (
                  !comprobanteVisible ? (
                    <button
                      type="button"
                      onClick={() => setComprobanteVisible(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                    >
                      <Eye className="h-4 w-4" /> Ver comprobante
                    </button>
                  ) : comprobanteUrl.toLowerCase().includes(".pdf") ? (
                    <div className="space-y-2">
                      <iframe src={comprobanteUrl} title="Comprobante de pago" className="w-full h-96 rounded border" />
                      <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline">
                        Abrir PDF en una pestaña nueva
                      </a>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <img
                        src={comprobanteUrl}
                        alt="Comprobante"
                        className="max-h-80 mx-auto rounded shadow-md cursor-pointer"
                        onClick={() => window.open(comprobanteUrl, "_blank", "noopener,noreferrer")}
                      />
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-500">No hay comprobante cargado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={close}>Cerrar</Button>
          {inscripcion.estado === "pendiente" && (
            <>
              <Button
                variant="outline"
                className="border-red-500/50 text-red-600 hover:bg-red-50"
                onClick={() => {
                  onReject(inscripcion.id)
                  close()
                }}
              >
                <XCircle className="w-4 h-4 mr-2" /> Rechazar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  onApprove(inscripcion.id)
                  close()
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Inscripción
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
