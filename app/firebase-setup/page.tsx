import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, ExternalLink, ArrowLeft, Shield, Database, Globe } from "lucide-react"

export default function FirebaseSetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-yellow-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <h1 className="text-4xl font-black text-white">
              Configuración de <span className="gradient-text">Firebase</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Sigue estos pasos para configurar correctamente Firebase y resolver los errores de conexión
          </p>
        </div>

        {/* Alert */}
        <Card className="bg-red-500/10 border-red-500/30 mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-red-400 font-bold mb-2">Errores Actuales</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Error: Firebase: Error (auth/unauthorized-domain)</li>
                  <li>• Las reglas de Firestore están bloqueando todo el acceso</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Authorized Domains */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 text-black rounded-full flex items-center justify-center font-black">
                  1
                </div>
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-yellow-400" />
                    Autorizar Dominios
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Agrega los dominios autorizados en Firebase
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-red-500/20 text-red-400 border-none">Requerido</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">1.</span>
                <span>
                  Ve a{" "}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:underline inline-flex items-center gap-1"
                  >
                    Firebase Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">2.</span>
                <span>
                  Selecciona tu proyecto:{" "}
                  <code className="bg-zinc-800 px-2 py-1 rounded text-yellow-400">cicloturismo-35fd8</code>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">3.</span>
                <span>
                  Ve a: <strong>Authentication → Settings → Authorized domains</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">4.</span>
                <span>
                  Haz clic en <strong>"Add domain"</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">5.</span>
                <div className="flex-1">
                  <span>Agrega estos dominios uno por uno:</span>
                  <div className="mt-2 space-y-2">
                    <div className="bg-zinc-900 p-3 rounded border border-yellow-400/20">
                      <code className="text-green-400">localhost</code>
                      <span className="text-gray-500 text-sm ml-2">(para desarrollo local)</span>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded border border-yellow-400/20">
                      <code className="text-green-400">v0.app</code>
                      <span className="text-gray-500 text-sm ml-2">(para preview de v0)</span>
                    </div>
                  </div>
                </div>
              </li>
            </ol>

            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg mt-4">
              <p className="text-blue-400 text-sm">
                <strong>Nota:</strong> También puedes agregar tu URL específica de preview (ej: abc123.v0.app) para
                mayor seguridad
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Firestore Rules */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 text-black rounded-full flex items-center justify-center font-black">
                  2
                </div>
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-yellow-400" />
                    Configurar Reglas de Firestore
                  </CardTitle>
                  <CardDescription className="text-gray-400">Actualiza las reglas de seguridad</CardDescription>
                </div>
              </div>
              <Badge className="bg-red-500/20 text-red-400 border-none">Requerido</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">1.</span>
                <span>
                  En Firebase Console, ve a: <strong>Firestore Database → Rules</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">2.</span>
                <span>Reemplaza las reglas actuales con estas:</span>
              </li>
            </ol>

            <div className="bg-zinc-900 p-4 rounded-lg border border-yellow-400/20 overflow-x-auto">
              <pre className="text-sm text-gray-300">
                <code>{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Inscripciones collection rules
    match /inscripciones/{inscripcionId} {
      // Allow anyone to create a new inscription (public registration)
      allow create: if true;
      
      // Allow authenticated users to read inscriptions
      allow read: if request.auth != null;
      
      // Only authenticated users can update/delete
      allow update, delete: if request.auth != null;
    }
    
    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}</code>
              </pre>
            </div>

            <ol start={3} className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold">3.</span>
                <span>
                  Haz clic en <strong>"Publish"</strong>
                </span>
              </li>
            </ol>

            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
              <p className="text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                Estas reglas permiten registro público pero protegen las operaciones de administración
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Testing */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 text-black rounded-full flex items-center justify-center font-black">
                3
              </div>
              <div>
                <CardTitle className="text-white">Probar la Configuración</CardTitle>
                <CardDescription className="text-gray-400">Verifica que todo funcione correctamente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Intenta iniciar sesión con Google</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Completa un formulario de inscripción de prueba</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Inicia sesión como administrador y verifica que puedas ver las inscripciones</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            asChild
            className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform flex-1"
          >
            <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Firebase Console
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400 hover:text-black flex-1 bg-transparent"
          >
            <Link href="/login">Probar Inicio de Sesión</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
