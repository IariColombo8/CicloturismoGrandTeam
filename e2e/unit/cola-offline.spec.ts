import { test, expect } from "@playwright/test"

// La cola es lo que hace que no se pierda ni una inscripcion ni un pedido de
// remera cuando no hay internet. Se prueba en Node, sin navegador: no hay
// IndexedDB, asi que cae en localStorage (el mismo camino que usa Safari en
// modo privado), y se simula el fetch.

/** localStorage de juguete, porque en Node no existe. */
function montarLocalStorage() {
  const datos = new Map<string, string>()
  const falso = {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, String(v)),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
    key: (i: number) => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size
    },
  }
  ;(globalThis as Record<string, unknown>).localStorage = falso
  return datos
}

type Llamada = { url: string; body: Record<string, unknown> }

/** Reemplaza fetch: `responder` decide qué pasa en cada llamada. */
function montarFetch(responder: (n: number, url: string) => { ok: boolean; status?: number; data?: unknown } | "error") {
  const llamadas: Llamada[] = []
  let n = 0

  ;(globalThis as Record<string, unknown>).fetch = async (url: string, opciones?: { body?: string }) => {
    n += 1
    llamadas.push({ url: String(url), body: JSON.parse(opciones?.body || "{}") })
    const respuesta = responder(n, String(url))
    if (respuesta === "error") throw new Error("Failed to fetch")
    return {
      ok: respuesta.ok,
      status: respuesta.status ?? (respuesta.ok ? 200 : 500),
      json: async () => respuesta.data ?? {},
    }
  }

  return llamadas
}

async function cargarCola() {
  // Import dinámico: el módulo tiene que leer el localStorage ya montado.
  return import("@/lib/offline/cola")
}

test.describe("cola de envíos", () => {
  test.beforeEach(() => {
    montarLocalStorage()
  })

  test("si el envío sale bien, no queda nada guardado", async () => {
    const llamadas = montarFetch(() => ({ ok: true, data: { ok: true, tokenQR: "abc" } }))
    const { enviarConCola, listarPendientes } = await cargarCola()

    const { resultado, respuesta } = await enviarConCola({
      tipo: "inscripcion",
      url: "/api/inscripcion/submit",
      payload: { dni: "12345678" },
      referencia: "12345678",
    })

    expect(resultado).toBe("enviada")
    expect(respuesta.tokenQR).toBe("abc")
    expect(llamadas).toHaveLength(1)
    expect(await listarPendientes()).toEqual([])
  })

  test("sin conexión queda guardado y se avisa con 'en-cola'", async () => {
    montarFetch(() => "error")
    const { enviarConCola, listarPendientes } = await cargarCola()

    const { resultado } = await enviarConCola({
      tipo: "inscripcion",
      url: "/api/inscripcion/submit",
      payload: { dni: "12345678", nombre: "Juan" },
      referencia: "12345678",
    })

    expect(resultado).toBe("en-cola")
    const pendientes = await listarPendientes()
    expect(pendientes).toHaveLength(1)
    expect(pendientes[0].payload.nombre).toBe("Juan")
    expect(pendientes[0].url).toBe("/api/inscripcion/submit")
    expect(pendientes[0].ultimoError).toBeTruthy()
  })

  test("reintenta y, cuando entra, lo borra de la cola", async () => {
    // Los 3 intentos del envío fallan; el reintento posterior funciona.
    let permitir = false
    montarFetch(() => (permitir ? { ok: true, data: { ok: true } } : "error"))
    const { enviarConCola, listarPendientes, reintentarPendientes } = await cargarCola()

    await enviarConCola({
      tipo: "inscripcion",
      url: "/api/inscripcion/submit",
      payload: { dni: "12345678" },
      referencia: "12345678",
    })
    expect(await listarPendientes()).toHaveLength(1)

    permitir = true
    const enviados = await reintentarPendientes()
    expect(enviados).toBe(1)
    expect(await listarPendientes()).toEqual([])
  })

  test("un rechazo del servidor tampoco se pierde", async () => {
    montarFetch(() => ({ ok: false, status: 400, data: { error: "Datos inválidos" } }))
    const { enviarConCola, listarPendientes } = await cargarCola()

    const { resultado } = await enviarConCola({
      tipo: "inscripcion",
      url: "/api/inscripcion/submit",
      payload: { dni: "12345678" },
    })

    expect(resultado).toBe("en-cola")
    const pendientes = await listarPendientes()
    expect(pendientes).toHaveLength(1)
    expect(pendientes[0].ultimoError).toContain("Datos inválidos")
  })

  test("el pedido de remera usa la misma cola y se distingue de la inscripción", async () => {
    montarFetch(() => "error")
    const { enviarConCola, listarPendientes } = await cargarCola()

    await enviarConCola({
      tipo: "inscripcion",
      url: "/api/inscripcion/submit",
      payload: { dni: "11111111" },
      referencia: "11111111",
    })
    await enviarConCola({
      tipo: "remera",
      url: "/api/remera/submit",
      payload: { dni: "22222222" },
      rpc: { nombre: "guardar_entrega_remera_v2", args: { p_dni: "22222222" } },
      referencia: "22222222",
    })

    expect(await listarPendientes()).toHaveLength(2)

    const soloRemera = await listarPendientes("remera")
    expect(soloRemera).toHaveLength(1)
    expect(soloRemera[0].url).toBe("/api/remera/submit")
    // La dirección de entrega viaja con el pedido: no se puede perder.
    expect(soloRemera[0].rpc?.nombre).toBe("guardar_entrega_remera_v2")

    const soloInscripcion = await listarPendientes("inscripcion")
    expect(soloInscripcion).toHaveLength(1)
    expect(soloInscripcion[0].payload.dni).toBe("11111111")
  })

  test("varios envíos pendientes conviven sin pisarse", async () => {
    montarFetch(() => "error")
    const { enviarConCola, listarPendientes, borrarPendiente } = await cargarCola()

    for (const dni of ["11111111", "22222222", "33333333"]) {
      await enviarConCola({ tipo: "inscripcion", url: "/api/inscripcion/submit", payload: { dni }, referencia: dni })
    }

    const pendientes = await listarPendientes()
    expect(pendientes).toHaveLength(3)

    await borrarPendiente(pendientes[1].id)
    const quedan = await listarPendientes()
    expect(quedan).toHaveLength(2)
    expect(quedan.map((p) => p.payload.dni)).toEqual(["11111111", "33333333"])
  })

  test("nunca lanza, ni con el almacenamiento roto", async () => {
    montarFetch(() => "error")
    // Un navegador con el almacenamiento bloqueado: todo tira excepción.
    ;(globalThis as Record<string, unknown>).localStorage = {
      getItem: () => {
        throw new Error("bloqueado")
      },
      setItem: () => {
        throw new Error("bloqueado")
      },
      removeItem: () => {
        throw new Error("bloqueado")
      },
    }

    const { enviarConCola, listarPendientes } = await cargarCola()

    const { resultado } = await enviarConCola({
      tipo: "inscripcion",
      url: "/api/inscripcion/submit",
      payload: { dni: "12345678" },
    })

    // No se pudo guardar, pero la persona igual recibe una respuesta.
    expect(resultado).toBe("en-cola")
    expect(await listarPendientes()).toEqual([])
  })
})
