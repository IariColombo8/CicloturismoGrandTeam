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
import { ArrowLeft, Mail, ChevronDown, ChevronUp, Stethoscope, CheckCircle2, XCircle, AlertTriangle, Loader2, Copy } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// --- Panel de Diagnostico ---
interface DiagStep {
  label: string
  status: "pending" | "running" | "ok" | "warn" | "error"
  detail: string
}

function DiagnosticPanel({ onClose }: { onClose: () => void }) {
  const [steps, setSteps] = useState<DiagStep[]>([])
  const [running, setRunning] = useState(false)
  const [sqlFix, setSqlFix] = useState<string | null>(null)

  const updateStep = (index: number, update: Partial<DiagStep>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s))
  }

  const runDiagnostics = async () => {
    setRunning(true)
    setSqlFix(null)

    const initial: DiagStep[] = [
      { label: "Conexion a Supabase", status: "pending", detail: "" },
      { label: "Sesion de autenticacion", status: "pending", detail: "" },
      { label: "Email del usuario", status: "pending", detail: "" },
      { label: "Tabla administradores (SELECT)", status: "pending", detail: "" },
      { label: "Rol asignado", status: "pending", detail: "" },
      { label: "Funcion RPC link_auth_user", status: "pending", detail: "" },
    ]
    setSteps(initial)

    // Paso 1: Conexion a Supabase
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "running" } : s))
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) {
        updateStep(0, { status: "error", detail: `URL=${url ? "OK" : "FALTA"} | ANON_KEY=${key ? "OK" : "FALTA"}` })
        setRunning(false)
        return
      }
      updateStep(0, { status: "ok", detail: `URL: ${url.substring(0, 30)}...` })
    } catch (e: any) {
      updateStep(0, { status: "error", detail: e.message })
      setRunning(false)
      return
    }

    // Paso 2: Sesion
    setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: "running" } : s))
    let session = null
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        updateStep(1, { status: "error", detail: `Error: ${error.message}` })
        setRunning(false)
        return
      }
      session = data.session
      if (!session) {
        updateStep(1, { status: "warn", detail: "No hay sesion activa. Inicia sesion primero y despues ejecuta el diagnostico." })
        // Continuar sin sesion para mostrar el estado
        updateStep(2, { status: "warn", detail: "Sin sesion, no se puede obtener email" })
        updateStep(3, { status: "warn", detail: "Requiere sesion" })
        updateStep(4, { status: "warn", detail: "Requiere sesion" })
        updateStep(5, { status: "warn", detail: "Requiere sesion" })
        setRunning(false)
        return
      }
      updateStep(1, { status: "ok", detail: `Token: ${session.access_token.substring(0, 20)}... | Expira: ${new Date(session.expires_at! * 1000).toLocaleString()}` })
    } catch (e: any) {
      updateStep(1, { status: "error", detail: e.message })
      setRunning(false)
      return
    }

    // Paso 3: Email
    setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: "running" } : s))
    const userEmail = session.user.email
    const userId = session.user.id
    if (!userEmail) {
      updateStep(2, { status: "error", detail: "El usuario autenticado no tiene email" })
      setRunning(false)
      return
    }
    updateStep(2, { status: "ok", detail: `Email: ${userEmail} | ID: ${userId.substring(0, 8)}...` })

    // Paso 4: Buscar en administradores
    setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: "running" } : s))
    let adminRow: any = null
    try {
      const { data, error } = await supabase
        .from("administradores")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle()

      if (error) {
        updateStep(3, { status: "error", detail: `Error RLS/query: ${error.message} (code: ${error.code})` })
        // Puede ser que la tabla no exista o RLS bloquee
        if (error.code === "42P01") {
          updateStep(3, { status: "error", detail: "La tabla 'administradores' NO EXISTE. Ejecuta schema.sql en Supabase." })
        }
      } else if (!data) {
        updateStep(3, { status: "error", detail: `No se encontro ningun registro con email "${userEmail}". Necesitas insertar tu email en la tabla.` })
        setSqlFix(`INSERT INTO administradores (email, role, display_name, login_method, auth_user_id)\nVALUES ('${userEmail}', 'admin', '${session.user.user_metadata?.full_name || "Admin"}', 'email', '${userId}')\nON CONFLICT (email) DO UPDATE SET role = 'admin', auth_user_id = '${userId}';`)
      } else {
        adminRow = data
        updateStep(3, { status: "ok", detail: `Encontrado: role=${data.role}, auth_user_id=${data.auth_user_id || "NULL"}, login_method=${data.login_method}` })
      }
    } catch (e: any) {
      updateStep(3, { status: "error", detail: `Excepcion: ${e.message}` })
    }

    // Paso 5: Rol
    setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: "running" } : s))
    if (adminRow) {
      const role = adminRow.role
      if (role === "admin" || role === "grandteam") {
        updateStep(4, { status: "ok", detail: `Rol "${role}" — tiene acceso al panel admin` })
      } else {
        updateStep(4, { status: "error", detail: `Rol "${role}" — NO tiene acceso al panel admin. Debe ser "admin" o "grandteam".` })
        setSqlFix(`UPDATE administradores SET role = 'admin' WHERE email = '${userEmail}';`)
      }

      // Verificar auth_user_id vinculado
      if (!adminRow.auth_user_id) {
        updateStep(4, { status: "warn", detail: `Rol "${role}" pero auth_user_id es NULL — el RPC link_auth_user debe vincularlo` })
      } else if (adminRow.auth_user_id !== userId) {
        updateStep(4, { status: "warn", detail: `Rol "${role}" pero auth_user_id (${adminRow.auth_user_id.substring(0, 8)}...) no coincide con sesion (${userId.substring(0, 8)}...). Puede haber conflicto.` })
      }
    } else {
      updateStep(4, { status: "error", detail: "Sin registro en administradores, el sistema asigna rol 'usuario' por defecto" })
    }

    // Paso 6: RPC link_auth_user
    setSteps(prev => prev.map((s, i) => i === 5 ? { ...s, status: "running" } : s))
    try {
      const { data, error } = await supabase.rpc("link_auth_user", {
        p_email: userEmail,
        p_auth_user_id: userId,
        p_display_name: session.user.user_metadata?.full_name || null,
        p_photo_url: session.user.user_metadata?.avatar_url || null,
        p_login_method: session.user.app_metadata?.provider === "google" ? "google" : "email",
      })

      if (error) {
        if (error.message.includes("could not find") || error.message.includes("function") || error.code === "42883") {
          updateStep(5, { status: "error", detail: `La funcion link_auth_user NO EXISTE en Supabase. Ejecuta fix-auth-link.sql en el SQL Editor.` })
        } else {
          updateStep(5, { status: "error", detail: `Error RPC: ${error.message} (code: ${error.code})` })
        }
      } else if (data && Array.isArray(data) && data.length > 0) {
        updateStep(5, { status: "ok", detail: `RPC retorno: role="${data[0].role}"` })
      } else {
        updateStep(5, { status: "warn", detail: `RPC ejecuto pero retorno vacío (email no encontrado en administradores). Data: ${JSON.stringify(data)}` })
      }
    } catch (e: any) {
      updateStep(5, { status: "error", detail: `Excepcion: ${e.message}` })
    }

    setRunning(false)
  }

  const statusIcon = (status: DiagStep["status"]) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
      case "warn": return <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
      case "error": return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
      case "running": return <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
      default: return <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex-shrink-0" />
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card className="bg-black/70 border-yellow-400/30 backdrop-blur-sm mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-yellow-400 text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Diagnostico de Login
          </CardTitle>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm">Cerrar</button>
        </div>
        <CardDescription className="text-gray-500 text-xs">
          Verifica cada paso del flujo de autenticacion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.length === 0 ? (
          <p className="text-zinc-400 text-sm">
            Presiona &quot;Ejecutar&quot; para analizar el estado de tu sesion, permisos y base de datos.
          </p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                {statusIcon(step.status)}
                <div className="min-w-0">
                  <span className="font-medium text-white">{step.label}</span>
                  {step.detail && (
                    <p className={`text-xs mt-0.5 break-all ${
                      step.status === "ok" ? "text-green-400/80" :
                      step.status === "warn" ? "text-yellow-400/80" :
                      step.status === "error" ? "text-red-400/80" :
                      "text-zinc-500"
                    }`}>
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sqlFix && (
          <div className="mt-3 p-3 bg-zinc-900 border border-yellow-400/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">SQL para corregir — ejecuta en Supabase SQL Editor:</span>
              <button
                onClick={() => copyToClipboard(sqlFix)}
                className="text-zinc-400 hover:text-yellow-400 transition-colors"
                title="Copiar SQL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{sqlFix}</pre>
          </div>
        )}

        <Button
          onClick={runDiagnostics}
          disabled={running}
          className="w-full bg-gradient-to-r from-yellow-400/20 to-amber-600/20 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30 transition-all"
        >
          {running ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analizando...</>
          ) : steps.length > 0 ? (
            <><Stethoscope className="w-4 h-4 mr-2" /> Re-ejecutar Diagnostico</>
          ) : (
            <><Stethoscope className="w-4 h-4 mr-2" /> Ejecutar Diagnostico</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

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
  const [showDiag, setShowDiag] = useState(false)

  // Manejar sesion activa (detecta tokens del hash en flujo implicito OAuth)
  useEffect(() => {
    let handled = false

    const handleUser = async (user: any) => {
      if (!user?.email || handled) return
      handled = true

      const role = await upsertAdminRecord(
        user.email,
        user.user_metadata?.full_name || "",
        user.user_metadata?.avatar_url || "",
        user.app_metadata?.provider === "google" ? "google" : "email",
        user.id
      )

      if (role === "admin" || role === "grandteam") {
        router.push("/admin/dashboard")
      } else {
        router.push(returnUrl)
      }
    }

    // Intentar recuperar sesion del hash fragment manualmente si existe
    const hash = window.location.hash
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ data: { session }, error }) => {
          if (error) {
            console.error("Error al establecer sesion desde hash:", error)
          } else if (session?.user) {
            // Limpiar hash de la URL
            window.history.replaceState(null, "", window.location.pathname + window.location.search)
            handleUser(session.user)
          }
        })
      }
    } else {
      // Sin hash, verificar sesion existente
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) handleUser(session.user)
      })
    }

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) handleUser(session.user)
      }
    )

    return () => subscription.unsubscribe()
  }, [router, returnUrl])

  const upsertAdminRecord = async (
    userEmail: string,
    displayName: string,
    photoUrl: string,
    loginMethod: "email" | "google",
    authUserId: string
  ) => {
    try {
      // Usar funcion RPC SECURITY DEFINER para vincular auth_user_id
      // Esto bypasea RLS para el primer login (auth_user_id NULL)
      const { data, error } = await supabase.rpc("link_auth_user", {
        p_email: userEmail,
        p_auth_user_id: authUserId,
        p_display_name: displayName || null,
        p_photo_url: photoUrl || null,
        p_login_method: loginMethod,
      })

      if (error) {
        console.error("Error en link_auth_user:", error)
        // Fallback: intentar solo leer el rol
        const { data: fallback } = await supabase
          .from("administradores")
          .select("role")
          .eq("email", userEmail)
          .maybeSingle()
        return (fallback as any)?.role || "usuario"
      }

      // data es un array de {role: string}
      if (data && Array.isArray(data) && data.length > 0) {
        return data[0].role || "usuario"
      }

      return "usuario"
    } catch (error) {
      console.error("Error en upsertAdminRecord:", error)
      return "usuario"
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const user = data.user
      if (!user?.email) throw new Error("No se pudo obtener el email del usuario")

      const userRole = await upsertAdminRecord(
        user.email,
        user.user_metadata?.full_name || "",
        user.user_metadata?.avatar_url || "",
        "email",
        user.id
      )

      toast({
        title: "Bienvenido!",
        description: `Sesion iniciada como ${userRole}`,
      })

      if (userRole === "admin" || userRole === "grandteam") {
        router.push("/admin/dashboard")
      } else {
        router.push(returnUrl)
      }
    } catch (error: any) {
      console.error("Error al iniciar sesion:", error)

      if (error.message?.includes("Invalid login credentials")) {
        setError("Credenciales incorrectas. Verifica tu email y contrasena.")
      } else if (error.message?.includes("too many requests")) {
        setError("Demasiados intentos fallidos. Intenta mas tarde.")
      } else {
        setError("Error al iniciar sesion. Por favor, intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
        },
      })

      if (authError) throw authError

      // La redireccion a Google ocurre automaticamente
      // El callback se maneja en el onAuthStateChange del useEffect
    } catch (error: any) {
      console.error("Error signing in with Google:", error)

      const errorMessage = "No se pudo iniciar sesion con Google. Intenta nuevamente."

      setError(errorMessage)
      toast({
        title: "Error al iniciar sesion",
        description: errorMessage,
        variant: "destructive",
      })
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
              <CardTitle className="text-white text-2xl">Iniciar Sesion</CardTitle>
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
                    <span className="text-white font-medium">Email y Contrasena</span>
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
                        Contrasena
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        className="bg-zinc-900 border-yellow-400/30 text-white"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform font-bold"
                    >
                      {loading ? "Iniciando sesion..." : "Iniciar Sesion"}
                    </Button>
                  </form>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Link
                  href="/"
                  className="text-sm text-gray-400 hover:text-yellow-400 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDiag(!showDiag)}
                  className="text-sm text-zinc-600 hover:text-yellow-400 transition-colors flex items-center gap-1.5"
                  title="Diagnostico de login"
                >
                  <Stethoscope className="w-4 h-4" />
                  Diagnostico
                </button>
              </div>
            </CardContent>
          </Card>

          {showDiag && (
            <DiagnosticPanel onClose={() => setShowDiag(false)} />
          )}
        </div>
      </div>
    </div>
  )
}
