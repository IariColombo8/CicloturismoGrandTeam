// lib/notasCaja.ts
// Notas de caja: observaciones sueltas sobre la plata que no son un gasto ni un
// ingreso formal ("pagaron $700 uruguayos", "falta la transferencia de Lore").
// Se cargan desde /admin/registro-inscripciones y se leen tambien en
// /admin/gastos y en el PDF de finanzas.

import { supabase } from "@/lib/supabase"

export interface NotaCaja {
  id: string
  texto: string
  /** Se marca cuando el tema quedo cerrado, en vez de borrar la nota. */
  resuelta: boolean
  creadaPor: string | null
  creadaEn: string
}

export function mapNotaCaja(fila: any): NotaCaja {
  return {
    id: fila.id,
    texto: fila.texto || "",
    resuelta: Boolean(fila.resuelta),
    creadaPor: fila.creada_por ?? null,
    creadaEn: fila.creada_en,
  }
}

/** Trae las notas, las pendientes primero y dentro de cada grupo las mas nuevas. */
export async function listarNotasCaja(): Promise<NotaCaja[]> {
  const { data, error } = await supabase
    .from("notas_caja")
    .select("*")
    .order("resuelta", { ascending: true })
    .order("creada_en", { ascending: false })

  if (error) throw error
  return (data || []).map(mapNotaCaja)
}

export async function agregarNotaCaja(texto: string, email: string | null): Promise<void> {
  const limpio = texto.trim()
  if (!limpio) return

  const { error } = await supabase.from("notas_caja").insert({ texto: limpio, creada_por: email })
  if (error) throw error
}

export async function marcarNotaCaja(id: string, resuelta: boolean): Promise<void> {
  const { error } = await supabase.from("notas_caja").update({ resuelta }).eq("id", id)
  if (error) throw error
}

export async function borrarNotaCaja(id: string): Promise<void> {
  const { error } = await supabase.from("notas_caja").delete().eq("id", id)
  if (error) throw error
}
