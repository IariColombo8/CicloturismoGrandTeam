import { supabase } from "@/lib/supabase"
import type { Gasto as GastoDB } from "@/types/database"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface Gasto {
  id: string
  descripcion: string
  monto: number
  categoria: string
  estado: "pendiente" | "aprobado" | "rechazado"
  creadoPor: string
  fecha: string
  comprobante?: string
  motivoRechazo?: string
  [key: string]: unknown
}

// Mapear fila de Supabase (snake_case) a formato frontend (camelCase)
function mapGasto(row: GastoDB): Gasto {
  return {
    id: row.id,
    descripcion: row.descripcion,
    monto: row.monto,
    categoria: row.categoria,
    estado: row.estado,
    creadoPor: row.creado_por,
    fecha: row.fecha,
    comprobante: row.comprobante || undefined,
    motivoRechazo: row.motivo_rechazo || undefined,
    aprobadoPor: row.aprobado_por,
    fechaAprobacion: row.fecha_aprobacion,
    rolCreador: row.rol_creador,
  }
}

// Obtener todos los gastos (fetch inicial)
async function fetchGastos(): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false })

  if (error) {
    console.error("Error al obtener gastos:", error)
    return []
  }

  return (data || []).map(mapGasto)
}

// Suscripcion en tiempo real a gastos
export function onGastos(callback: (data: Gasto[]) => void): () => void {
  // Carga inicial
  fetchGastos().then(callback)

  // Suscripcion a cambios en tiempo real
  const channel: RealtimeChannel = supabase
    .channel("gastos-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "gastos" },
      () => {
        fetchGastos().then(callback)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Crear gasto
export async function crearGasto(gasto: {
  descripcion: string
  monto: number
  categoria: string
  creadoPor: string
  comprobante?: string
}) {
  const { error } = await supabase.from("gastos").insert({
    descripcion: gasto.descripcion,
    monto: gasto.monto,
    categoria: gasto.categoria,
    creado_por: gasto.creadoPor,
    comprobante: gasto.comprobante,
    estado: "pendiente",
    fecha: new Date().toISOString(),
  })

  if (error) {
    console.error("Error al crear gasto:", error)
    throw error
  }
}

// Aprobar gasto
export async function aprobarGasto(id: string, aprobadoPor: string) {
  const { error } = await supabase
    .from("gastos")
    .update({
      estado: "aprobado",
      aprobado_por: aprobadoPor,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Error al aprobar gasto:", error)
    throw error
  }
}

// Rechazar gasto
export async function rechazarGasto(id: string, motivo: string) {
  const { error } = await supabase
    .from("gastos")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo,
    })
    .eq("id", id)

  if (error) {
    console.error("Error al rechazar gasto:", error)
    throw error
  }
}

// Eliminar gasto
export async function eliminarGasto(id: string) {
  const { error } = await supabase
    .from("gastos")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error al eliminar gasto:", error)
    throw error
  }
}
