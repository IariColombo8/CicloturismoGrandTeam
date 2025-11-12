"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Mail, Home, FileText } from "lucide-react"

export default function ExitoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full bg-black/50 border-yellow-400/30 backdrop-blur-sm">
        <CardContent className="p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
            ¡Inscripción <span className="gradient-text">Exitosa!</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-300 mb-8 leading-relaxed">
            Tu solicitud de inscripción ha sido recibida correctamente. Nuestro equipo revisará tu pago y recibirás un
            correo de confirmación en las próximas 24-48 horas.
          </p>

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

          {/* Important notice */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8 text-left">
            <p className="text-sm text-gray-300">
              <strong className="text-blue-400">Próximos pasos:</strong>
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
              <li>Recibirás un correo de confirmación con tu número de registro</li>
              <li>Revisa la carpeta de spam si no ves el correo</li>
              <li>Guarda tu número de referencia de pago</li>
              <li>Una semana antes del evento recibirás instrucciones adicionales</li>
            </ul>
          </div>

          {/* Action buttons */}
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
