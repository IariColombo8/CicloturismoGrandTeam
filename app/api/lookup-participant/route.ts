import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// GET /api/lookup-participant?dni=XXXXXXXX
// Busca un participante por DNI y devuelve únicamente datos personales reutilizables.
export async function GET(req: NextRequest) {
  const dni = req.nextUrl.searchParams.get("dni")?.replace(/\D/g, "")

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
    localidad: string | null
    nombre_emergencia: string | null
    telefono_emergencia: string | null
    relacion_emergencia: string | null
    ha_recorrido_distancia: string | null
    grupo_ciclistas: string | null
    grupo_sanguineo: string | null
    es_celiaco: boolean | null
    tiene_alergias: string | null
    alergias: string | null
    tiene_problemas_salud: string | null
    condicion_salud: string | null
    anios: number[] | null
  }

  const { data, error } = (await supabase
    .from("participantes")
    .select(
      "nombre, apellido, email, telefono, fecha_nacimiento, pais, localidad, " +
        "nombre_emergencia, telefono_emergencia, relacion_emergencia, " +
        "ha_recorrido_distancia, grupo_ciclistas, grupo_sanguineo, es_celiaco, " +
        "tiene_alergias, alergias, tiene_problemas_salud, condicion_salud, anios"
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
      nombre: data.nombre?.trim() ?? "",
      apellido: data.apellido?.trim() ?? "",
      email: data.email?.trim() ?? "",
      telefono: data.telefono?.trim() ?? "",
      fechaNacimiento: data.fecha_nacimiento ?? "",
      pais: data.pais?.trim() ?? "",
      localidad: data.localidad?.trim() ?? "",
      nombreEmergencia: data.nombre_emergencia?.trim() ?? "",
      telefonoEmergencia: data.telefono_emergencia?.trim() ?? "",
      relacionEmergencia: data.relacion_emergencia?.trim() ?? "",
      haRecorridoDistancia: data.ha_recorrido_distancia ?? "",
      grupoCiclistas: data.grupo_ciclistas?.trim() || "Sin grupo",
      grupoSanguineo: data.grupo_sanguineo?.toUpperCase() ?? "",
      esCeliaco: data.es_celiaco === null ? "" : data.es_celiaco ? "si" : "no",
      tieneAlergias: data.tiene_alergias ?? "",
      alergias: data.alergias?.trim() ?? "",
      tieneProblemasSalud: data.tiene_problemas_salud ?? "",
      condicionSalud: data.condicion_salud?.trim() ?? "",
    },
  })
}
