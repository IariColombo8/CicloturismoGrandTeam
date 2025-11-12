"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { collection, getDocs, query, where, setDoc, doc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Mail, Shield, ChevronDown, ChevronUp } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [isEmailSectionOpen, setIsEmailSectionOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("emailSectionOpen")
      return saved !== null ? JSON.parse(saved) : false
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("emailSectionOpen", JSON.stringify(isEmailSectionOpen))
    }
  }, [isEmailSectionOpen])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkAdminStatus(user.email)
      }
    })
    return () => unsubscribe()
  }, [router])

  const checkAdminStatus = async (userEmail: string | null) => {
    if (!userEmail) return

    try {
      const adminRef = collection(db, "administrador")
      const adminQuery = query(adminRef, where("email", "==", userEmail))
      const adminSnapshot = await getDocs(adminQuery)

      if (!adminSnapshot.empty) {
        const adminData = adminSnapshot.docs[0].data()
        console.log("[v0] Admin status check:", adminData.role)

        if (adminData.role === "admin" || adminData.role === "grandteam") {
          router.push("/admin/dashboard")
        }
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const adminRef = collection(db, "administrador")
      const adminQuery = query(adminRef, where("email", "==", user.email))
      const adminSnapshot = await getDocs(adminQuery)

      if (!adminSnapshot.empty) {
        const adminData = adminSnapshot.docs[0].data()

        if (adminData.role === "admin" || adminData.role === "grandteam") {
          // Actualizar último login
          const userDocId = `${user.email?.replace(/[@.]/g, "_")}`
          await setDoc(doc(db, "administrador", userDocId), {
            ...adminData,
            lastLogin: new Date(),
          })

          toast({
            title: "Acceso concedido",
            description: "Bienvenido al panel de administración",
          })
          router.push("/admin/dashboard")
        } else if (adminData.role === "usuario") {
          await auth.signOut()
          setError("No tienes permisos de administrador. Solicita acceso a un administrador.")
        } else {
          await auth.signOut()
          setError("Tu cuenta está pendiente de aprobación por un administrador.")
        }
      } else {
        const userDocId = `${user.email?.replace(/[@.]/g, "_")}`
        await setDoc(doc(db, "administrador", userDocId), {
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          role: "usuario",
          loginMethod: "email",
          createdAt: new Date(),
          lastLogin: new Date(),
        })

        console.log("[v0] Nuevo usuario creado en administrador:", {
          email: user.email,
          role: "usuario",
        })

        await auth.signOut()
        setError(
          "Gracias por registrarte. Tu cuenta ha sido creada como usuario. Solicita permisos de admin si los necesitas.",
        )
      }
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error)
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setError("Credenciales incorrectas. Por favor, verifica tu email y contraseña.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Por favor, intenta más tarde.")
      } else {
        setError("Error al iniciar sesión. Por favor, intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
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

      if (!adminSnapshot.empty) {
        const adminData = adminSnapshot.docs[0].data()

        if (adminData.role === "admin" || adminData.role === "grandteam") {
          // Actualizar último login
          const userDocId = `${user.email?.replace(/[@.]/g, "_")}`
          await setDoc(doc(db, "administrador", userDocId), {
            ...adminData,
            lastLogin: new Date(),
          })

          toast({
            title: "Acceso concedido",
            description: "Bienvenido al panel de administración",
          })
          router.push("/admin/dashboard")
        } else if (adminData.role === "usuario") {
          await auth.signOut()
          setError("No tienes permisos de administrador. Solicita acceso a un administrador.")
        } else {
          await auth.signOut()
          setError("Tu cuenta está pendiente de aprobación por un administrador.")
        }
      } else {
        const userDocId = `${user.email?.replace(/[@.]/g, "_")}`
        await setDoc(doc(db, "administrador", userDocId), {
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          role: "usuario",
          loginMethod: "google",
          createdAt: new Date(),
          lastLogin: new Date(),
        })

        console.log("[v0] Nuevo usuario creado en administrador:", {
          email: user.email,
          role: "usuario",
        })

        await auth.signOut()
        setError(
          "Gracias por registrarte. Tu cuenta ha sido creada como usuario. Solicita permisos de admin si los necesitas.",
        )
      }
    } catch (error: any) {
      console.error("Error al iniciar sesión con Google:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Inicio de sesión cancelado. Por favor, intenta nuevamente.")
      } else if (error.code === "auth/cancelled-popup-request") {
        setError("La solicitud de inicio de sesión fue cancelada. Por favor, intenta nuevamente.")
      } else if (error.code === "auth/unauthorized-domain") {
        setError("Dominio no autorizado. El administrador debe agregar este dominio en Firebase Console.")
      } else {
        setError("Error al iniciar sesión con Google. Por favor, intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleEmailSection = () => {
    setIsEmailSectionOpen((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-400/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Panel de <span className="gradient-text">Administración</span>
          </h1>
          <p className="text-gray-400">Grand Team Bike</p>
        </div>

        <Card className="bg-black/50 border-yellow-400/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Acceso Administradores</CardTitle>
            <CardDescription className="text-gray-400">
              Ingresa tus credenciales para acceder al panel administrativo
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="mx-6 mb-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="border border-yellow-400/30 rounded-lg">
                <button
                  type="button"
                  onClick={toggleEmailSection}
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
                  <div className="p-4 pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@grandteambike.com"
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
                  </div>
                )}
              </div>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-yellow-400/30 text-white hover:bg-yellow-400/10 bg-transparent"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
                <path
                  d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.2154 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                  fill="#34A853"
                />
              </svg>
              Iniciar sesión con Google
            </Button>

            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong className="text-blue-400">Nota:</strong> Solo personal autorizado puede acceder a este panel.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
