/**
 * Envío de la inscripción, pensado para que nunca se pierda ni muestre un error.
 *
 * Camino normal: POST a /api/inscripcion/submit.
 * Si no hay internet, se corta a mitad de camino o el servidor contesta mal,
 * la inscripción queda guardada en el teléfono y se reintenta sola:
 * al volver la conexión, al abrir cualquier página del sitio y cada 30 segundos.
 *
 * El alta del servidor es un UPSERT por DNI, así que reintentar de más no
 * duplica a nadie: en el peor caso sobreescribe la misma fila.
 */

const DB_NAME = "grandteam-inscripciones"
const STORE = "pendientes"
const LS_KEY = "gtb-inscripciones-pendientes"
const TIMEOUT_MS = 25_000
const ESPERAS = [0, 1_500, 4_000]

export interface InscripcionPendiente {
  id: string
  payload: Record<string, unknown>
  creadaEn: number
  intentos: number
  ultimoError: string
}

export type ResultadoEnvio = "enviada" | "en-cola"

// ──────────────────────────────────────────────────────────────
// Guardado local: IndexedDB y, si no está disponible (Safari en
// modo privado, almacenamiento bloqueado), localStorage.
// ──────────────────────────────────────────────────────────────

function abrirDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null)
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      // Si otra pestaña tiene la base bloqueada, no nos colgamos.
      setTimeout(() => resolve(req.result ?? null), 3_000)
    } catch {
      resolve(null)
    }
  })
}

function leerLocalStorage(): InscripcionPendiente[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const lista = raw ? JSON.parse(raw) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function escribirLocalStorage(lista: InscripcionPendiente[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lista))
  } catch {
    // Sin espacio: no hay nada más que podamos hacer sin molestar a la persona.
  }
}

export async function guardarPendiente(p: InscripcionPendiente): Promise<void> {
  const db = await abrirDb()
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(p)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      })
      return
    } catch {
      // Cae al localStorage.
    }
  }
  const lista = leerLocalStorage().filter((x) => x.id !== p.id)
  escribirLocalStorage([...lista, p])
}

export async function listarPendientes(): Promise<InscripcionPendiente[]> {
  const db = await abrirDb()
  if (db) {
    try {
      const desdeDb = await new Promise<InscripcionPendiente[]>((resolve) => {
        const tx = db.transaction(STORE, "readonly")
        const req = tx.objectStore(STORE).getAll()
        req.onsuccess = () => resolve((req.result as InscripcionPendiente[]) || [])
        req.onerror = () => resolve([])
        tx.onabort = () => resolve([])
      })
      // Puede haber quedado algo en localStorage de un intento anterior.
      return [...desdeDb, ...leerLocalStorage()]
    } catch {
      return leerLocalStorage()
    }
  }
  return leerLocalStorage()
}

export async function borrarPendiente(id: string): Promise<void> {
  const db = await abrirDb()
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      })
    } catch {
      // Igual limpiamos el localStorage abajo.
    }
  }
  escribirLocalStorage(leerLocalStorage().filter((x) => x.id !== id))
}

// ──────────────────────────────────────────────────────────────
// Envío
// ──────────────────────────────────────────────────────────────

/** POST con timeout. Devuelve el error como texto en vez de lanzarlo. */
async function postear(payload: Record<string, unknown>): Promise<{ ok: boolean; error: string; data: Record<string, unknown> }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch("/api/inscripcion/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: false,
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return { ok: false, error: String(data.error || `HTTP ${res.status}`), data }
    }
    return { ok: true, error: "", data }
  } catch (error) {
    const nombre = (error as Error)?.name
    return {
      ok: false,
      error: nombre === "AbortError" ? "La conexión tardó demasiado" : (error as Error)?.message || "Sin conexión",
      data: {},
    }
  } finally {
    clearTimeout(timer)
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Intenta enviar. Si no sale, la deja en la cola local y avisa con
 * "en-cola" — nunca lanza.
 */
export async function enviarInscripcion(
  payload: Record<string, unknown>,
): Promise<{ resultado: ResultadoEnvio; respuesta: Record<string, unknown> }> {
  let ultimoError = "Sin conexión"

  for (const espera of ESPERAS) {
    if (espera) await esperar(espera)
    const intento = await postear(payload)
    if (intento.ok) return { resultado: "enviada", respuesta: intento.data }
    ultimoError = intento.error
    // Si el navegador sabe que está sin internet, no gastamos más intentos.
    if (typeof navigator !== "undefined" && navigator.onLine === false) break
  }

  await guardarPendiente({
    id: `${payload.dni || "sin-dni"}-${Date.now()}`,
    payload,
    creadaEn: Date.now(),
    intentos: ESPERAS.length,
    ultimoError,
  })

  return { resultado: "en-cola", respuesta: {} }
}

/** Reintenta las pendientes. Devuelve cuántas se enviaron. */
export async function reintentarPendientes(): Promise<number> {
  if (typeof window === "undefined") return 0
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0

  const pendientes = await listarPendientes()
  let enviadas = 0

  for (const p of pendientes) {
    const intento = await postear(p.payload)
    if (intento.ok) {
      await borrarPendiente(p.id)
      enviadas += 1
      continue
    }
    // Un rechazo por datos (4xx que no sea 408/429) no se arregla
    // reintentando: la dejamos quieta, pero no la borramos nunca.
    await guardarPendiente({ ...p, intentos: p.intentos + 1, ultimoError: intento.error })
  }

  return enviadas
}

let vigilando = false

/**
 * Deja la cola andando sola: reintenta ahora, cuando vuelve la conexión y
 * cada 30 segundos mientras quede algo. Devuelve la función para cortarlo.
 */
export function vigilarPendientes(alEnviar?: (enviadas: number) => void): () => void {
  if (typeof window === "undefined" || vigilando) return () => {}
  vigilando = true

  let activo = true
  let timer: number | undefined

  const correr = async () => {
    if (!activo) return
    const enviadas = await reintentarPendientes()
    if (enviadas > 0) alEnviar?.(enviadas)
    const quedan = await listarPendientes()
    if (activo && quedan.length > 0) {
      timer = window.setTimeout(correr, 30_000)
    }
  }

  const alVolverInternet = () => void correr()
  window.addEventListener("online", alVolverInternet)
  void correr()

  return () => {
    activo = false
    vigilando = false
    if (timer) window.clearTimeout(timer)
    window.removeEventListener("online", alVolverInternet)
  }
}
