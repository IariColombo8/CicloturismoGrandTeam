"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useRef, useCallback } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Mail, Home, FileText, Download, QrCode } from "lucide-react"

function ExitoContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const nombre = searchParams.get("nombre")
  const numero = searchParams.get("numero")
  const qrRef = useRef<HTMLDivElement>(null)

  const descargarQR = useCallback(() => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector("svg")
    if (!svg) return

    // Convertir SVG a canvas para descargar como PNG
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      if (ctx) {
        // Fondo blanco
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, 400, 400)
        ctx.drawImage(img, 0, 0, 400, 400)
      }

      const link = document.createElement("a")
      link.download = `QR-GrandTeam-${numero || "inscripcion"}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }, [numero])

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full bg-black/50 border-yellow-400/30 backdrop-blur-sm">
        <CardContent className="p-8 md:p-12 text-center">
          {/* Ícono de éxito */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            ¡Inscripción <span className="gradient-text">Exitosa!</span>
          </h1>

          {/* Descripción */}
          <p className="text-lg text-gray-300 mb-8 leading-relaxed">
            Tu solicitud de inscripción ha sido recibida correctamente. Nuestro equipo revisará tu pago y recibirás un
            correo de confirmación en las próximas 24-48 horas.
          </p>

          {/* QR Code */}
          {token && (
            <div className="mb-8 p-6 bg-white rounded-xl inline-block">
              <div ref={qrRef}>
                <QRCodeSVG
                  value={token}
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-black text-sm font-medium mt-3">
                {nombre && <span className="block text-base font-bold">{nombre}</span>}
                {numero && <span className="text-gray-500">Inscripción #{numero}</span>}
              </p>
            </div>
          )}

          {/* Botón descargar QR */}
          {token && (
            <div className="mb-8">
              <Button
                onClick={descargarQR}
                className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar QR
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                <QrCode className="w-3 h-3 inline mr-1" />
                Guardá este QR para el check-in el día del evento
              </p>
            </div>
          )}

          {/* Info boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass p-4 rounded-lg">
              <Mail className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Revisa tu email</p>
            </div>
            <div className="glass p-4 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Confirmación en 24-48h</p>
            </div>
            <div className="glass p-4 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Número de registro enviado</p>
            </div>
          </div>

          {/* Aviso importante */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8 text-left">
            <p className="text-sm text-gray-300">
              <strong className="text-blue-400">Próximos pasos:</strong>
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
              <li>Recibirás un correo de confirmación con tu número de registro</li>
              <li>Revisa la carpeta de spam si no ves el correo</li>
              <li>Guarda tu número de referencia de pago</li>
              {token && <li><strong className="text-yellow-400">Descargá tu código QR</strong> para presentar el día del evento</li>}
              <li>Una semana antes del evento recibirás instrucciones adicionales</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
              >
                <Home className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
              >
                Ir a Mi Cuenta
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ExitoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
          <div className="text-yellow-400 text-lg animate-pulse">Cargando...</div>
        </div>
      }
    >
      <ExitoContent />
    </Suspense>
  )
}
