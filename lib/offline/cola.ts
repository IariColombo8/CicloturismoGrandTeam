/**
 * Cola de envios que no se pierden.
 *
 * Si no hay internet, se corta a mitad de camino o el servidor contesta mal, lo
 * que la persona cargo queda guardado en el telefono y se reintenta solo: al
 * volver la conexion, al abrir cualquier pagina del sitio y cada 30 segundos
 * mientras quede algo pendiente.
 *
 * La usan la inscripcion (lib/inscripcion/envio.ts) y el pedido de remera
 * (lib/remera/envio.ts). Las dos altas son UPSERT por DNI en el servidor, asi
 * que reintentar de mas no duplica a nadie.
 */

const DB_NAME = "grandteam-inscripciones"
const STORE = "pendientes"
const LS_KEY = "gtb-inscripciones-pendientes"
const TIMEOUT_MS = 25_000
const ESPERAS = [0, 1_500, 4_000]

export type TipoPendiente = "inscripcion" | "remera"

export interface PendienteOffline {
  id: string
  /** Para que la pantalla sepa de que esta hablando. */
  tipo: TipoPendiente
  /** A donde se manda. */
  url: string
  payload: Record<string, unknown>
  /**
   * Paso extra despues del POST (la dirección de entrega de la remera se
   * guarda con una función de la base). Si falla, el pedido ya quedó: se
   * reintenta igual que el resto.
   */
  rpc?: { nombre: string; args: Record<string, unknown> }
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

function leerLocalStorage(): PendienteOffline[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const lista = raw ? JSON.parse(raw) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function escribirLocalStorage(lista: PendienteOffline[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lista))
  } catch {
    // Sin espacio: no hay nada más que podamos hacer sin molestar a la persona.
  }
}

export async function guardarPendiente(p: PendienteOffline): Promise<void> {
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

export async function listarPendientes(tipo?: TipoPendiente): Promise<PendienteOffline[]> {
  const db = await abrirDb()
  let todo: PendienteOffline[] = []

  if (db) {
    try {
      const desdeDb = await new Promise<PendienteOffline[]>((resolve) => {
        const tx = db.transaction(STORE, "readonly")
        const req = tx.objectStore(STORE).getAll()
        req.onsuccess = () => resolve((req.result as PendienteOffline[]) || [])
        req.onerror = () => resolve([])
        tx.onabort = () => resolve([])
      })
      // Puede haber quedado algo en localStorage de un intento anterior.
      todo = [...desdeDb, ...leerLocalStorage()]
    } catch {
      todo = leerLocalStorage()
    }
  } else {
    todo = leerLocalStorage()
  }

  return tipo ? todo.filter((p) => (p.tipo ?? "inscripcion") === tipo) : todo
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
async function postear(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error: string; data: Record<string, unknown> }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) return { ok: false, error: String(data.error || `HTTP ${res.status}`), data }
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

/**
 * El paso extra (la dirección de la remera). Nunca lanza, y devuelve el error
 * como texto.
 *
 * El cliente de Supabase se importa acá adentro, no arriba: así este módulo se
 * puede cargar (y testear) sin necesidad de las variables de entorno.
 */
async function correrRpc(rpc?: PendienteOffline["rpc"]): Promise<string> {
  if (!rpc) return ""
  try {
    const { supabase } = await import("@/lib/supabase")
    const { error } = await supabase.rpc(rpc.nombre, rpc.args)
    return error ? error.message : ""
  } catch (error) {
    return error instanceof Error ? error.message : "no se pudo guardar el detalle"
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Intenta enviar. Si no sale, lo deja en la cola local y avisa con "en-cola".
 * Nunca lanza.
 */
export async function enviarConCola(envio: {
  tipo: TipoPendiente
  url: string
  payload: Record<string, unknown>
  rpc?: PendienteOffline["rpc"]
  /** Para poder reconocerlo en la cola; se usa el DNI. */
  referencia?: string
}): Promise<{ resultado: ResultadoEnvio; respuesta: Record<string, unknown> }> {
  let ultimoError = "Sin conexión"

  for (const espera of ESPERAS) {
    if (espera) await esperar(espera)
    const intento = await postear(envio.url, envio.payload)
    if (intento.ok) {
      // El POST entró: el paso extra puede fallar sin arruinar nada, y si
      // falla queda en la cola para reintentarlo.
      const errorRpc = await correrRpc(envio.rpc)
      if (errorRpc && envio.rpc) {
        await guardarPendiente({
          id: `${envio.tipo}-rpc-${envio.referencia || "sin-ref"}-${Date.now()}`,
          tipo: envio.tipo,
          url: envio.url,
          payload: envio.payload,
          rpc: envio.rpc,
          creadaEn: Date.now(),
          intentos: 1,
          ultimoError: errorRpc,
        })
      }
      return { resultado: "enviada", respuesta: intento.data }
    }
    ultimoError = intento.error
    // Si el navegador sabe que está sin internet, no gastamos más intentos.
    if (typeof navigator !== "undefined" && navigator.onLine === false) break
  }

  await guardarPendiente({
    id: `${envio.tipo}-${envio.referencia || "sin-ref"}-${Date.now()}`,
    tipo: envio.tipo,
    url: envio.url,
    payload: envio.payload,
    rpc: envio.rpc,
    creadaEn: Date.now(),
    intentos: ESPERAS.length,
    ultimoError,
  })

  return { resultado: "en-cola", respuesta: {} }
}

/** Reintenta todo lo pendiente. Devuelve cuántos envíos salieron. */
export async function reintentarPendientes(tipo?: TipoPendiente): Promise<number> {
  // Lo único que necesita es poder hacer el pedido; `window` no hace falta.
  if (typeof fetch === "undefined") return 0
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0

  const pendientes = await listarPendientes(tipo)
  let enviados = 0

  for (const p of pendientes) {
    const url = p.url || "/api/inscripcion/submit"
    const intento = await postear(url, p.payload)
    if (intento.ok) {
      const errorRpc = await correrRpc(p.rpc)
      if (errorRpc) {
        await guardarPendiente({ ...p, intentos: p.intentos + 1, ultimoError: errorRpc })
        continue
      }
      await borrarPendiente(p.id)
      enviados += 1
      continue
    }
    // Un rechazo por datos no se arregla reintentando, pero tampoco se borra
    // nunca: preferimos que quede ahí a perderlo.
    await guardarPendiente({ ...p, intentos: p.intentos + 1, ultimoError: intento.error })
  }

  return enviados
}

let vigilando = false

/**
 * Deja la cola andando sola: reintenta ahora, cuando vuelve la conexión y cada
 * 30 segundos mientras quede algo. Devuelve la función para cortarlo.
 */
export function vigilarPendientes(alEnviar?: (enviados: number) => void): () => void {
  if (typeof window === "undefined" || vigilando) return () => {}
  vigilando = true

  let activo = true
  let timer: number | undefined

  const correr = async () => {
    if (!activo) return
    const enviados = await reintentarPendientes()
    if (enviados > 0) alEnviar?.(enviados)
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
