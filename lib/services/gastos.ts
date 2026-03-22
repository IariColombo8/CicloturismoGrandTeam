import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Gasto {
  id: string
  descripcion: string
  monto: number
  categoria: string
  estado: "pendiente" | "aprobado" | "rechazado"
  creadoPor: string
  fecha: unknown
  comprobante?: string
  motivoRechazo?: string
  [key: string]: unknown
}

const COLLECTION = "gastos_2026"

// Suscripción en tiempo real a gastos
export function onGastos(callback: (data: Gasto[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("fecha", "desc"))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Gasto[]
    callback(data)
  })
}

// Crear gasto
export async function crearGasto(gasto: {
  descripcion: string
  monto: number
  categoria: string
  creadoPor: string
  comprobante?: string
}) {
  return addDoc(collection(db, COLLECTION), {
    ...gasto,
    estado: "pendiente",
    fecha: serverTimestamp(),
  })
}

// Aprobar gasto
export async function aprobarGasto(id: string, aprobadoPor: string) {
  await updateDoc(doc(db, COLLECTION, id), {
    estado: "aprobado",
    aprobadoPor,
    fechaAprobacion: serverTimestamp(),
  })
}

// Rechazar gasto
export async function rechazarGasto(id: string, motivo: string) {
  await updateDoc(doc(db, COLLECTION, id), {
    estado: "rechazado",
    motivoRechazo: motivo,
  })
}

// Eliminar gasto
export async function eliminarGasto(id: string) {
  await deleteDoc(doc(db, COLLECTION, id))
}
