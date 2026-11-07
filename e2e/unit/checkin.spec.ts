import { test, expect } from "@playwright/test"
import {
  aplicarFila,
  buscarParticipantes,
  cancelarCheckIn,
  encolar,
  esErrorDeRed,
  estadisticasCheckIn,
  extraerToken,
  leerCola,
  normalizarTexto,
  quedaEnCola,
  registrarCheckIn,
  resultadoUnico,
  sincronizarCola,
  ultimosCheckIns,
  type ClienteCheckIn,
  type FilaCheckIn,
  type PendienteCheckIn,
} from "@/lib/checkin"

// ---------------------------------------------------------------------------
// Base falsa que se comporta como Postgres + PostgREST para lo que usa el
// check-in: cada UPDATE se aplica de una vez (atomico) despues de una demora
// de red al azar, igual que dos celulares pegandole a la misma fila.
// ---------------------------------------------------------------------------

type Opciones = {
  demoraMax?: number
  sinRed?: () => boolean
  rlsBloquea?: boolean
  errorDatos?: string
}

function baseFalsa(filas: FilaCheckIn[], opciones: Opciones = {}) {
  const tabla = new Map(filas.map((f) => [f.id, { ...f }]))
  const log = { updatesAplicados: 0, consultas: 0 }

  const esperar = () =>
    new Promise<void>((r) => setTimeout(r, Math.floor(Math.random() * (opciones.demoraMax ?? 15))))

  function constructor() {
    let operacion: "select" | "update" = "select"
    let valores: Partial<FilaCheckIn> = {}
    const filtros: ((f: FilaCheckIn) => boolean)[] = []
    let conSelect = false
    let limite = Infinity

    const q: Record<string, unknown> = {
      update(v: Partial<FilaCheckIn>) {
        operacion = "update"
        valores = v
        return q
      },
      select() {
        conSelect = true
        return q
      },
      eq(col: keyof FilaCheckIn, v: unknown) {
        filtros.push((f) => f[col] === v)
        return q
      },
      neq(col: keyof FilaCheckIn, v: unknown) {
        filtros.push((f) => f[col] !== v)
        return q
      },
      not(col: keyof FilaCheckIn, op: string, v: unknown) {
        if (op !== "is") throw new Error("operador no simulado")
        // IS NOT TRUE: false y NULL pasan.
        filtros.push((f) => f[col] !== v)
        return q
      },
      limit(n: number) {
        limite = n
        return q
      },
      then(resolver: (r: unknown) => void, rechazar: (e: unknown) => void) {
        ;(async () => {
          await esperar()
          log.consultas++
          if (opciones.sinRed?.()) return { data: null, error: { message: "TypeError: Failed to fetch" } }
          if (opciones.errorDatos) return { data: null, error: { message: opciones.errorDatos, code: "XX000" } }
          // Desde aca todo es sincronico: es lo que hace atomico al UPDATE.
          const coinciden = [...tabla.values()].filter((f) => filtros.every((fn) => fn(f))).slice(0, limite)
          if (operacion === "update") {
            if (opciones.rlsBloquea) return { data: conSelect ? [] : null, error: null }
            for (const f of coinciden) {
              Object.assign(f, valores)
              log.updatesAplicados++
            }
            return { data: conSelect ? coinciden.map((f) => ({ ...f })) : null, error: null }
          }
          return { data: coinciden.map((f) => ({ ...f })), error: null }
        })().then(resolver, rechazar)
      },
    }
    return q
  }

  const cliente: ClienteCheckIn = { from: () => constructor() }
  return { cliente, tabla, log }
}

function persona(id: string, extra: Partial<FilaCheckIn> = {}): FilaCheckIn {
  return {
    id,
    nombre: "Iara",
    apellido: "Colombo",
    dni: "35123456",
    numero_inscripcion: 12,
    estado: "confirmada",
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    token_qr: `0000000${id.padStart(1, "0")}-aaaa-bbbb-cccc-dddddddddddd`.slice(-36),
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// Varios celulares a la vez
// ---------------------------------------------------------------------------

test.describe("nadie se registra dos veces", () => {
  for (const celulares of [2, 3, 5, 10]) {
    test(`${celulares} celulares escanean a la misma persona a la vez: uno solo registra`, async () => {
      // Se repite muchas veces porque las demoras son al azar.
      for (let vuelta = 0; vuelta < 40; vuelta++) {
        const { cliente, tabla, log } = baseFalsa([persona("p1")])
        const resultados = await Promise.all(
          Array.from({ length: celulares }, (_, i) => registrarCheckIn(cliente, "p1", `cel${i}@x.com`)),
        )
        const exitos = resultados.filter((r) => r.tipo === "exito")
        const yaRegistrados = resultados.filter((r) => r.tipo === "ya-registrado")
        expect(exitos).toHaveLength(1)
        expect(yaRegistrados).toHaveLength(celulares - 1)
        expect(log.updatesAplicados).toBe(1)

        // Todos dicen lo mismo de quien lo registro, y es lo que quedo en la base.
        const ganador = exitos[0].fila!.checked_in_by
        expect(tabla.get("p1")!.checked_in_by).toBe(ganador)
        for (const r of yaRegistrados) expect(r.fila!.checked_in_by).toBe(ganador)
      }
    })
  }

  test("5 celulares registrando a 200 personas mezcladas: cada una queda una sola vez", async () => {
    const filas = Array.from({ length: 200 }, (_, i) => persona(`p${i}`, { numero_inscripcion: i + 1 }))
    const { cliente, tabla, log } = baseFalsa(filas, { demoraMax: 5 })
    // Cada celular recorre la fila en otro orden y varias personas pasan por
    // mas de un celular (como pasa en la entrada).
    const celulares = Array.from({ length: 5 }, (_, c) =>
      (async () => {
        const orden = [...filas].sort(() => Math.random() - 0.5)
        const res = []
        for (const f of orden) res.push(await registrarCheckIn(cliente, f.id, `cel${c}`))
        return res
      })(),
    )
    const todos = (await Promise.all(celulares)).flat()
    expect(todos.filter((r) => r.tipo === "exito")).toHaveLength(200)
    expect(todos.filter((r) => r.tipo === "ya-registrado")).toHaveLength(800)
    expect(log.updatesAplicados).toBe(200)
    expect([...tabla.values()].every((f) => f.checked_in === true)).toBe(true)
  })

  test("escanear dos veces seguidas en el mismo celular: la segunda dice ya registrado", async () => {
    const { cliente } = baseFalsa([persona("p1")])
    expect((await registrarCheckIn(cliente, "p1", "a")).tipo).toBe("exito")
    const segunda = await registrarCheckIn(cliente, "p1", "a")
    expect(segunda.tipo).toBe("ya-registrado")
    expect(segunda.fila?.checked_in_at).toBeTruthy()
  })

  test("el registro guarda quien y a que hora", async () => {
    const { cliente, tabla } = baseFalsa([persona("p1")])
    await registrarCheckIn(cliente, "p1", "ema@x.com", "2026-11-08T11:05:00.000Z")
    expect(tabla.get("p1")).toMatchObject({
      checked_in: true,
      checked_in_by: "ema@x.com",
      checked_in_at: "2026-11-08T11:05:00.000Z",
    })
  })

  test("checked_in NULL (fila vieja) cuenta como no registrado", async () => {
    const { cliente } = baseFalsa([persona("p1", { checked_in: null })])
    expect((await registrarCheckIn(cliente, "p1", "a")).tipo).toBe("exito")
  })
})

test.describe("nunca un exito falso", () => {
  test("inscripcion pendiente: no se registra y lo dice", async () => {
    const { cliente, tabla } = baseFalsa([persona("p1", { estado: "pendiente" })])
    const r = await registrarCheckIn(cliente, "p1", "a")
    expect(r.tipo).toBe("no-confirmada")
    expect(tabla.get("p1")!.checked_in).toBe(false)
  })

  test("inscripcion rechazada: no se registra", async () => {
    const { cliente } = baseFalsa([persona("p1", { estado: "rechazada" })])
    expect((await registrarCheckIn(cliente, "p1", "a")).tipo).toBe("no-confirmada")
  })

  test("la persona no existe", async () => {
    const { cliente } = baseFalsa([])
    expect((await registrarCheckIn(cliente, "nadie", "a")).tipo).toBe("no-encontrado")
  })

  test("la base no deja escribir (RLS, usuario sin vincular): sin permiso, no exito", async () => {
    const { cliente, tabla } = baseFalsa([persona("p1")], { rlsBloquea: true })
    const r = await registrarCheckIn(cliente, "p1", "a")
    expect(r.tipo).toBe("sin-permiso")
    expect(r.detalle).toContain("permiso")
    expect(tabla.get("p1")!.checked_in).toBe(false)
  })

  test("sin señal: lo dice como sin conexion (para guardarlo en el celular)", async () => {
    const { cliente } = baseFalsa([persona("p1")], { sinRed: () => true })
    expect((await registrarCheckIn(cliente, "p1", "a")).tipo).toBe("sin-conexion")
  })

  test("error de la base: error con el detalle, no exito", async () => {
    const { cliente } = baseFalsa([persona("p1")], { errorDatos: "permission denied for table" })
    const r = await registrarCheckIn(cliente, "p1", "a")
    expect(r.tipo).toBe("error")
    expect(r.detalle).toContain("permission denied")
  })

  test("si el cliente explota, no lanza: devuelve error", async () => {
    const cliente: ClienteCheckIn = {
      from: () => {
        throw new Error("boom")
      },
    }
    const r = await registrarCheckIn(cliente, "p1", "a")
    expect(r.tipo).toBe("error")
    expect(r.detalle).toContain("boom")
  })

  test("si fetch tira TypeError de red, es sin conexion", async () => {
    const cliente: ClienteCheckIn = {
      from: () => {
        throw new TypeError("Failed to fetch")
      },
    }
    expect((await registrarCheckIn(cliente, "p1", "a")).tipo).toBe("sin-conexion")
  })
})

test.describe("deshacer", () => {
  test("deshace y permite volver a registrar", async () => {
    const { cliente, tabla } = baseFalsa([persona("p1")])
    await registrarCheckIn(cliente, "p1", "a")
    const r = await cancelarCheckIn(cliente, "p1")
    expect(r.tipo).toBe("exito")
    expect(tabla.get("p1")).toMatchObject({ checked_in: false, checked_in_at: null, checked_in_by: null })
    expect((await registrarCheckIn(cliente, "p1", "b")).tipo).toBe("exito")
  })

  test("sin permiso no dice que deshizo", async () => {
    const { cliente } = baseFalsa([persona("p1", { checked_in: true })], { rlsBloquea: true })
    expect((await cancelarCheckIn(cliente, "p1")).tipo).toBe("sin-permiso")
  })

  test("sin señal tampoco", async () => {
    const { cliente } = baseFalsa([persona("p1", { checked_in: true })], { sinRed: () => true })
    expect((await cancelarCheckIn(cliente, "p1")).tipo).toBe("sin-conexion")
  })
})

// ---------------------------------------------------------------------------
// Sin señal
// ---------------------------------------------------------------------------

test.describe("cola sin señal", () => {
  const p = (id: string, cuando = "2026-11-08T10:00:00.000Z"): PendienteCheckIn => ({
    id,
    nombre: id,
    cuando,
    quien: "cel1",
  })

  test("escanear dos veces sin señal no encola dos veces", () => {
    let cola: PendienteCheckIn[] = []
    cola = encolar(cola, p("a"))
    cola = encolar(cola, p("a"))
    cola = encolar(cola, p("b"))
    expect(cola.map((x) => x.id)).toEqual(["a", "b"])
  })

  test("al volver la señal se sube con la hora original", async () => {
    const { cliente, tabla } = baseFalsa([persona("a"), persona("b")])
    const { restante, resueltos } = await sincronizarCola(cliente, [p("a", "2026-11-08T09:59:00.000Z"), p("b")])
    expect(restante).toEqual([])
    expect(resueltos.map((r) => r.resultado.tipo)).toEqual(["exito", "exito"])
    expect(tabla.get("a")!.checked_in_at).toBe("2026-11-08T09:59:00.000Z")
  })

  test("si otro celular ya lo registro mientras no habia señal, no se duplica", async () => {
    const { cliente, tabla, log } = baseFalsa([persona("a")])
    await registrarCheckIn(cliente, "a", "cel2", "2026-11-08T09:00:00.000Z")
    const { restante, resueltos } = await sincronizarCola(cliente, [p("a")])
    expect(restante).toEqual([])
    expect(resueltos[0].resultado.tipo).toBe("ya-registrado")
    expect(log.updatesAplicados).toBe(1)
    // Queda el primero.
    expect(tabla.get("a")!.checked_in_by).toBe("cel2")
  })

  test("dos celulares sin señal registran a la misma persona y suben a la vez: queda uno", async () => {
    for (let vuelta = 0; vuelta < 30; vuelta++) {
      const { cliente, log } = baseFalsa([persona("a")])
      const [c1, c2] = await Promise.all([
        sincronizarCola(cliente, [{ ...p("a"), quien: "cel1" }]),
        sincronizarCola(cliente, [{ ...p("a"), quien: "cel2" }]),
      ])
      const tipos = [c1.resueltos[0].resultado.tipo, c2.resueltos[0].resultado.tipo].sort()
      expect(tipos).toEqual(["exito", "ya-registrado"])
      expect(log.updatesAplicados).toBe(1)
    }
  })

  test("si sigue sin señal no se pierde nada", async () => {
    const { cliente } = baseFalsa([persona("a"), persona("b")], { sinRed: () => true })
    const cola = [p("a"), p("b")]
    const { restante, resueltos } = await sincronizarCola(cliente, cola)
    expect(restante.map((x) => x.id)).toEqual(["a", "b"])
    expect(resueltos).toEqual([])
  })

  test("la señal se corta a mitad de la subida: lo que no subio queda", async () => {
    let llamadas = 0
    // Cada registro hace 1 consulta; desde la segunda, sin red.
    const { cliente } = baseFalsa([persona("a"), persona("b"), persona("c")], { sinRed: () => ++llamadas > 1 })
    const { restante, resueltos } = await sincronizarCola(cliente, [p("a"), p("b"), p("c")])
    expect(resueltos.map((r) => r.pendiente.id)).toEqual(["a"])
    expect(restante.map((x) => x.id)).toEqual(["b", "c"])
  })

  test("una inscripcion que dejo de estar confirmada sale de la cola (no se reintenta para siempre)", async () => {
    const { cliente } = baseFalsa([persona("a", { estado: "pendiente" })])
    const { restante, resueltos } = await sincronizarCola(cliente, [p("a")])
    expect(restante).toEqual([])
    expect(resueltos[0].resultado.tipo).toBe("no-confirmada")
  })

  test("que queda en cola y que no", () => {
    expect(quedaEnCola({ tipo: "sin-conexion" })).toBe(true)
    expect(quedaEnCola({ tipo: "error" })).toBe(true)
    expect(quedaEnCola({ tipo: "sin-permiso" })).toBe(true)
    expect(quedaEnCola({ tipo: "exito" })).toBe(false)
    expect(quedaEnCola({ tipo: "ya-registrado" })).toBe(false)
    expect(quedaEnCola({ tipo: "no-confirmada" })).toBe(false)
    expect(quedaEnCola({ tipo: "no-encontrado" })).toBe(false)
  })

  test("leer la cola guardada no se rompe con basura", () => {
    expect(leerCola(null)).toEqual([])
    expect(leerCola("")).toEqual([])
    expect(leerCola("no es json")).toEqual([])
    expect(leerCola("{}")).toEqual([])
    expect(leerCola('[null, 3, {"id": 1}, {"id":"a","cuando":"x","quien":"q"}]')).toEqual([
      { id: "a", cuando: "x", quien: "q", nombre: "" },
    ])
  })

  test("errores de red se reconocen en todos los navegadores", () => {
    expect(esErrorDeRed({ message: "TypeError: Failed to fetch" })).toBe(true) // Chrome
    expect(esErrorDeRed({ message: "Load failed" })).toBe(true) // Safari / iPhone
    expect(esErrorDeRed({ message: "NetworkError when attempting to fetch resource." })).toBe(true) // Firefox
    expect(esErrorDeRed(new TypeError("Failed to fetch"))).toBe(true)
    expect(esErrorDeRed({ message: "new row violates row-level security policy" })).toBe(false)
    expect(esErrorDeRed(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Busqueda inteligente
// ---------------------------------------------------------------------------

const GENTE: FilaCheckIn[] = [
  persona("iara", { nombre: "Iara", apellido: "Colombo", dni: "35123456", numero_inscripcion: 12 }),
  persona("ian", { nombre: "Ian", apellido: "Colombres", dni: "40111222", numero_inscripcion: 13 }),
  persona("maria", { nombre: "María José", apellido: "Núñez", dni: "28999000", numero_inscripcion: 45 }),
  persona("jose", { nombre: "José", apellido: "Pérez", dni: "30555666", numero_inscripcion: 7 }),
  persona("lili", { nombre: "Liliana graciela", apellido: "Collazo", dni: "17222333", numero_inscripcion: 128 }),
  persona("ana1", { nombre: "Ana", apellido: "García", dni: "33000111", numero_inscripcion: 50 }),
  persona("ana2", { nombre: "Ana Laura", apellido: "Gomez", dni: "33000222", numero_inscripcion: 51 }),
  persona("juan", { nombre: "JUAN CARLOS", apellido: "DE LA FUENTE", dni: "20.333.444", numero_inscripcion: 99 }),
  persona("nulo", { nombre: null, apellido: null, dni: null, numero_inscripcion: null }),
]

const ids = (termino: string) => buscarParticipantes(GENTE, termino).map((r) => r.fila.id)
const primero = (termino: string) => ids(termino)[0]

test.describe("busqueda: iara colombo se encuentra de todas las formas", () => {
  const formas = [
    "iara",
    "Iara",
    "IARA",
    "colombo",
    "iara colombo",
    "colombo iara",
    "Colombo, Iara",
    "ia colomb",
    "colomb ia",
    "iar col",
    "  iara   colombo  ",
    "íara colómbo",
    "colonbo", // error de tipeo
    "iara colonbo",
    "35123456",
    "35.123.456",
    "123456",
    "lomb", // pedazo del medio
  ]
  for (const forma of formas) {
    test(`"${forma}"`, () => {
      expect(ids(forma)).toContain("iara")
      expect(primero(forma)).toBe("iara")
    })
  }
})

test.describe("busqueda: precision", () => {
  test("'ia' trae a Iara y a Ian, no a Liliana", () => {
    // "lili" tiene "ia" adentro pero con 2 letras solo vale el comienzo de palabra.
    expect(ids("ia").sort()).toEqual(["ian", "iara"])
  })

  test("'ian colombres' trae solo a Ian", () => {
    expect(ids("ian colombres")).toEqual(["ian"])
  })

  test("'colombo' pone primero a Colombo que a Colombres", () => {
    expect(ids("colombo")[0]).toBe("iara")
  })

  test("cada palabra tiene que coincidir: 'iara perez' no trae a nadie", () => {
    expect(ids("iara perez")).toEqual([])
  })

  test("la misma palabra no se usa dos veces: 'ana ana' no trae a Ana Garcia", () => {
    expect(ids("ana ana")).toEqual([])
  })

  test("nombres compuestos y de varias palabras", () => {
    expect(primero("maria jose")).toBe("maria")
    expect(primero("jose nunez")).toBe("maria")
    expect(primero("juan de la fuente")).toBe("juan")
    expect(primero("fuente juan")).toBe("juan")
    expect(primero("liliana collazo")).toBe("lili")
    expect(primero("graciela")).toBe("lili")
  })

  test("acentos y ñ: 'nunez' encuentra 'Núñez' y 'perez' a 'Pérez'", () => {
    expect(ids("nunez")).toEqual(["maria"])
    expect(ids("NÚÑEZ")).toEqual(["maria"])
    expect(primero("perez")).toBe("jose")
  })

  test("'jose' trae a Jose Perez y a Maria Jose", () => {
    expect(ids("jose").sort()).toEqual(["jose", "maria"])
  })

  test("DNI con puntos guardado en la base tambien se encuentra", () => {
    expect(ids("20333444")).toEqual(["juan"])
    expect(ids("20.333.444")).toEqual(["juan"])
  })

  test("numero de inscripcion: '128' y '#128'", () => {
    expect(primero("128")).toBe("lili")
    expect(primero("#128")).toBe("lili")
  })

  test("DNI exacto gana sobre numero de inscripcion y pedazos", () => {
    const r = buscarParticipantes(GENTE, "33000111")
    expect(r[0].fila.id).toBe("ana1")
    expect(r).toHaveLength(1)
  })

  test("parte del DNI de 2 cifras no trae media lista", () => {
    // "12" solo es el numero de inscripcion de Iara.
    expect(ids("12")).toEqual(["iara"])
  })

  test("vacio o solo signos no trae nada", () => {
    expect(ids("")).toEqual([])
    expect(ids("   ")).toEqual([])
    expect(ids("...")).toEqual([])
  })

  test("filas sin nombre no rompen", () => {
    expect(() => buscarParticipantes(GENTE, "x")).not.toThrow()
  })

  test("los que faltan registrar van antes que los presentes", () => {
    const gente = [
      persona("a", { nombre: "Ana", apellido: "Sosa", checked_in: true }),
      persona("b", { nombre: "Ana", apellido: "Sosa", checked_in: false }),
    ]
    expect(buscarParticipantes(gente, "ana sosa").map((r) => r.fila.id)).toEqual(["b", "a"])
  })

  test("respeta el limite", () => {
    const muchas = Array.from({ length: 100 }, (_, i) => persona(`p${i}`, { nombre: "Ana", apellido: `X${i}` }))
    expect(buscarParticipantes(muchas, "ana", 30)).toHaveLength(30)
  })

  test("es rapida: 1000 personas x 500 busquedas en menos de 1,5 s", () => {
    const nombres = ["Iara", "Juan", "María", "José", "Lucía", "Martín", "Sofía", "Pedro", "Ana", "Carlos"]
    const apellidos = ["Colombo", "Pérez", "Gómez", "Rodríguez", "Fernández", "López", "Díaz", "Martínez"]
    const mil = Array.from({ length: 1000 }, (_, i) =>
      persona(`p${i}`, {
        nombre: nombres[i % nombres.length],
        apellido: `${apellidos[i % apellidos.length]} ${i}`,
        dni: String(30000000 + i),
      }),
    )
    const terminos = ["iara", "colombo iara", "ia colomb", "perez", "3000012", "mart", "lucia gomez", "sofia rodri"]
    const t0 = Date.now()
    for (let i = 0; i < 500; i++) buscarParticipantes(mil, terminos[i % terminos.length])
    expect(Date.now() - t0).toBeLessThan(1500)
  })
})

test.describe("Enter registra solo si no hay dudas", () => {
  test("un solo resultado: se registra", () => {
    expect(resultadoUnico(buscarParticipantes(GENTE, "iara colombo"))?.id).toBe("iara")
  })

  test("dos posibles: no adivina", () => {
    expect(resultadoUnico(buscarParticipantes(GENTE, "ana"))).toBeNull()
    expect(resultadoUnico(buscarParticipantes(GENTE, "ia"))).toBeNull()
  })

  test("DNI exacto: se registra aunque haya otros parecidos", () => {
    const gente = [persona("a", { dni: "33000111" }), persona("b", { dni: "133000111" })]
    expect(resultadoUnico(buscarParticipantes(gente, "33000111"))?.id).toBe("a")
  })

  test("nada: null", () => {
    expect(resultadoUnico([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// QR, numeros y lista
// ---------------------------------------------------------------------------

test.describe("lectura del QR", () => {
  const token = "3f2b8c1e-9a4d-4e7f-b1c2-0d9e8f7a6b5c"
  test("el QR trae el UUID solo", () => {
    expect(extraerToken(token)).toBe(token)
  })
  test("con espacios o saltos de linea", () => {
    expect(extraerToken(`  ${token}\n`)).toBe(token)
  })
  test("en mayusculas", () => {
    expect(extraerToken(token.toUpperCase())).toBe(token)
  })
  test("dentro de una URL", () => {
    expect(extraerToken(`https://grand-team.vercel.app/mi-qr?token=${token}`)).toBe(token)
  })
  test("vacio", () => {
    expect(extraerToken("")).toBeNull()
    expect(extraerToken(null)).toBeNull()
  })
  test("otro texto se devuelve tal cual (y la base dira que no existe)", () => {
    expect(extraerToken("hola")).toBe("hola")
  })
})

test.describe("cabecera y ultimos registrados", () => {
  test("presentes, faltan y porcentaje solo de confirmadas", () => {
    const lista = [
      persona("a", { checked_in: true }),
      persona("b"),
      persona("c"),
      persona("d", { estado: "pendiente", checked_in: true }),
    ]
    expect(estadisticasCheckIn(lista)).toEqual({ totalConfirmadas: 3, presentes: 1, pendientes: 2, porcentaje: 33 })
  })

  test("lista vacia no divide por cero", () => {
    expect(estadisticasCheckIn([])).toEqual({ totalConfirmadas: 0, presentes: 0, pendientes: 0, porcentaje: 0 })
  })

  test("ultimos registrados, del mas nuevo al mas viejo", () => {
    const lista = [
      persona("a", { checked_in: true, checked_in_at: "2026-11-08T10:00:00Z" }),
      persona("b", { checked_in: true, checked_in_at: "2026-11-08T10:05:00Z" }),
      persona("c"),
    ]
    expect(ultimosCheckIns(lista).map((f) => f.id)).toEqual(["b", "a"])
  })

  test("aplicarFila reemplaza sin mutar y agrega si es nueva", () => {
    const lista = [persona("a"), persona("b")]
    const nueva = aplicarFila(lista, persona("a", { checked_in: true }))
    expect(nueva[0].checked_in).toBe(true)
    expect(lista[0].checked_in).toBe(false)
    expect(aplicarFila(lista, persona("z"))).toHaveLength(3)
  })

  test("normalizarTexto", () => {
    expect(normalizarTexto("  María José NÚÑEZ-Pérez ")).toBe("maria jose nunez perez")
    expect(normalizarTexto(null)).toBe("")
  })
})
