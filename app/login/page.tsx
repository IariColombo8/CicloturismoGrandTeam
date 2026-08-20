"use client"
import { useState, useEffect } from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/"
  const { toast } = useToast()

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
      {/* Capa 0 — imagen de respaldo mientras carga el iframe */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('/ciclista-en-monta-a-silueta.jpg')" }}
        aria-hidden="true"
      />
      {/* Capa 1 — la landing real, difuminada y no interactiva */}
      <iframe
        src="/"
        title=""
        aria-hidden="true"
        tabIndex={-1}
        scrolling="no"
        loading="lazy"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 border-0 blur-[10px] saturate-125"
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
            <img
              src="/logo.png"
              alt="Grand Team Bike"
              width={160}
              height={160}
              className="h-28 w-28 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)] md:h-36 md:w-36"
            />
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

          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-yellow-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al sitio
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
