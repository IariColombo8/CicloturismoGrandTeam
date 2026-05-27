/**
 * Script de migracion: Firestore -> Supabase
 *
 * Uso:
 *   npx tsx scripts/migrate-firestore-to-supabase.ts
 *
 * Requiere variables de entorno en .env.local:
 *   - NEXT_PUBLIC_FIREBASE_* (Firebase)
 *   - NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase)
 *
 * IMPORTANTE: Ejecutar UNA SOLA VEZ. Si se ejecuta de nuevo, puede duplicar datos.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore"
import { createClient } from "@supabase/supabase-js"

// --- Configuracion Firebase ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)

// --- Configuracion Supabase ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Utilidades ---

// Convierte un Firestore Timestamp a ISO string
function toISOString(value: unknown): string | null {
  if (!value) return null
  // Firestore Timestamp tiene .toDate()
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  // Ya es string
  if (typeof value === "string") return value
  // Es un Date
  if (value instanceof Date) return value.toISOString()
  // Firestore puede tener {seconds, nanoseconds}
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const ts = value as { seconds: number; nanoseconds: number }
    return new Date(ts.seconds * 1000).toISOString()
  }
  return null
}

// Normalizar valores de estado (Firestore usa "confirmado", Supabase espera "confirmada")
function normalizeEstado(estado: string, allowedValues: string[]): string {
  if (!estado) return "pendiente"
  const normalized = estado.toLowerCase().trim()
  // Mapear variantes conocidas
  if (normalized === "confirmado") return "confirmada"
  if (normalized === "aprobada") return "aprobado"
  if (normalized === "rechazado") return "rechazada"
  // Si esta en la lista permitida, devolver tal cual
  if (allowedValues.includes(normalized)) return normalized
  // Fallback
  return "pendiente"
}

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`)
}

// --- Migracion de cada coleccion ---

async function migrateAdministradores() {
  log("👤", "Migrando coleccion 'administrador'...")
  const snapshot = await getDocs(collection(db, "administrador"))

  if (snapshot.empty) {
    log("⚠️", "  Coleccion 'administrador' vacia o no existe")
    return 0
  }

  const rows = snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      email: d.email || docSnap.id.replace(/_/g, (m: string, i: number, s: string) => {
        // Reconstruir email desde emailKey: primer _ es @, resto son .
        // Patron: email.replace(/[@.]/g, "_")
        // No es reversible de forma confiable, usar el campo email
        return m
      }),
      display_name: d.displayName || d.display_name || null,
      photo_url: d.photoURL || d.photo_url || null,
      role: d.role || "usuario",
      login_method: d.loginMethod || d.login_method || "email",
      created_at: toISOString(d.createdAt) || toISOString(d.created_at) || new Date().toISOString(),
      last_login: toISOString(d.lastLogin) || toISOString(d.last_login) || new Date().toISOString(),
    }
  })

  if (rows.length === 0) return 0

  const { error } = await supabase.from("administradores").upsert(rows, { onConflict: "email" })
  if (error) {
    log("❌", `  Error migrando administradores: ${error.message}`)
    console.error(error)
    return 0
  }

  log("✅", `  ${rows.length} administradores migrados`)
  return rows.length
}

async function migrateInscripciones() {
  log("📝", "Migrando coleccion 'inscripciones'...")
  const snapshot = await getDocs(collection(db, "inscripciones"))

  if (snapshot.empty) {
    log("⚠️", "  Coleccion 'inscripciones' vacia o no existe")
    return 0
  }

  const rows = snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      numero_inscripcion: d.numeroInscripcion || d.numero_inscripcion || 0,
      nombres: d.nombres || "",
      apellidos: d.apellidos || "",
      cedula: d.cedula || d.dni || "",
      email: d.email || "",
      telefono: d.telefono || "",
      fecha_nacimiento: d.fechaNacimiento || d.fecha_nacimiento || null,
      pais: d.pais || null,
      ciudad: d.ciudad || null,
      nombre_emergencia: d.nombreEmergencia || d.nombre_emergencia || null,
      telefono_emergencia: d.telefonoEmergencia || d.telefono_emergencia || null,
      relacion_emergencia: d.relacionEmergencia || d.relacion_emergencia || null,
      ha_recorrido_distancia: d.haRecorridoDistancia || d.ha_recorrido_distancia || null,
      talla_camiseta: d.tallaCamiseta || d.talla_camiseta || null,
      tipo_sangre: d.tipoSangre || d.tipo_sangre || null,
      tiene_alergias: d.tieneAlergias || d.tiene_alergias || null,
      alergias: d.alergias || null,
      tiene_problemas_salud: d.tieneProblemasSalud || d.tiene_problemas_salud || null,
      condiciones_medicas: d.condicionesMedicas || d.condiciones_medicas || null,
      metodo_pago: d.metodoPago || d.metodo_pago || "transferencia",
      numero_referencia: d.numeroReferencia || d.numero_referencia || null,
      comprobante_base64: d.comprobanteBase64 || d.comprobante_base64 || null,
      estado: normalizeEstado(d.estado, ["pendiente", "confirmada", "rechazada"]),
      aprobado_por_admin: d.aprobadoPorAdmin || d.aprobado_por_admin || false,
      nota_estado: d.notaEstado || d.nota_estado || null,
      fecha_inscripcion: toISOString(d.fechaInscripcion) || toISOString(d.fecha_inscripcion) || new Date().toISOString(),
    }
  })

  if (rows.length === 0) return 0

  // Insertar en lotes de 50 para evitar limites
  let migrated = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await supabase.from("inscripciones").upsert(batch, { onConflict: "id" })
    if (error) {
      log("❌", `  Error migrando inscripciones (lote ${i}): ${error.message}`)
      console.error(error)
    } else {
      migrated += batch.length
    }
  }

  log("✅", `  ${migrated} inscripciones migradas`)
  return migrated
}

async function migrateParticipantes() {
  log("🏃", "Migrando coleccion 'Participantes'...")
  const snapshot = await getDocs(collection(db, "Participantes"))

  if (snapshot.empty) {
    log("⚠️", "  Coleccion 'Participantes' vacia o no existe")
    return 0
  }

  const rows = snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      nombre: d.nombre || "",
      apellido: d.apellido || "",
      dni: d.dni || "",
      email: d.email || null,
      telefono: d.telefono || null,
      categoria: d.categoria || null,
      provincia: d.provincia || null,
      numero_inscripcion: d.numeroInscripcion || d.numero_inscripcion || null,
      estado: normalizeEstado(d.estado, ["pendiente", "confirmada", "rechazada", "aprobado"]),
      precio: d.precio ? String(d.precio) : null,
      fecha_inscripcion: toISOString(d.fechaInscripcion) || toISOString(d.fecha_inscripcion) || new Date().toISOString(),
      checked_in: d.checkedIn || d.checked_in || false,
      checked_in_at: toISOString(d.checkedInAt) || toISOString(d.checked_in_at) || null,
      checked_in_by: d.checkedInBy || d.checked_in_by || null,
      token_qr: d.tokenQR || d.token_qr || null,
      grupo_sanguineo: d.grupoSanguineo || d.grupo_sanguineo || null,
      talla_camiseta: d.tallaCamiseta || d.talla_camiseta || null,
    }
  })

  if (rows.length === 0) return 0

  // Insertar en lotes
  let migrated = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await supabase.from("participantes").insert(batch)
    if (error) {
      log("❌", `  Error migrando participantes (lote ${i}): ${error.message}`)
      console.error(error)
    } else {
      migrated += batch.length
    }
  }

  log("✅", `  ${migrated} participantes migrados`)
  return migrated
}

async function migrateEventos() {
  log("🎪", "Migrando coleccion 'eventos'...")
  const snapshot = await getDocs(collection(db, "eventos"))

  if (snapshot.empty) {
    log("⚠️", "  Coleccion 'eventos' vacia o no existe")
    return 0
  }

  const rows = snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      nombre: d.nombre || null,
      fecha: d.fecha || null,
      ubicacion: d.ubicacion || null,
      recorrido: d.recorrido || null,
      cupo_maximo: d.cupoMaximo || d.cupo_maximo || 300,
      costo_inscripcion: d.costoInscripcion || d.costo_inscripcion || 0,
      alias_transferencia: d.aliasTransferencia || d.alias_transferencia || null,
      datos_transferencia: d.datosTransferencia || d.datos_transferencia || null,
      hora_largada: d.horaLargada || d.hora_largada || null,
      punto_encuentro: d.puntoEncuentro || d.punto_encuentro || null,
      incluye: d.incluye || [],
      redes_sociales: d.redesSociales || d.redes_sociales || {},
      telefono_contacto: d.telefonoContacto || d.telefono_contacto || null,
      email_contacto: d.emailContacto || d.email_contacto || null,
      inscripciones_abiertas: d.inscripcionesAbiertas !== undefined ? d.inscripcionesAbiertas : (d.inscripciones_abiertas !== undefined ? d.inscripciones_abiertas : true),
      categoria: d.categoria || null,
    }
  })

  if (rows.length === 0) return 0

  const { error } = await supabase.from("eventos").upsert(rows, { onConflict: "id" })
  if (error) {
    log("❌", `  Error migrando eventos: ${error.message}`)
    console.error(error)
    return 0
  }

  log("✅", `  ${rows.length} eventos migrados`)
  return rows.length
}

async function migrateGastos() {
  log("💰", "Migrando coleccion 'gastos_2026'...")
  const snapshot = await getDocs(collection(db, "gastos_2026"))

  if (snapshot.empty) {
    log("⚠️", "  Coleccion 'gastos_2026' vacia o no existe")
    return 0
  }

  const rows = snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      descripcion: d.descripcion || "",
      monto: d.monto || 0,
      categoria: d.categoria || "otro",
      estado: d.estado || "pendiente",
      fecha: toISOString(d.fecha) || new Date().toISOString(),
      comprobante: d.comprobante || null,
      creado_por: d.creadoPor || d.creado_por || "desconocido",
      rol_creador: d.rolCreador || d.rol_creador || null,
      aprobado_por: d.aprobadoPor || d.aprobado_por || null,
      fecha_aprobacion: toISOString(d.fechaAprobacion) || toISOString(d.fecha_aprobacion) || null,
      motivo_rechazo: d.motivoRechazo || d.motivo_rechazo || null,
      evento_id: d.eventoId || d.evento_id || null,
    }
  })

  if (rows.length === 0) return 0

  const { error } = await supabase.from("gastos").insert(rows)
  if (error) {
    log("❌", `  Error migrando gastos: ${error.message}`)
    console.error(error)
    return 0
  }

  log("✅", `  ${rows.length} gastos migrados`)
  return rows.length
}

async function migrateCounters() {
  log("🔢", "Migrando coleccion 'counters'...")

  try {
    const docRef = doc(db, "counters", "inscripciones_2026")
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      log("⚠️", "  Documento 'counters/inscripciones_2026' no existe")
      return 0
    }

    const d = docSnap.data()
    const { error } = await supabase.from("counters").upsert({
      id: "inscripciones_2026",
      count: d.count || 0,
    }, { onConflict: "id" })

    if (error) {
      log("❌", `  Error migrando counters: ${error.message}`)
      return 0
    }

    log("✅", `  Counter migrado: inscripciones_2026 = ${d.count}`)
    return 1
  } catch (error) {
    log("⚠️", `  Error accediendo a counters: ${error}`)
    return 0
  }
}

async function migrateEventSettings() {
  log("⚙️", "Migrando coleccion 'settings/eventSettings'...")

  try {
    const docRef = doc(db, "settings", "eventSettings")
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      log("⚠️", "  Documento 'settings/eventSettings' no existe")
      return 0
    }

    const d = docSnap.data()
    const { error } = await supabase.from("event_settings").upsert({
      id: "eventSettings",
      cupo_maximo: d.cupoMaximo || d.cupo_maximo || 300,
      precio: d.precio || 35000,
      costo_inscripcion: d.costoInscripcion || d.costo_inscripcion || null,
      metodo_pago: d.metodoPago || d.metodo_pago || "Transferencia bancaria",
      inscripciones_abiertas: d.inscripcionesAbiertas !== undefined ? d.inscripcionesAbiertas : true,
      current_year: d.currentYear || d.current_year || 2026,
    }, { onConflict: "id" })

    if (error) {
      log("❌", `  Error migrando event_settings: ${error.message}`)
      return 0
    }

    log("✅", `  Event settings migrado`)
    return 1
  } catch (error) {
    log("⚠️", `  Error accediendo a event settings: ${error}`)
    return 0
  }
}

// --- Ejecucion principal ---

async function main() {
  console.log("=".repeat(60))
  console.log("  MIGRACION: Firestore -> Supabase")
  console.log("  Grand Team Bike 2026")
  console.log("=".repeat(60))
  console.log()

  // Verificar conexiones
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("ERROR: Variables de Firebase no configuradas en .env.local")
    process.exit(1)
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("ERROR: Variables de Supabase no configuradas en .env.local")
    process.exit(1)
  }

  log("🔗", `Firebase proyecto: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
  log("🔗", `Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log()

  // Verificar que Supabase tiene las tablas
  const { error: testError } = await supabase.from("administradores").select("id").limit(1)
  if (testError) {
    console.error("ERROR: No se puede acceder a la tabla 'administradores' en Supabase.")
    console.error("  Asegurate de ejecutar el schema.sql primero en el SQL Editor de Supabase.")
    console.error(`  Detalle: ${testError.message}`)
    process.exit(1)
  }

  log("✅", "Conexion a Supabase verificada\n")

  // Ejecutar migraciones
  const resultados: Record<string, number> = {}

  resultados.administradores = await migrateAdministradores()
  resultados.inscripciones = await migrateInscripciones()
  resultados.participantes = await migrateParticipantes()
  resultados.eventos = await migrateEventos()
  resultados.gastos = await migrateGastos()
  resultados.counters = await migrateCounters()
  resultados.event_settings = await migrateEventSettings()

  // Resumen
  console.log()
  console.log("=".repeat(60))
  console.log("  RESUMEN DE MIGRACION")
  console.log("=".repeat(60))

  let totalRegistros = 0
  for (const [tabla, count] of Object.entries(resultados)) {
    const status = count > 0 ? "✅" : "⚠️"
    console.log(`  ${status} ${tabla}: ${count} registros`)
    totalRegistros += count
  }

  console.log()
  console.log(`  Total: ${totalRegistros} registros migrados`)
  console.log("=".repeat(60))

  if (totalRegistros === 0) {
    console.log("\n⚠️  No se migraron datos. Posibles causas:")
    console.log("  1. Las colecciones de Firestore estan vacias")
    console.log("  2. Los nombres de las colecciones son diferentes")
    console.log("  3. Las credenciales de Firebase no son correctas")
    console.log("  4. Las politicas RLS de Supabase bloquean la insercion")
    console.log("     (Solucion: deshabilitar RLS temporalmente o usar service_role key)")
  }

  process.exit(0)
}

main().catch((error) => {
  console.error("Error fatal en la migracion:", error)
  process.exit(1)
})
