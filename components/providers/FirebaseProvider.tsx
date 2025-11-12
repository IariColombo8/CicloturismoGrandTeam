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
    try {
      if (auth && typeof auth.onAuthStateChanged === "function") {
        setIsFirebaseAvailable(true)
      } else {
        console.warn("Firebase Auth no está disponible. Algunas funcionalidades estarán limitadas.")
        setIsFirebaseAvailable(false)
        setLoading(false)
      }
    } catch (error) {
      console.error("Error al verificar Firebase:", error)
      setIsFirebaseAvailable(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseAvailable) return

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        try {
          const emailKey = currentUser.email?.replace(/[@.]/g, "_") || ""
          const userDoc = doc(db, "administrador", emailKey)
          const docSnap = await getDoc(userDoc)

          if (docSnap.exists()) {
            const userData = docSnap.data()
            setUserRole(userData.role || "usuario")
          } else {
            setUserRole("usuario")
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
          setUserRole("usuario")
        }
      } else {
        setUserRole(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [isFirebaseAvailable])

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
