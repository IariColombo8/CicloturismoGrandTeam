"use client"

import type React from "react"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileCheck, DollarSign, Copy, Check, MessageCircle, Loader2 } from "lucide-react"
import DatosTransferenciaCard from "@/components/DatosTransferenciaCard"
import type { DatosTransferencia } from "@/lib/transferencia"

// WhatsApp de Iara, para los que no pueden transferir a la cuenta uruguaya.
const WHATSAPP_IARA = "https://wa.me/5493794929464"

// Cuenta uruguaya: solo se muestra si en los datos personales se eligio Uruguay.
const CUENTA_URUGUAY = [
  { etiqueta: "Titular", valor: "Eladia Lorena Duré Nolla", copiable: false },
  { etiqueta: "Cuenta", valor: "000771735-00003", copiable: true },
  { etiqueta: "CA", valor: "000771735-00003", copiable: true },
  { etiqueta: "Cuenta anterior", valor: "CA 036-0696152", copiable: true },
]

interface PaymentStepProps {
  formData: any
  updateFormData: (data: any) => void
  eventConfig: {
    costoInscripcion: number
    aliasTransferencia: string
    datosTransferencia: string
    /** Datos de la cuenta ya separados (banco, alias, CBU, titular). */
    transferencia: DatosTransferencia
  }
  /** El padre se encarga de preparar el archivo (comprimirlo) en segundo plano. */
  onComprobante?: (file: File | null) => void
  /** "preparando" mientras se comprime, "aviso" si no se va a poder subir. */
  estadoComprobante?: "vacio" | "preparando" | "listo" | "aviso"
  avisoComprobante?: string
}

export default function PaymentStep({
  formData,
  updateFormData,
  eventConfig,
  onComprobante,
  estadoComprobante = "vacio",
  avisoComprobante = "",
}: PaymentStepProps) {
  const [fileName, setFileName] = useState<string>("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Cualquier dato copiable (alias, CBU, etc.). Tomó un id local para feedback.
  const copyToClipboard = async (text: string, key: string) => {
    if (!text) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback para navegadores antiguos / contextos sin clipboard.
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800)
    } catch (err) {
      console.error("Error copiando al portapapeles:", err)
    }
  }

  // Se acepta cualquier archivo, de cualquier tamaño. Las fotos se reducen en
  // el teléfono apenas se eligen (así el envío después es instantáneo) y si
  // alguna no se puede procesar, la inscripción viaja igual con una nota para
  // el equipo. Antes se rechazaba todo lo que pasara de 5 MB, y una foto de
  // celular moderno pasa de 5 MB sin esfuerzo: ahí se trababa la inscripción.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    setFileName(file.name)
    updateFormData({ comprobanteFile: file })
    onComprobante?.(file)
  }

  const pesoLegible = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

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
              <p className="text-gray-500 text-sm mt-1">La remera no está incluida y se solicita por separado</p>
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

        {/* Datos de la cuenta: cada dato con su propio boton de copiar */}
        <DatosTransferenciaCard datos={eventConfig.transferencia} />

        {/* Cuenta uruguaya: SOLO si el pais elegido es Uruguay */}
        {formData.pais === "Uruguay" && (
          <Card className="bg-zinc-900 border-sky-400/30">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-1 flex items-center gap-2">
                <span aria-hidden="true">🇺🇾</span>
                Si sos uruguayo
              </h4>
              <p className="text-gray-400 text-sm mb-3">
                Estos son los datos de una cuenta uruguaya para transferir
              </p>

              <div className="space-y-2">
                {CUENTA_URUGUAY.map((dato, i) => (
                  <div
                    key={dato.etiqueta}
                    className="flex items-center justify-between gap-3 bg-sky-400/5 border border-sky-400/20 rounded-lg p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs">{dato.etiqueta}</p>
                      <p className="text-white text-sm font-semibold break-all">{dato.valor}</p>
                    </div>
                    {dato.copiable && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(dato.valor, `uy-${i}`)}
                        aria-label={`Copiar ${dato.etiqueta}`}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-sky-400/40 text-sky-300 hover:bg-sky-400 hover:text-black transition-colors"
                      >
                        {copiedKey === `uy-${i}` ? (
                          <>
                            <Check className="w-3 h-3" aria-hidden="true" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" aria-hidden="true" />
                            Copiar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-300">
                  En caso de no poder transferir, por favor comunicate con:
                </p>
                <a
                  href={WHATSAPP_IARA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold bg-green-600 text-white hover:bg-green-500 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  Iara
                </a>
              </div>
            </CardContent>
          </Card>
        )}
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
          <input
            id="comprobante"
            type="file"
            accept="image/*,.pdf,.heic,.heif,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="comprobante"
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-yellow-400/30 bg-zinc-900 p-4 text-center transition-all cursor-pointer hover:border-yellow-400/50 hover:bg-zinc-800/50 sm:flex-row sm:gap-3 sm:p-6"
          >
            {fileName ? (
              <>
                {estadoComprobante === "preparando" ? (
                  <Loader2 className="h-6 w-6 flex-shrink-0 animate-spin text-yellow-400" aria-hidden="true" />
                ) : (
                  <FileCheck className="h-6 w-6 flex-shrink-0 text-green-500" aria-hidden="true" />
                )}
                <span className="min-w-0 break-words text-sm text-white sm:text-base">
                  {fileName}
                  {formData.comprobanteFile?.size ? (
                    <span className="text-gray-500"> · {pesoLegible(formData.comprobanteFile.size)}</span>
                  ) : null}
                </span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 flex-shrink-0 text-yellow-400" aria-hidden="true" />
                <span className="text-sm text-gray-400 sm:text-base">Tocá acá para subir tu comprobante</span>
              </>
            )}
          </label>
        </div>

        {estadoComprobante === "preparando" && (
          <p className="text-sm text-yellow-400">
            Preparando la imagen para que pese menos… podés seguir, se envía cuando esté lista.
          </p>
        )}
        {estadoComprobante === "aviso" && avisoComprobante && (
          <p className="text-sm text-gray-300">
            Tomamos tu inscripción igual. {avisoComprobante}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Sacale una foto o subí el PDF. No importa cuánto pese: lo achicamos nosotros.
        </p>
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