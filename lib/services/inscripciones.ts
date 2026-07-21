import { supabase } from "@/lib/supabase"
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
  pais: string
  localidad: string
  grupoCiclistas: string
  esCeliaco: boolean | null
  fechaInscripcion: string
  numeroInscripcion: number
  precio: string
  checkedIn?: boolean
  checkedInAt?: string | null
  checkedInBy?: string
  tokenQR?: string
  [key: string]: unknown
}

type ParticipanteRow = {
  id: string
  nombre: string
  apellido: string
  email: string | null
  dni: string
  telefono: string | null
  estado: Inscripcion["estado"]
  categoria: string | null
  pais: string | null
  localidad: string | null
  grupo_ciclistas: string | null
  es_celiaco: boolean | null
  fecha_inscripcion: string | null
  numero_inscripcion: number | null
  precio: string | number | null
  checked_in: boolean | null
  checked_in_at: string | null
  checked_in_by: string | null
  token_qr: string | null
}

function mapParticipante(row: ParticipanteRow): Inscripcion {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email || "",
    dni: row.dni,
    telefono: row.telefono || "",
    estado: row.estado,
    categoria: row.categoria || "",
    pais: row.pais || "",
    localidad: row.localidad || "",
    grupoCiclistas: row.grupo_ciclistas || "Sin grupo",
    esCeliaco: row.es_celiaco,
    fechaInscripcion: row.fecha_inscripcion || "",
    numeroInscripcion: row.numero_inscripcion || 0,
    precio: row.precio == null ? "" : String(row.precio),
    checkedIn: !!row.checked_in,
    checkedInAt: row.checked_in_at,
    checkedInBy: row.checked_in_by || undefined,
    tokenQR: row.token_qr || undefined,
  }
}

async function fetchParticipantes(): Promise<Inscripcion[]> {
  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .order("fecha_inscripcion", { ascending: false })

  if (error) {
    console.error("Error al obtener participantes:", error)
    return []
  }

  return ((data || []) as ParticipanteRow[]).map(mapParticipante)
}

export function onInscripciones(callback: (data: Inscripcion[]) => void): () => void {
  fetchParticipantes().then(callback)

  const channel: RealtimeChannel = supabase
    .channel("participantes-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "participantes" },
      () => fetchParticipantes().then(callback)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function actualizarEstado(id: string, estado: string, nota?: string) {
  const updateData: Record<string, unknown> = { estado }
  if (nota) updateData.nota_estado = nota

  const { error } = await supabase.from("participantes").update(updateData).eq("id", id)

  if (error) {
    console.error("Error al actualizar estado:", error)
    throw error
  }
}

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

  return data ? mapParticipante(data as ParticipanteRow) : null
}

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

  return data ? mapParticipante(data as ParticipanteRow) : null
}

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
