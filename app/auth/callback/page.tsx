"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/admin/dashboard"
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const processAuth = async () => {
      try {
        // Flujo implicito: Supabase detecta el hash fragment automaticamente
        // gracias a detectSessionInUrl: true en la config del cliente.
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error obteniendo sesion en callback:", error)
          router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
          return
        }

        if (session?.user) {
          // Vincular auth_user_id en administradores via RPC
          try {
            await supabase.rpc("link_auth_user", {
              p_email: session.user.email,
              p_auth_user_id: session.user.id,
              p_display_name: session.user.user_metadata?.full_name || null,
              p_photo_url: session.user.user_metadata?.avatar_url || null,
              p_login_method: session.user.app_metadata?.provider === "google" ? "google" : "email",
            })
          } catch (rpcError) {
            console.error("Error en link_auth_user:", rpcError)
          }

          router.replace(returnUrl)
        } else {
          // Si no hay sesion, puede que el hash aun no se proceso.
          // Escuchar cambios de auth por si llega despues.
          // IMPORTANTE: el callback NO debe ser async ni hacer await de
          // llamadas a Supabase (deadlock con el lock interno de auth).
          // El trabajo real se difiere con setTimeout.
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
              if (event === "SIGNED_IN" && newSession?.user) {
                subscription.unsubscribe()
                clearTimeout(fallbackTimeout)

                const sessionUser = newSession.user
                setTimeout(async () => {
                  try {
                    await supabase.rpc("link_auth_user", {
                      p_email: sessionUser.email,
                      p_auth_user_id: sessionUser.id,
                      p_display_name: sessionUser.user_metadata?.full_name || null,
                      p_photo_url: sessionUser.user_metadata?.avatar_url || null,
                      p_login_method: sessionUser.app_metadata?.provider === "google" ? "google" : "email",
                    })
                  } catch (rpcError) {
                    console.error("Error en link_auth_user:", rpcError)
                  }

                  router.replace(returnUrl)
                }, 0)
              }
            }
          )

          // Timeout: si no hay sesion en 5s, volver al login.
          // Se cancela si el login llega a tiempo (antes rebotaba al login
          // incluso despues de un login exitoso).
          const fallbackTimeout = setTimeout(() => {
            subscription.unsubscribe()
            router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
          }, 5000)
        }
      } catch (error) {
        console.error("Error en auth callback:", error)
        router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      }
    }

    processAuth()
  }, [router, returnUrl])

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
      <p className="text-gray-400 text-sm">Procesando autenticacion...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
            <p className="text-gray-400 text-sm">Cargando...</p>
          </div>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </div>
  )
}
