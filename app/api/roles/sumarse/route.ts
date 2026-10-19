import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import {
  normalizarDatosRol,
  normalizarNombre,
  type DatosRol,
  type RolEvento,
} from "@/lib/roles"

export const dynamic = "force-dynamic"

// Limite best-effort: en serverless cada instancia tiene su propio Map, pero
// alcanza para frenar al que se queda apretando el boton, que es el caso real.
const VENTANA_MS = 10 * 60 * 1000
const MAX_ENVIOS = 12

const envios = new Map<string, { cantidad: number; reinicioEn: number }>()

function superaLimite(clave: string): boolean {
  const ahora = Date.now()
  const registro = envios.get(clave)

  if (!registro || registro.reinicioEn < ahora) {
    envios.set(clave, { cantidad: 1, reinicioEn: ahora + VENTANA_MS })
    return false
  }

  registro.cantidad += 1
  return registro.cantidad > MAX_ENVIOS
}

/**
 * POST /api/roles/sumarse
 * Body: { nombre, pedalea, ayuda, tareas[], familiares, familiares_detalle, notas }
 *
 * Alta publica de la lista de roles del dia del evento: cualquiera puede
 * anotarse como "pedaleo", "ayudo", "ayudo y no pedaleo" sin iniciar sesion.
 *
 * Pasa por el servidor (y no por Supabase desde el navegador) para que el anon
 * no tenga permiso de escritura sobre la tabla: asi nadie puede borrar ni
 * reescribir la lista entera desde la consola del navegador.
 *
 * Si el nombre ya esta en la lista, se actualiza esa fila en vez de duplicarla
 * (la misma idea que el UPSERT por DNI de la remera). La excepcion son las
 * filas que el admin marco como fijadas: esas solo las cambia el panel.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const datos = normalizarDatosRol((body ?? {}) as Partial<DatosRol>)

  if (!datos) {
    return NextResponse.json({ error: "Escribí tu nombre para sumarte a la lista." }, { status: 400 })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip"
  if (superaLimite(ip)) {
    return NextResponse.json(
      { error: "Ya cargaste varios en los últimos minutos. Esperá un rato o escribinos." },
      { status: 429 },
    )
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: "El servidor no tiene configurada la conexión con la base." },
      { status: 500 },
    )
  }

  const clave = normalizarNombre(datos.nombre)

  const { data: existente, error: errorBusqueda } = (await supabase
    .from("roles_evento")
    .select("id, nombre, bloqueado")
    .eq("clave", clave)
    .maybeSingle()) as {
    data: Pick<RolEvento, "id" | "nombre" | "bloqueado"> | null
    error: { message: string } | null
  }

  if (errorBusqueda) {
    console.error("Error buscando el rol:", errorBusqueda)
    return NextResponse.json(
      { error: `No pudimos guardarlo: ${errorBusqueda.message}` },
      { status: 500 },
    )
  }

  if (existente?.bloqueado) {
    return NextResponse.json(
      {
        error:
          "Tu lugar ya lo acomodó el equipo, así que no se puede cambiar desde acá. Escribinos y lo corregimos.",
      },
      { status: 409 },
    )
  }

  // Lo que se guarda: nunca `bloqueado` ni `orden` (eso es del panel) ni
  // `participante_id` (el formulario publico no elige inscriptos).
  const fila = {
    nombre: datos.nombre,
    pedalea: datos.pedalea,
    ayuda: datos.ayuda,
    tareas: datos.tareas,
    familiares: datos.familiares,
    familiares_detalle: datos.familiares_detalle,
    notas: datos.notas,
    cargado_por: "publico",
  }

  const consulta = existente
    ? supabase.from("roles_evento").update(fila).eq("id", existente.id).select().single()
    : supabase.from("roles_evento").insert(fila).select().single()

  // El .select() no es decorativo: sin el, una fila filtrada por RLS parece un
  // guardado exitoso.
  const { data, error } = await consulta

  if (error) {
    console.error("Error guardando el rol:", error)
    return NextResponse.json({ error: `No pudimos guardarlo: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    actualizado: Boolean(existente),
    rol: data,
    mensaje: existente
      ? `Actualizamos lo de ${datos.nombre} en la lista.`
      : `Listo, ${datos.nombre} quedó en la lista.`,
  })
}
