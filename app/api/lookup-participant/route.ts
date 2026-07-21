import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// GET /api/lookup-participant?dni=XXXXXXXX
// Busca un participante existente por DNI para autocompletar el formulario.
export async function GET(req: NextRequest) {
  const dni = req.nextUrl.searchParams.get("dni")?.trim()

  if (!dni || !/^\d{7,8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
  }

  const supabase = createAdminClient()

  type ParticipanteRow = {
    nombre: string | null
    apellido: string | null
    email: string | null
    telefono: string | null
    fecha_nacimiento: string | null
    pais: string | null
    provincia: string | null
    nombre_emergencia: string | null
    telefono_emergencia: string | null
    relacion_emergencia: string | null
    ha_recorrido_distancia: string | null
    talla_camiseta: string | null
    grupo_sanguineo: string | null
    tiene_alergias: string | null
    alergias: string | null
    tiene_problemas_salud: string | null
    condicion_salud: string | null
    anios: number[] | null
  }

  const { data, error } = (await supabase
    .from("participantes")
    .select(
      "nombre, apellido, email, telefono, fecha_nacimiento, pais, provincia, " +
        "nombre_emergencia, telefono_emergencia, relacion_emergencia, " +
        "ha_recorrido_distancia, talla_camiseta, grupo_sanguineo, tiene_alergias, alergias, " +
        "tiene_problemas_salud, condicion_salud, anios"
    )
    .eq("dni", dni)
    .maybeSingle()) as { data: ParticipanteRow | null; error: { message: string } | null }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ found: false, data: null })
  }

  return NextResponse.json({
    found: true,
    isEdicion: (data.anios ?? []).includes(2026),
    data: {
      nombre: data.nombre ?? "",
      apellido: data.apellido ?? "",
      email: data.email ?? "",
      telefono: data.telefono ?? "",
      fechaNacimiento: data.fecha_nacimiento ?? "",
      paisTelefono: data.pais ?? "",
      localidad: data.provincia ?? "",
      nombreEmergencia: data.nombre_emergencia ?? "",
      telefonoEmergencia: data.telefono_emergencia ?? "",
      relacionEmergencia: data.relacion_emergencia ?? "",
      haRecorridoDistancia: data.ha_recorrido_distancia ?? "",
      talleRemera: data.talla_camiseta ?? "",
      grupoSanguineo: data.grupo_sanguineo ?? "",
      tieneAlergias: data.tiene_alergias ?? "",
      alergias: data.alergias ?? "",
      tieneProblemasSalud: data.tiene_problemas_salud ?? "",
      condicionSalud: data.condicion_salud ?? "",
    },
  })
}
