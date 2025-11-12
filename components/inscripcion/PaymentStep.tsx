"use client"

import type React from "react"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileCheck, DollarSign } from "lucide-react"

interface PaymentStepProps {
  formData: any
  updateFormData: (data: any) => void
  eventConfig: {
    costoInscripcion: number
    aliasTransferencia: string
    datosTransferencia: string
  }
}

export default function PaymentStep({ formData, updateFormData, eventConfig }: PaymentStepProps) {
  const [fileName, setFileName] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateFormData({ comprobanteFile: file })
      setFileName(file.name)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Amount */}
      <Card className="bg-gradient-to-r from-yellow-400/10 to-amber-600/10 border-yellow-400/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Costo de Inscripción</p>
              <p className="text-4xl font-black text-yellow-400">
                ${eventConfig.costoInscripcion.toLocaleString('es-AR')} ARS
              </p>
              <p className="text-gray-500 text-sm mt-1">Incluye kit completo del evento</p>
            </div>
            <DollarSign className="w-16 h-16 text-yellow-400/30" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400">Método de Pago</h3>

        <div className="space-y-2">
          <Label className="text-gray-300">
            Transferencia Bancaria <span className="text-red-500">*</span>
          </Label>
          <div className="bg-zinc-900 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-white font-medium">Transferencia Bancaria</p>
            <p className="text-gray-400 text-sm mt-1">
              Realiza tu transferencia a la cuenta indicada abajo
            </p>
          </div>
        </div>

        {/* Bank Details */}
        <Card className="bg-zinc-900 border-yellow-400/20">
          <CardContent className="p-4">
            <h4 className="text-white font-semibold mb-3">Datos para Transferencia</h4>
            
            {eventConfig.aliasTransferencia && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-3">
                <p className="text-gray-400 text-sm">Alias</p>
                <p className="text-yellow-400 text-lg font-bold">{eventConfig.aliasTransferencia}</p>
              </div>
            )}

            {eventConfig.datosTransferencia && (
              <div className="space-y-2 text-sm text-gray-300 whitespace-pre-line">
                {eventConfig.datosTransferencia}
              </div>
            )}

            {!eventConfig.aliasTransferencia && !eventConfig.datosTransferencia && (
              <p className="text-gray-400 text-sm">
                Cargando datos de transferencia...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reference Number */}
      <div className="space-y-2">
        <Label htmlFor="numeroReferencia" className="text-gray-300">
          Nombre de quien transfirio <span className="text-red-500">*</span>
        </Label>
        <Input
          id="numeroReferencia"
          value={formData.numeroReferencia}
          onChange={(e) => updateFormData({ numeroReferencia: e.target.value })}
          placeholder="Ej: Juan Perez"
          className="bg-zinc-900 border-yellow-400/30 text-white"
          required
        />
        <p className="text-sm text-gray-500">Ingresa el nombre de la persona que hizo la transferencia</p>
      </div>

      {/* Upload Proof */}
      <div className="space-y-2">
        <Label htmlFor="comprobante" className="text-gray-300">
          Comprobante de Pago <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <input id="comprobante" type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
          <label
            htmlFor="comprobante"
            className="flex items-center justify-center gap-3 p-6 bg-zinc-900 border-2 border-dashed border-yellow-400/30 rounded-lg cursor-pointer hover:border-yellow-400/50 hover:bg-zinc-800/50 transition-all"
          >
            {fileName ? (
              <>
                <FileCheck className="w-6 h-6 text-green-500" />
                <span className="text-white">{fileName}</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-yellow-400" />
                <span className="text-gray-400">Haz clic para subir tu comprobante</span>
              </>
            )}
          </label>
        </div>
        <p className="text-sm text-gray-500">Formatos aceptados: JPG, PNG, PDF (Máx. 5MB)</p>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-gray-300">
          <strong className="text-blue-400">Importante:</strong> Tu inscripción será revisada por nuestro equipo
          administrativo. Recibirás un correo de confirmación una vez aprobado el pago. Esto puede tomar entre 24-48
          horas.
        </p>
      </div>
    </div>
  )
}