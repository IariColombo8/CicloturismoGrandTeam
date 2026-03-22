import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Inscripcion {
  id: string
  nombre: string
  apellido: string
  email: string
  dni: string
  telefono: string
  estado: "pendiente" | "confirmada" | "rechazada"
  categoria: string
  provincia: string
  fechaInscripcion: string
  numeroInscripcion: number
  precio: string
  checkedIn?: boolean
  checkedInAt?: unknown
  checkedInBy?: string
  tokenQR?: string
  [key: string]: unknown
}

const COLLECTION = "Participantes"

// Suscripción en tiempo real a todas las inscripciones
export function onInscripciones(callback: (data: Inscripcion[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("fechaInscripcion", "desc"))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Inscripcion[]
    callback(data)
  })
}

// Actualizar estado de una inscripción
export async function actualizarEstado(
  id: string,
  estado: string,
  nota?: string
) {
  const docRef = doc(db, COLLECTION, id)
  const updateData: Record<string, unknown> = { estado }
  if (nota) updateData.notaEstado = nota
  await updateDoc(docRef, updateData)
}

// Buscar participante por DNI
export async function buscarPorDNI(dni: string): Promise<Inscripcion | null> {
  const q = query(collection(db, COLLECTION), where("dni", "==", dni))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Inscripcion
}

// Buscar participante por token QR
export async function buscarPorTokenQR(token: string): Promise<Inscripcion | null> {
  const q = query(collection(db, COLLECTION), where("tokenQR", "==", token))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Inscripcion
}

// Hacer check-in
export async function hacerCheckIn(id: string, adminEmail: string) {
  const docRef = doc(db, COLLECTION, id)
  const { serverTimestamp } = await import("firebase/firestore")
  await updateDoc(docRef, {
    checkedIn: true,
    checkedInAt: serverTimestamp(),
    checkedInBy: adminEmail,
  })
}
