import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// GET /api/lookup-participant?dni=XXXXXXXX
//
// Busca un participante por DNI para precargar el formulario de inscripción.
//
// Si la persona YA está inscripta en esta edición (pendiente o confirmada), no
// se devuelven sus datos: solo el nombre y el estado, para poder saludarla y
// mandarla a /mi-qr. No hay nada que completar —ya está inscripta— y así sus
// datos no quedan a la vista de cualquiera que sepa un DNI.
//
// Si la inscripción anterior fue rechazada, sí vuelven los datos: la persona
// tiene que poder cargarla de nuevo sin escribir todo otra vez.
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
    estado: string | null
  }

  const { data, error } = (await supabase
    .from("participantes")
    .select(
      "nombre, apellido, email, telefono, fecha_nacimiento, pais, localidad, " +
        "nombre_emergencia, telefono_emergencia, relacion_emergencia, " +
        "ha_recorrido_distancia, grupo_ciclistas, grupo_sanguineo, es_celiaco, " +
        "tiene_alergias, alergias, tiene_problemas_salud, condicion_salud, anios, estado"
    )
    .eq("dni", dni)
    .maybeSingle()) as { data: ParticipanteRow | null; error: { message: string } | null }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ found: false, data: null })
  }

  const esDeEstaEdicion = (data.anios ?? []).includes(2026)
  const estado = (data.estado ?? "pendiente").toLowerCase()
  // "aprobado" es como quedaron algunas inscripciones migradas.
  const inscripcionVigente =
    esDeEstaEdicion && ["pendiente", "confirmada", "aprobado", "aprobada"].includes(estado)

  if (inscripcionVigente) {
    return NextResponse.json({
      found: true,
      isEdicion: true,
      yaInscripto: true,
      estado,
      nombre: data.nombre?.trim() ?? "",
      // Sin datos: no hay nada que completar y no se muestran a quien sepa el DNI.
      data: null,
    })
  }

  return NextResponse.json({
    found: true,
    isEdicion: esDeEstaEdicion,
    yaInscripto: false,
    estado: esDeEstaEdicion ? estado : null,
    nombre: data.nombre?.trim() ?? "",
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
