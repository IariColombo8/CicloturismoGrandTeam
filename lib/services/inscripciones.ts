import { supabase } from "@/lib/supabase"
import type { Participante } from "@/types/database"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface Inscripcion {
  id: string
  nombre: string
  apellido: string
  email: string
  dni: string
  telefono: string
  estado: "pendiente" | "confirmada" | "rechazada" | "aprobado"
  categoria: string
  provincia: string
  fechaInscripcion: string
  numeroInscripcion: number
  precio: string
  checkedIn?: boolean
  checkedInAt?: string | null
  checkedInBy?: string
  tokenQR?: string
  [key: string]: unknown
}

// Mapear fila de Supabase (snake_case) a formato frontend (camelCase)
function mapParticipante(row: Participante): Inscripcion {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email || "",
    dni: row.dni,
    telefono: row.telefono || "",
    estado: row.estado,
    categoria: row.categoria || "",
    provincia: row.provincia || "",
    fechaInscripcion: row.fecha_inscripcion,
    numeroInscripcion: row.numero_inscripcion || 0,
    precio: row.precio || "",
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at,
    checkedInBy: row.checked_in_by || undefined,
    tokenQR: row.token_qr || undefined,
  }
}

// Obtener todos los participantes (fetch inicial)
async function fetchParticipantes(): Promise<Inscripcion[]> {
  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .order("fecha_inscripcion", { ascending: false })

  if (error) {
    console.error("Error al obtener participantes:", error)
    return []
  }

  return (data || []).map(mapParticipante)
}

// Suscripcion en tiempo real a todas las inscripciones (participantes)
export function onInscripciones(callback: (data: Inscripcion[]) => void): () => void {
  // Carga inicial
  fetchParticipantes().then(callback)

  // Suscripcion a cambios en tiempo real
  const channel: RealtimeChannel = supabase
    .channel("participantes-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "participantes" },
      () => {
        // Re-fetch en cada cambio para mantener el orden correcto
        fetchParticipantes().then(callback)
      }
    )
    .subscribe()

  // Retornar funcion de limpieza
  return () => {
    supabase.removeChannel(channel)
  }
}

// Actualizar estado de una inscripcion (participante)
export async function actualizarEstado(
  id: string,
  estado: string,
  nota?: string
) {
  const updateData: Record<string, unknown> = { estado }
  if (nota) updateData.nota_estado = nota

  const { error } = await supabase
    .from("participantes")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error al actualizar estado:", error)
    throw error
  }
}

// Buscar participante por DNI
export async function buscarPorDNI(dni: string): Promise<Inscripcion | null> {
  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .eq("dni", dni)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error al buscar por DNI:", error)
    return null
  }

  return data ? mapParticipante(data) : null
}

// Buscar participante por token QR
export async function buscarPorTokenQR(token: string): Promise<Inscripcion | null> {
  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .eq("token_qr", token)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error al buscar por token QR:", error)
    return null
  }

  return data ? mapParticipante(data) : null
}

// Hacer check-in
export async function hacerCheckIn(id: string, adminEmail: string) {
  const { error } = await supabase
    .from("participantes")
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      checked_in_by: adminEmail,
    })
    .eq("id", id)

  if (error) {
    console.error("Error al hacer check-in:", error)
    throw error
  }
}
