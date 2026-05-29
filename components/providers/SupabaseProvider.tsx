"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

interface EventSettings {
  cupoMaximo: number
  precio: number
  costoInscripcion?: number
  metodoPago: string
  inscripcionesAbiertas: boolean
  currentYear: number
  [key: string]: unknown
}

interface AdminProfile {
  displayName: string | null
  photoUrl: string | null
}

interface SupabaseContextType {
  user: User | null
  session: Session | null
  loading: boolean
  eventSettings: EventSettings | null
  isSupabaseAvailable: boolean
  userRole: string | null
  adminProfile: AdminProfile | null
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  loading: true,
  eventSettings: null,
  isSupabaseAvailable: false,
  userRole: null,
  adminProfile: null,
})

export const useSupabaseContext = () => useContext(SupabaseContext)

// Alias de compatibilidad con el nombre anterior
export const useFirebaseContext = useSupabaseContext

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Verificar disponibilidad de Supabase
  useEffect(() => {
    try {
      if (supabase) {
        setIsSupabaseAvailable(true)
      }
    } catch (error) {
      console.error("Error al verificar Supabase:", error)
      setIsSupabaseAvailable(false)
      setLoading(false)
    }
  }, [])

  // Escuchar cambios de autenticacion
  useEffect(() => {
    if (!isSupabaseAvailable) return

    // Obtener sesion actual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        fetchUserRole(currentSession.user.email)
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    // Suscribirse a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchUserRole(newSession.user.email)
        } else {
          setUserRole(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [isSupabaseAvailable])

  // Obtener rol del usuario desde tabla administradores
  const fetchUserRole = async (email: string | undefined, retryCount = 0) => {
    if (!email) {
      setUserRole("usuario")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("administradores")
        .select("role")
        .eq("email", email)
        .maybeSingle()

      if (error) {
        console.error("Error al obtener rol:", error)
        setUserRole("usuario")
      } else if (data) {
        setUserRole((data as any).role || "usuario")
      } else {
        // No se encontro registro. Puede que link_auth_user aun no termino.
        // Reintentar una vez despues de un breve delay.
        if (retryCount < 1) {
          setTimeout(() => fetchUserRole(email, retryCount + 1), 1500)
          return
        }
        setUserRole("usuario")
      }
    } catch (error) {
      console.error("Error al obtener rol:", error)
      setUserRole("usuario")
    }

    setLoading(false)
  }

  // Cargar configuracion del evento (con cache en sessionStorage)
  useEffect(() => {
    const SETTINGS_CACHE_KEY = "event_settings_cache"
    const SETTINGS_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

    const defaultSettings: EventSettings = {
      cupoMaximo: 300,
      precio: 35000,
      metodoPago: "Transferencia bancaria",
      inscripcionesAbiertas: true,
      currentYear: new Date().getFullYear(),
    }

    // Intentar cargar del cache primero
    try {
      const cached = sessionStorage.getItem(SETTINGS_CACHE_KEY)
      if (cached) {
        const { data: cachedData, ts } = JSON.parse(cached)
        if (Date.now() - ts < SETTINGS_CACHE_TTL) {
          setEventSettings(cachedData)
          return // Cache valido, no refetchear
        }
      }
    } catch {}

    if (!isSupabaseAvailable) {
      setEventSettings(defaultSettings)
      return
    }

    const fetchEventSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("event_settings")
          .select("*")
          .eq("id", "eventSettings")
          .maybeSingle()

        if (error || !data) {
          setEventSettings(defaultSettings)
        } else {
          const settings = {
            cupoMaximo: data.cupo_maximo,
            precio: data.precio,
            costoInscripcion: data.costo_inscripcion ?? undefined,
            metodoPago: data.metodo_pago,
            inscripcionesAbiertas: data.inscripciones_abiertas,
            currentYear: data.current_year,
          }
          setEventSettings(settings)
          try {
            sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ data: settings, ts: Date.now() }))
          } catch {}
        }
      } catch (error) {
        console.error("Error al obtener event settings:", error)
        setEventSettings(defaultSettings)
      }
    }

    fetchEventSettings()
  }, [isSupabaseAvailable])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      eventSettings,
      isSupabaseAvailable,
      isFirebaseAvailable: isSupabaseAvailable, // Alias de compatibilidad
      userRole,
      adminProfile: null,
    }),
    [user, session, loading, eventSettings, isSupabaseAvailable, userRole]
  )

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Alias de compatibilidad
export const FirebaseProvider = SupabaseProvider
