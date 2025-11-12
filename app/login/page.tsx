"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail, ChevronDown, ChevronUp } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import { auth, db } from "@/lib/firebase"
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth"
import { collection, getDocs, query, where, setDoc, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/"
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isEmailSectionOpen, setIsEmailSectionOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkUserRoleAndRedirect(user.email)
      }
    })

    return () => unsubscribe()
  }, [router, returnUrl])

  const checkUserRoleAndRedirect = async (userEmail: string | null) => {
    if (!userEmail) return

    try {
      const adminRef = collection(db, "administrador")
      const adminQuery = query(adminRef, where("email", "==", userEmail))
      const adminSnapshot = await getDocs(adminQuery)

      if (!adminSnapshot.empty) {
        const adminData = adminSnapshot.docs[0].data()

        // Si el usuario es admin o grandteam, redirigir al dashboard
        if (adminData.role === "admin" || adminData.role === "grandteam") {
          router.push("/admin/dashboard")
        } else {
          // Usuario normal, redirigir a returnUrl o home
          router.push(returnUrl)
        }
      } else {
        router.push(returnUrl)
      }
    } catch (error) {
      console.error("[v0] Error checking user role:", error)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Verificar y guardar usuario
      const adminRef = collection(db, "administrador")
      const adminQuery = query(adminRef, where("email", "==", user.email))
      const adminSnapshot = await getDocs(adminQuery)

      let userRole = "usuario"
      let userData = {}

      if (!adminSnapshot.empty) {
        // Usuario ya existe
        const existingData = adminSnapshot.docs[0].data()
        userRole = existingData.role || "usuario"
        userData = existingData
      }

      // Actualizar o crear documento con ID personalizado
      const userDocId = `${user.email?.replace(/[@.]/g, "_")}`
      await setDoc(doc(db, "administrador", userDocId), {
        ...userData,
        email: user.email,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        role: userRole,
        loginMethod: "email",
        createdAt: adminSnapshot.empty ? new Date() : userData.createdAt || new Date(),
        lastLogin: new Date(),
      })

      console.log("[v0] Usuario autenticado:", {
        email: user.email,
        role: userRole,
        docId: userDocId,
      })

      toast({
        title: "¡Bienvenido!",
        description: `Sesión iniciada como ${userRole}`,
      })

      // Redirigir según el rol
      if (userRole === "admin" || userRole === "grandteam") {
        router.push("/admin/dashboard")
      } else {
        router.push(returnUrl)
      }
    } catch (error: any) {
      console.error("[v0] Error al iniciar sesión:", error)

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Intenta más tarde.")
      } else {
        setError("Error al iniciar sesión. Por favor, intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const adminRef = collection(db, "administrador")
      const adminQuery = query(adminRef, where("email", "==", user.email))
      const adminSnapshot = await getDocs(adminQuery)

      let userRole = "usuario"

      if (!adminSnapshot.empty) {
        // Usuario ya existe, obtener su rol
        const adminData = adminSnapshot.docs[0].data()
        userRole = adminData.role || "usuario"
      }

      // Guardar o actualizar el usuario en la colección administrador con ID personalizado
      const userDocId = `${user.email?.replace(/[@.]/g, "_")}`
      await setDoc(doc(db, "administrador", userDocId), {
        email: user.email,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        role: userRole,
        loginMethod: "google",
        createdAt: adminSnapshot.empty ? new Date() : adminSnapshot.docs[0].data().createdAt,
        lastLogin: new Date(),
      })

      console.log("[v0] Usuario guardado en colección administrador:", {
        email: user.email,
        role: userRole,
        docId: userDocId,
      })

      toast({
        title: "¡Bienvenido!",
        description: `Hola ${result.user.displayName}`,
      })

      // Redirigir según el rol
      if (userRole === "admin" || userRole === "grandteam") {
        router.push("/admin/dashboard")
      } else {
        router.push(returnUrl)
      }
    } catch (error: any) {
      console.error("[v0] Error signing in with Google:", error)

      let errorMessage = "No se pudo iniciar sesión con Google. Intenta nuevamente."

      if (error.code === "auth/unauthorized-domain") {
        errorMessage =
          "Dominio no autorizado. El administrador debe agregar este dominio en Firebase Console > Authentication > Authorized domains."
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "El popup fue bloqueado. Por favor permite popups para este sitio."
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Inicio de sesión cancelado."
      }

      setError(errorMessage)
      toast({
        title: "Error al iniciar sesión",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />

      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <div className="w-full max-w-md">
          <Card className="bg-black/50 border-yellow-400/30 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-white text-2xl">Iniciar Sesión</CardTitle>
              <CardDescription className="text-gray-400">Accede con tu cuenta</CardDescription>
            </CardHeader>

            {error && (
              <div className="mx-6 mb-4">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <CardContent className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-black font-semibold py-6 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar con Google
              </Button>

              <div className="border border-yellow-400/30 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsEmailSectionOpen(!isEmailSectionOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-yellow-400/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-medium">Email y Contraseña</span>
                  </div>
                  {isEmailSectionOpen ? (
                    <ChevronUp className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-yellow-400" />
                  )}
                </button>

                {isEmailSectionOpen && (
                  <form onSubmit={handleEmailLogin} className="p-4 pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="bg-zinc-900 border-yellow-400/30 text-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">
                        Contraseña
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-zinc-900 border-yellow-400/30 text-white"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform font-bold"
                    >
                      {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </form>
                )}
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/"
                  className="text-sm text-gray-400 hover:text-yellow-400 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
