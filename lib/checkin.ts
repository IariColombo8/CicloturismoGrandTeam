// lib/checkin.ts
// Logica del check-in del dia del evento. Sin React y sin importar Supabase:
// el cliente se recibe por parametro, asi los tests pueden simular varios
// celulares registrando a la misma persona al mismo tiempo.
//
// Tres reglas que no se pueden romper:
//
// 1. UNA PERSONA SE REGISTRA UNA SOLA VEZ, aunque 5 celulares la escaneen en el
//    mismo segundo. No se hace "leer y despues escribir" (dos celulares leen
//    "no registrado" y los dos escriben): se hace un UPDATE condicional
//    (`... WHERE checked_in IS NOT TRUE`). Postgres bloquea la fila, el
//    segundo UPDATE vuelve a evaluar la condicion, ya no se cumple y no toca
//    nada. Ese celular ve "YA REGISTRADO" con quien y a que hora.
// 2. NUNCA UN "EXITOSO" FALSO. El UPDATE va con `.select()`: si la base no
//    devolvio la fila (RLS, la persona no esta confirmada, otro celular gano),
//    se vuelve a leer la fila para decir que paso de verdad.
// 3. SIN SEÑAL NO SE TRABA LA ENTRADA. Si no hay conexion, el registro queda
//    guardado en el celular y se sube solo al volver la señal, con la misma
//    condicion: si mientras tanto otro celular ya lo habia registrado, la base
//    se queda con el primero y no se duplica nada.

/** Columnas que necesita la pantalla de check-in (nada de datos medicos). */
export const CAMPOS_CHECKIN =
  "id, nombre, apellido, dni, numero_inscripcion, estado, checked_in, checked_in_at, checked_in_by, token_qr, grupo_ciclistas, localidad"

export interface FilaCheckIn {
  id: string
  nombre: string | null
  apellido: string | null
  dni: string | null
  numero_inscripcion: number | null
  estado: string | null
  checked_in: boolean | null
  checked_in_at: string | null
  checked_in_by: string | null
  token_qr: string | null
  grupo_ciclistas?: string | null
  localidad?: string | null
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Minusculas, sin acentos, solo letras/numeros separados por un espacio. */
export function normalizarTexto(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function nombreCompleto(f: Pick<FilaCheckIn, "nombre" | "apellido">): string {
  return `${(f.nombre ?? "").trim()} ${(f.apellido ?? "").trim()}`.trim() || "Sin nombre"
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/**
 * Saca el token de lo que leyo la camara. El QR trae el UUID solo, pero por las
 * dudas se acepta tambien una URL o un texto que lo contenga (p. ej. si algun
 * dia el QR pasa a ser un link a /mi-qr).
 */
export function extraerToken(leido: string | null | undefined): string | null {
  const texto = (leido ?? "").trim()
  if (!texto) return null
  const uuid = texto.match(UUID)
  if (uuid) return uuid[0].toLowerCase()
  return texto
}

// ---------------------------------------------------------------------------
// Busqueda inteligente
// ---------------------------------------------------------------------------

/** Distancia de edicion (Levenshtein) con corte temprano: solo importa si es <= max. */
function distanciaHasta(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    let minimoFila = i
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo)
      if (actual[j] < minimoFila) minimoFila = actual[j]
    }
    if (minimoFila > max) return max + 1
    previa = actual
  }
  return previa[b.length]
}

/**
 * Que tan bien una palabra de la busqueda coincide con una palabra del nombre.
 * 0 = no coincide.
 */
function puntajePalabra(busca: string, palabra: string): number {
  if (palabra === busca) return 10
  // Cuanto mas de la palabra cubre lo escrito, mejor: "colomb" se parece mas a
  // "colombo" que a "colombres".
  const cobertura = busca.length / palabra.length
  if (palabra.startsWith(busca)) return 6 + cobertura
  // "lomb" dentro de "colombo": vale, pero menos (y solo desde 3 letras, si no
  // "a" coincidiria con media lista).
  if (busca.length >= 3 && palabra.includes(busca)) return 3 + cobertura
  // Un error de tipeo: "colonbo", "iaar". Solo con 4 letras o mas.
  // Se exige que coincida la primera o la segunda letra: casi nadie le erra a
  // las dos, y evita calcular distancias contra toda la lista en cada tecla.
  if (busca.length >= 4 && (busca[0] === palabra[0] || busca[1] === palabra[1])) {
    const max = busca.length >= 7 ? 2 : 1
    if (distanciaHasta(busca, palabra, max) <= max) return 2
    // Error de tipeo en un pedazo: "colomv" contra "colombo".
    if (palabra.length > busca.length && distanciaHasta(busca, palabra.slice(0, busca.length), 1) <= 1) return 1.5
  }
  return 0
}

// Nombre ya normalizado de cada fila. Normalizar (NFD + regex) es lo caro de la
// busqueda y se hace en cada tecla: se guarda por objeto. La lista se
// reemplaza fila por fila al cambiar (aplicarFila), asi que una fila nueva es
// un objeto nuevo y no queda nada viejo en la cache.
const cacheNombres = new WeakMap<object, { texto: string; palabras: string[]; dni: string }>()

function datosDe(fila: FilaCheckIn) {
  let d = cacheNombres.get(fila)
  if (!d) {
    const texto = normalizarTexto(`${fila.nombre ?? ""} ${fila.apellido ?? ""}`)
    d = { texto, palabras: texto.split(" ").filter(Boolean), dni: (fila.dni ?? "").replace(/\D/g, "") }
    cacheNombres.set(fila, d)
  }
  return d
}

export interface ResultadoBusqueda<T> {
  fila: T
  puntaje: number
}

/**
 * Busca por nombre, apellido, DNI o numero de inscripcion, en cualquier orden:
 * "iara colombo", "colombo iara", "ia colomb", "colombo", "iara", "35123456",
 * "123456" (parte del DNI), "#45" o "45" (numero de inscripcion).
 *
 * Cada palabra escrita tiene que coincidir con alguna palabra distinta del
 * nombre completo (asi "ana ana" no trae a cualquier "Ana"). Sin acentos, sin
 * mayusculas y tolerando un error de tipeo.
 */
export function buscarParticipantes<T extends FilaCheckIn>(
  lista: readonly T[],
  termino: string,
  limite = 30,
): ResultadoBusqueda<T>[] {
  const texto = normalizarTexto(termino)
  if (!texto) return []
  const palabrasBuscadas = texto.split(" ").filter(Boolean)
  const soloDigitos = termino.replace(/[\s.\-#]/g, "")
  const esNumero = /^\d+$/.test(soloDigitos)

  const resultados: ResultadoBusqueda<T>[] = []

  for (const fila of lista) {
    let puntaje = 0
    const datos = datosDe(fila)

    if (esNumero) {
      const dni = datos.dni
      if (dni && dni === soloDigitos) puntaje = 100
      else if (soloDigitos.length >= 3 && dni.includes(soloDigitos)) puntaje = 40
      if (fila.numero_inscripcion != null && String(fila.numero_inscripcion) === soloDigitos) {
        puntaje = Math.max(puntaje, 60)
      }
      if (puntaje > 0) resultados.push({ fila, puntaje })
      continue
    }

    const palabrasNombre = datos.palabras
    if (palabrasNombre.length === 0) continue

    // Asignacion codiciosa: cada palabra buscada toma la mejor palabra del
    // nombre que todavia no uso otra. Se prueban primero las palabras buscadas
    // mas largas (son las mas especificas).
    const usadas = new Set<number>()
    const ordenadas = [...palabrasBuscadas].sort((a, b) => b.length - a.length)
    let ok = true
    for (const busca of ordenadas) {
      let mejor = 0
      let mejorIndice = -1
      palabrasNombre.forEach((palabra, i) => {
        if (usadas.has(i)) return
        const p = puntajePalabra(busca, palabra)
        if (p > mejor) {
          mejor = p
          mejorIndice = i
        }
      })
      if (mejorIndice === -1) {
        ok = false
        break
      }
      usadas.add(mejorIndice)
      puntaje += mejor
    }
    if (!ok) continue

    // Escribir el nombre en el mismo orden suma un poco ("iara colombo" antes
    // que "colombo iara" cuando hay dos personas parecidas).
    if (datos.texto.startsWith(texto)) puntaje += 2
    resultados.push({ fila, puntaje })
  }

  resultados.sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      Number(!!a.fila.checked_in) - Number(!!b.fila.checked_in) ||
      nombreCompleto(a.fila).localeCompare(nombreCompleto(b.fila), "es"),
  )
  return resultados.slice(0, limite)
}

/**
 * Con Enter se registra directo solo si no hay dudas: un unico resultado, o un
 * DNI exacto. Con dos "Iara" no se adivina: se muestra la lista.
 */
export function resultadoUnico<T extends FilaCheckIn>(resultados: readonly ResultadoBusqueda<T>[]): T | null {
  if (resultados.length === 1) return resultados[0].fila
  if (resultados.length > 1 && resultados[0].puntaje >= 100 && resultados[1].puntaje < 100) return resultados[0].fila
  return null
}

// ---------------------------------------------------------------------------
// Numeros de la cabecera
// ---------------------------------------------------------------------------

export function estadisticasCheckIn(lista: readonly FilaCheckIn[]) {
  const confirmadas = lista.filter((f) => f.estado === "confirmada")
  const presentes = confirmadas.filter((f) => f.checked_in === true).length
  return {
    totalConfirmadas: confirmadas.length,
    presentes,
    pendientes: confirmadas.length - presentes,
    porcentaje: confirmadas.length > 0 ? Math.round((presentes / confirmadas.length) * 100) : 0,
  }
}

/** Los ultimos registrados, del mas nuevo al mas viejo. */
export function ultimosCheckIns<T extends FilaCheckIn>(lista: readonly T[], cantidad = 10): T[] {
  return lista
    .filter((f) => f.checked_in === true)
    .sort((a, b) => (b.checked_in_at ?? "").localeCompare(a.checked_in_at ?? ""))
    .slice(0, cantidad)
}

/** Reemplaza (o agrega) una fila de la lista local, sin mutar la original. */
export function aplicarFila<T extends FilaCheckIn>(lista: readonly T[], fila: T): T[] {
  const i = lista.findIndex((f) => f.id === fila.id)
  if (i === -1) return [...lista, fila]
  const copia = [...lista]
  copia[i] = { ...copia[i], ...fila }
  return copia
}

// ---------------------------------------------------------------------------
// Registrar (el UPDATE condicional)
// ---------------------------------------------------------------------------

export type TipoResultado =
  | "exito"
  | "ya-registrado"
  | "no-confirmada"
  | "no-encontrado"
  | "sin-permiso"
  | "sin-conexion"
  | "error"

export interface ResultadoCheckIn {
  tipo: TipoResultado
  fila?: FilaCheckIn
  detalle?: string
}

/** Lo minimo del cliente de Supabase que se usa (asi se puede simular en tests). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClienteCheckIn = { from: (tabla: string) => any }

type ErrorSupabase = { message?: string; code?: string; details?: string } | null

/** El error es de red (sin señal, servidor caido), no de datos. */
export function esErrorDeRed(error: unknown): boolean {
  if (!error) return false
  const msg = String(
    (error as { message?: string }).message ?? (typeof error === "string" ? error : ""),
  ).toLowerCase()
  return (
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("internet")
  )
}

function textoError(error: ErrorSupabase | unknown): string {
  const e = error as { message?: string; details?: string; code?: string } | null
  return [e?.message, e?.details, e?.code ? `(${e.code})` : ""].filter(Boolean).join(" ").trim() || "Error desconocido"
}

/**
 * Registra a una persona. Devuelve SIEMPRE que paso de verdad en la base.
 * Nunca lanza.
 */
export async function registrarCheckIn(
  cliente: ClienteCheckIn,
  id: string,
  quien: string,
  cuando: string = new Date().toISOString(),
): Promise<ResultadoCheckIn> {
  try {
    const { data, error } = await cliente
      .from("participantes")
      .update({ checked_in: true, checked_in_at: cuando, checked_in_by: quien })
      .eq("id", id)
      .eq("estado", "confirmada")
      .not("checked_in", "is", true)
      .select(CAMPOS_CHECKIN)

    if (error) {
      return esErrorDeRed(error)
        ? { tipo: "sin-conexion", detalle: textoError(error) }
        : { tipo: "error", detalle: textoError(error) }
    }
    if (Array.isArray(data) && data.length > 0) return { tipo: "exito", fila: data[0] as FilaCheckIn }

    // No se actualizo nada: averiguar por que.
    return await explicarSinCambios(cliente, id)
  } catch (error) {
    return esErrorDeRed(error)
      ? { tipo: "sin-conexion", detalle: textoError(error) }
      : { tipo: "error", detalle: textoError(error) }
  }
}

async function explicarSinCambios(cliente: ClienteCheckIn, id: string): Promise<ResultadoCheckIn> {
  const { data, error } = await cliente.from("participantes").select(CAMPOS_CHECKIN).eq("id", id).limit(1)
  if (error) {
    return esErrorDeRed(error)
      ? { tipo: "sin-conexion", detalle: textoError(error) }
      : { tipo: "error", detalle: textoError(error) }
  }
  const fila = (Array.isArray(data) ? data[0] : null) as FilaCheckIn | null
  if (!fila) return { tipo: "no-encontrado" }
  if (fila.checked_in === true) return { tipo: "ya-registrado", fila }
  if (fila.estado !== "confirmada") return { tipo: "no-confirmada", fila }
  // Confirmada, sin registrar, y aun asi el UPDATE no toco nada: la base no le
  // deja escribir a este usuario (RLS).
  return {
    tipo: "sin-permiso",
    fila,
    detalle:
      "Tu usuario no tiene permiso para registrar en la base. Cerrá sesión y volvé a entrar; si sigue, pedile a un admin que revise tu usuario en Usuarios.",
  }
}

/** Deshacer un check-in. Tambien con `.select()`: si no toco nada, se dice. */
export async function cancelarCheckIn(cliente: ClienteCheckIn, id: string): Promise<ResultadoCheckIn> {
  try {
    const { data, error } = await cliente
      .from("participantes")
      .update({ checked_in: false, checked_in_at: null, checked_in_by: null })
      .eq("id", id)
      .select(CAMPOS_CHECKIN)
    if (error) {
      return esErrorDeRed(error)
        ? { tipo: "sin-conexion", detalle: textoError(error) }
        : { tipo: "error", detalle: textoError(error) }
    }
    if (Array.isArray(data) && data.length > 0) return { tipo: "exito", fila: data[0] as FilaCheckIn }
    return { tipo: "sin-permiso", detalle: "La base no dejó deshacer el registro (permisos)." }
  } catch (error) {
    return esErrorDeRed(error)
      ? { tipo: "sin-conexion", detalle: textoError(error) }
      : { tipo: "error", detalle: textoError(error) }
  }
}

// ---------------------------------------------------------------------------
// Cola sin señal
// ---------------------------------------------------------------------------

export interface PendienteCheckIn {
  id: string
  nombre: string
  cuando: string
  quien: string
}

/** Agrega sin duplicar: escanear dos veces sin señal no encola dos veces. */
export function encolar(cola: readonly PendienteCheckIn[], p: PendienteCheckIn): PendienteCheckIn[] {
  if (cola.some((x) => x.id === p.id)) return [...cola]
  return [...cola, p]
}

/** Que pendientes se sacan de la cola segun lo que contesto la base. */
export function quedaEnCola(resultado: ResultadoCheckIn): boolean {
  // Sin señal: se reintenta. Error raro: tambien (mejor reintentar que perder
  // el registro). Lo demas ya esta resuelto en la base o no tiene arreglo
  // desde aca (no confirmada, no existe).
  return resultado.tipo === "sin-conexion" || resultado.tipo === "error" || resultado.tipo === "sin-permiso"
}

/** Lee la cola guardada sin romperse con basura en el storage. */
export function leerCola(texto: string | null): PendienteCheckIn[] {
  if (!texto) return []
  try {
    const datos = JSON.parse(texto)
    if (!Array.isArray(datos)) return []
    return datos.filter(
      (x): x is PendienteCheckIn =>
        !!x && typeof x.id === "string" && typeof x.cuando === "string" && typeof x.quien === "string",
    ).map((x) => ({ ...x, nombre: typeof x.nombre === "string" ? x.nombre : "" }))
  } catch {
    return []
  }
}

/**
 * Sube la cola. Cada pendiente se registra con su hora original. Devuelve lo
 * que queda pendiente y lo que se resolvio.
 */
export async function sincronizarCola(
  cliente: ClienteCheckIn,
  cola: readonly PendienteCheckIn[],
): Promise<{ restante: PendienteCheckIn[]; resueltos: { pendiente: PendienteCheckIn; resultado: ResultadoCheckIn }[] }> {
  const restante: PendienteCheckIn[] = []
  const resueltos: { pendiente: PendienteCheckIn; resultado: ResultadoCheckIn }[] = []
  for (const p of cola) {
    const resultado = await registrarCheckIn(cliente, p.id, p.quien, p.cuando)
    if (quedaEnCola(resultado)) restante.push(p)
    else resueltos.push({ pendiente: p, resultado })
    // Sin señal: no tiene sentido seguir probando el resto ahora.
    if (resultado.tipo === "sin-conexion") {
      restante.push(...cola.slice(cola.indexOf(p) + 1))
      break
    }
  }
  return { restante, resueltos }
}

/** Hora corta argentina ("14:05"). */
export function horaCorta(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })
}
