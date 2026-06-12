"use client"

import { createContext, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from "react"
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

interface SupabaseContextType {
  user: User | null
  session: Session | null
  loading: boolean
  eventSettings: EventSettings | null
  isSupabaseAvailable: boolean
  userRole: string | null
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  loading: true,
  eventSettings: null,
  isSupabaseAvailable: false,
  userRole: null,
})

export const useSupabaseContext = () => useContext(SupabaseContext)

// Alias de compatibilidad con el nombre anterior
export const useFirebaseContext = useSupabaseContext

// Cache del rol en sessionStorage: evita que cada carga del admin espere
// el viaje a la base solo para saber el rol (es solo un hint de UI; la
// autorizacion real la aplica RLS en el servidor).
const ROLE_CACHE_KEY = "user_role_cache"
const ROLE_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

const readRoleCache = (email: string): string | null => {
  try {
    const raw = sessionStorage.getItem(ROLE_CACHE_KEY)
    if (!raw) return null
    const { email: cachedEmail, role, ts } = JSON.parse(raw)
    if (cachedEmail !== email || Date.now() - ts > ROLE_CACHE_TTL) return null
    return role || null
  } catch {
    return null
  }
}

const writeRoleCache = (email: string, role: string) => {
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ email, role, ts: Date.now() }))
  } catch {}
}

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  // Evita consultas duplicadas del rol (getSession + INITIAL_SESSION
  // disparan ambos al iniciar, y TOKEN_REFRESHED cada ~1 hora)
  const lastRoleEmail = useRef<string | null>(null)

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
        resolveUserRole(currentSession.user.email)
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    // Suscribirse a cambios de auth
    // IMPORTANTE: el callback NO debe ser async ni hacer await de llamadas a
    // Supabase. El callback retiene el lock interno de auth y cualquier
    // consulta .from()/.rpc() adentro espera ese mismo lock => deadlock
    // (la app queda colgada y el rol nunca se resuelve). Se difiere con
    // setTimeout para ejecutar fuera del lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const email = newSession.user.email
          setTimeout(() => resolveUserRole(email), 0)
        } else {
          lastRoleEmail.current = null
          setUserRole(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [isSupabaseAvailable])

  // Resolver el rol: usa cache de sessionStorage si esta fresco (el admin
  // no espera el viaje a la base) y evita consultas duplicadas por email.
  // Si hay cache se revalida en segundo plano sin bloquear la UI.
  const resolveUserRole = (email: string | undefined) => {
    if (!email) {
      setUserRole("usuario")
      setLoading(false)
      return
    }

    if (lastRoleEmail.current === email) return
    lastRoleEmail.current = email

    const cached = readRoleCache(email)
    if (cached) {
      setUserRole(cached)
      setLoading(false)
    }

    // Con cache: revalidacion en segundo plano. Sin cache: fetch normal.
    fetchUserRole(email)
  }

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
        const role = (data as any).role || "usuario"
        setUserRole(role)
        writeRoleCache(email, role)
      } else {
        // No se encontro registro. Puede que link_auth_user aun no termino.
        // Reintentar una vez despues de un breve delay.
        if (retryCount < 1) {
          setTimeout(() => fetchUserRole(email, retryCount + 1), 1500)
          return
        }
        setUserRole("usuario")
        writeRoleCache(email, "usuario")
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
