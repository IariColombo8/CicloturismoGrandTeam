"use client"
import { useState, useEffect } from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Stethoscope, CheckCircle2, XCircle, AlertTriangle, Loader2, Copy, ShieldCheck } from "lucide-react"
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
        setSqlFix(`INSERT INTO administradores (email, role, display_name, login_method, auth_user_id)\nVALUES ('${userEmail}', 'admin', '${session.user.user_metadata?.full_name || "Admin"}', 'google', '${userId}')\nON CONFLICT (email) DO UPDATE SET role = 'admin', auth_user_id = '${userId}';`)
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

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDiag, setShowDiag] = useState(false)

  // Manejar sesion activa (el callback de OAuth vuelve con la sesion ya creada)
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleUser(session.user)
    })

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
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Capa 1 — foto del evento */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center blur-[2px]"
        style={{ backgroundImage: "url('/ciclistas-en-grupo-pedaleando-en-carretera.jpg')" }}
        aria-hidden="true"
      />
      {/* Capa 2 — velo plano */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      {/* Capa 3 — degradado de marca (negro -> dorado) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/50 to-yellow-900/40"
        aria-hidden="true"
      />
      {/* Capa 4 — vineta radial */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.85) 90%)" }}
        aria-hidden="true"
      />
      {/* Halo dorado */}
      <div
        className="pointer-events-none absolute -top-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-yellow-400/20 blur-3xl"
        aria-hidden="true"
      />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="rounded-full bg-white p-2 shadow-2xl shadow-black/50 ring-1 ring-yellow-400/50">
              <img
                src="/logo.png"
                alt="Grand Team Bike"
                width={112}
                height={112}
                className="h-24 w-24 object-contain md:h-28 md:w-28"
              />
            </div>
          </div>

          <div className="mt-7 text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-yellow-400">
              Grand Team Bike 2026
            </p>
            <h1 className="mt-2 text-3xl font-black leading-[1.1] text-white drop-shadow-lg md:text-4xl">
              Cicloturismo con alma
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Estas accediendo al panel interno del evento. Este espacio es solo para el equipo
              organizador.
            </p>
          </div>

          {/* Panel de acceso */}
          <div className="mt-8 rounded-2xl border border-yellow-400/25 bg-white/5 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center justify-center gap-2 text-white/70">
              <ShieldCheck className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-medium uppercase tracking-wider">Acceso restringido</span>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4 border-red-400/40 bg-red-950/60 text-red-100">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-5 h-12 w-full rounded-xl bg-white font-semibold text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden="true">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                  <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                  <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.2154 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                </svg>
              )}
              {loading ? "Conectando..." : "Continuar con Google"}
            </Button>

            <p className="mt-4 text-center text-xs leading-relaxed text-white/45">
              Si no formas parte del equipo, tu cuenta quedara sin permisos de administracion.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-yellow-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al sitio
            </a>
            <button
              type="button"
              onClick={() => setShowDiag(!showDiag)}
              className="inline-flex items-center gap-1.5 text-sm text-white/30 transition-colors hover:text-yellow-400"
              title="Diagnostico de login"
            >
              <Stethoscope className="h-4 w-4" />
              Diagnostico
            </button>
          </div>

          {showDiag && <DiagnosticPanel onClose={() => setShowDiag(false)} />}
        </div>
      </main>
    </div>
  )
}
