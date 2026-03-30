"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface FirebaseContextType {
  user: User | null
  loading: boolean
  eventSettings: any
  isFirebaseAvailable: boolean
  userRole: string | null // Added userRole to context
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  eventSettings: null,
  isFirebaseAvailable: false,
  userRole: null,
})

export const useFirebaseContext = () => useContext(FirebaseContext)

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventSettings, setEventSettings] = useState(null)
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null) // Added userRole state

  useEffect(() => {
    let available = false
    try {
      available = !!(auth && typeof auth.onAuthStateChanged === "function")
    } catch {
      available = false
    }

    if (!available) {
      setIsFirebaseAvailable(false)
      setLoading(false)
      return
    }

    setIsFirebaseAvailable(true)

    // Cargar rol desde caché para mostrar UI inmediatamente
    try {
      const cachedRole = sessionStorage.getItem("gtb_userRole")
      if (cachedRole) setUserRole(cachedRole)
    } catch {}

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        // Si ya tenemos el rol cacheado, no bloqueamos el loading
        let cachedRole: string | null = null
        try { cachedRole = sessionStorage.getItem("gtb_userRole") } catch {}
        if (cachedRole) setLoading(false)

        try {
          const emailKey = currentUser.email?.replace(/[@.]/g, "_") || ""
          const userDoc = doc(db, "administrador", emailKey)
          const docSnap = await getDoc(userDoc)
          const role = docSnap.exists() ? (docSnap.data().role || "usuario") : "usuario"
          setUserRole(role)
          try { sessionStorage.setItem("gtb_userRole", role) } catch {}
        } catch (error) {
          console.error("Error fetching user role:", error)
          setUserRole(cachedRole || "usuario")
        }
      } else {
        setUserRole(null)
        try { sessionStorage.removeItem("gtb_userRole") } catch {}
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, []) // un solo effect, corre una vez

  useEffect(() => {
    const fetchEventSettings = async () => {
      if (!isFirebaseAvailable) {
        setEventSettings({
          cupoMaximo: 300,
          precio: 35000,
          metodoPago: "Transferencia bancaria",
          inscripcionesAbiertas: true,
          currentYear: new Date().getFullYear(),
        })
        return
      }

      try {
        const settingsDoc = doc(db, "settings", "eventSettings")
        const docSnap = await getDoc(settingsDoc)

        if (docSnap.exists()) {
          setEventSettings(docSnap.data())
        } else {
          setEventSettings({
            cupoMaximo: 300,
            precio: 35000,
            metodoPago: "Transferencia bancaria",
            inscripcionesAbiertas: true,
            currentYear: new Date().getFullYear(),
          })
        }
      } catch (error) {
        console.error("Error fetching event settings:", error)
        setEventSettings({
          cupoMaximo: 300,
          precio: 35000,
          metodoPago: "Transferencia bancaria",
          inscripcionesAbiertas: true,
          currentYear: new Date().getFullYear(),
        })
      }
    }

    fetchEventSettings()
  }, [isFirebaseAvailable])

  return (
    <FirebaseContext.Provider value={{ user, loading, eventSettings, isFirebaseAvailable, userRole }}>
      {children}
    </FirebaseContext.Provider>
  )
}
