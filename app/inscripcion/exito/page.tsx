"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Mail, Home, FileText, LogIn } from "lucide-react"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import Navbar from "@/components/layout/Navbar"

export default function ExitoPage() {
  const router = useRouter()
  const { user, loading } = useFirebaseContext()
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(!user && !loading)

  useEffect(() => {
    if (!loading) {
      setShowSignUpPrompt(!user)
    }
  }, [user, loading])

  const handleReinscribe = () => {
    router.push("/inscripcion")
  }

  const handleGoToProfile = () => {
    router.push("/mi-perfil")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />
      <div className="flex items-center justify-center px-4 pt-24">
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

            <div className="space-y-4">
              {/* Primary action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Volver al Inicio
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReinscribe}
                  className="w-full sm:w-auto border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
                >
                  Inscribir otra persona
                </Button>
              </div>

              {!loading && (
                <>
                  {user ? (
                    // User is logged in
                    <div className="pt-4 border-t border-yellow-400/20">
                      <Link href="/mi-perfil">
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Ir a mi cuenta
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    // User is not logged in
                    <div className="pt-4 border-t border-yellow-400/20">
                      <p className="text-gray-300 mb-4">¿Querés crear una cuenta para guardar tus datos?</p>
                      <Link href="/mi-perfil">
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
                        >
                          Crear cuenta
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
