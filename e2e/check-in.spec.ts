import { test, expect, type Browser, type BrowserContext, type Page, type Route } from "@playwright/test"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { silenciarAvisoDeVersion } from "./helpers"

// Check-in del dia del evento, en el navegador, con VARIOS CELULARES A LA VEZ.
//
// No toca la base real: cada "celular" es un contexto de navegador aparte con
// una sesion de admin falsa, y todas las consultas a Supabase las contesta una
// base en memoria compartida por los celulares. Esa base aplica cada UPDATE de
// una vez (como Postgres con la fila bloqueada) despues de una demora de red al
// azar, asi los celulares se pisan como en la entrada del evento.

function leerEnv(): Record<string, string> {
  const ruta = join(process.cwd(), ".env.local")
  if (!existsSync(ruta)) return {}
  const env: Record<string, string> = {}
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/\s+#.*$/, "").replace(/^"|"$/g, "").trim()
  }
  return env
}

const ENV = leerEnv()
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL ?? ""
const REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : ""

type Fila = Record<string, unknown> & { id: string }

const base64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url")

function sesionFalsa(email: string, id: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24
  const jwt = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({ sub: id, email, role: "authenticated", aud: "authenticated", exp })}.firma`
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "google" },
    user_metadata: { full_name: email },
    created_at: "2026-01-01T00:00:00Z",
  }
  return { access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r", user }
}

/** Base en memoria que entiende lo que manda supabase-js para el check-in. */
function crearBase(filas: Fila[]) {
  const tabla = new Map(filas.map((f) => [f.id, { ...f }]))
  const estado = { sinRed: false, updatesQueRegistraron: 0, bloquearEscritura: false }

  const coincide = (f: Fila, col: string, expr: string): boolean => {
    const v = f[col]
    if (expr.startsWith("not.")) return !coincide(f, col, expr.slice(4))
    const [op, ...resto] = expr.split(".")
    const valor = resto.join(".")
    switch (op) {
      case "eq":
        return String(v) === valor
      case "neq":
        return String(v) !== valor
      case "is":
        if (valor === "null") return v === null || v === undefined
        if (valor === "true") return v === true
        if (valor === "false") return v === false
        return false
      case "ilike": {
        const patron = valor.replace(/\*/g, "%").replace(/%/g, "")
        return String(v ?? "").toLowerCase().includes(patron.toLowerCase())
      }
      default:
        throw new Error(`filtro no simulado: ${col}=${expr}`)
    }
  }

  const filtrar = (url: URL) => {
    let res = [...tabla.values()]
    for (const [k, expr] of url.searchParams) {
      if (["select", "order", "limit", "offset", "columns"].includes(k)) continue
      if (k === "or") {
        const partes = expr.replace(/^\(|\)$/g, "").split(",")
        res = res.filter((f) =>
          partes.some((p) => {
            const [col, ...e] = p.split(".")
            return coincide(f, col, e.join("."))
          }),
        )
        continue
      }
      res = res.filter((f) => coincide(f, k, expr))
    }
    const limite = Number(url.searchParams.get("limit") ?? Infinity)
    return res.slice(0, limite)
  }

  const responder = (route: Route, cuerpo: unknown, objeto: boolean) => {
    const datos = objeto ? (Array.isArray(cuerpo) ? cuerpo[0] ?? null : cuerpo) : cuerpo
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(datos) })
  }

  async function manejar(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    // Demora de red al azar: es lo que hace que los celulares se pisen.
    await new Promise((r) => setTimeout(r, Math.random() * 40))
    if (estado.sinRed) return route.abort("internetdisconnected")

    const objeto = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object")
    const recurso = url.pathname.replace(/^.*\/rest\/v1\//, "")

    if (recurso === "administradores") return responder(route, [{ role: "admin", auth_user_id: "u-1" }], objeto)
    if (recurso.startsWith("rpc/")) return responder(route, null, objeto)
    if (recurso !== "participantes") return responder(route, [], objeto)

    if (req.method() === "GET" || req.method() === "HEAD") return responder(route, filtrar(url), objeto)

    if (req.method() === "PATCH") {
      // Desde aca, sincronico: el UPDATE es atomico como en Postgres.
      if (estado.bloquearEscritura) return responder(route, [], objeto)
      const cambios = req.postDataJSON() as Record<string, unknown>
      const afectadas = filtrar(url)
      for (const f of afectadas) {
        Object.assign(f, cambios)
        if (cambios.checked_in === true) estado.updatesQueRegistraron++
      }
      return responder(route, afectadas.map((f) => ({ ...f })), objeto)
    }
    return route.fulfill({ status: 405, body: "" })
  }

  return { tabla, estado, manejar }
}

const PERSONAS: Fila[] = [
  ["iara", "Iara", "Colombo", "35123456", 12],
  ["ian", "Ian", "Colombres", "40111222", 13],
  ["maria", "María José", "Núñez", "28999000", 45],
  ["jose", "José", "Pérez", "30555666", 7],
  ["lili", "Liliana graciela", "Collazo", "17222333", 128],
  ["ana", "Ana", "García", "33000111", 50],
].map(([id, nombre, apellido, dni, numero]) => ({
  id: id as string,
  nombre,
  apellido,
  dni,
  numero_inscripcion: numero,
  estado: "confirmada",
  checked_in: false,
  checked_in_at: null,
  checked_in_by: null,
  token_qr: `${String(id).padEnd(8, "0").slice(0, 8)}-0000-4000-8000-000000000000`,
  grupo_ciclistas: "Sin grupo",
  localidad: "Concepción del Uruguay",
}))

const PENDIENTE: Fila = {
  ...PERSONAS[0],
  id: "pend",
  nombre: "Pedro",
  apellido: "Pendiente",
  dni: "22333444",
  estado: "pendiente",
  numero_inscripcion: null,
  token_qr: "pend0000-0000-4000-8000-000000000000",
}

/** Un "celular": contexto propio, sesion propia, misma base. */
async function abrirCelular(browser: Browser, base: ReturnType<typeof crearBase>, n: number) {
  const contexto: BrowserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  })
  const email = `celular${n}@grandteam.test`
  const sesion = sesionFalsa(email, "u-1")
  await contexto.addInitScript(
    ([clave, valor]) => {
      try {
        // Solo la primera vez: si el test recarga, no se pisa lo que guardo la pagina.
        if (!localStorage.getItem(clave)) localStorage.setItem(clave, valor)
      } catch {}
    },
    [`sb-${REF}-auth-token`, JSON.stringify(sesion)] as const,
  )
  await contexto.route("**/rest/v1/**", (r) => base.manejar(r))
  await contexto.route("**/auth/v1/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sesion.user) }),
  )
  // Nada de realtime contra el servidor de verdad.
  await contexto.routeWebSocket(/realtime/, () => {})
  const page = await contexto.newPage()
  await silenciarAvisoDeVersion(page)
  await page.goto("/admin/check-in")
  await expect(page.getByLabel(/Buscar por nombre/i)).toBeVisible({ timeout: 60_000 })
  return { contexto, page, email }
}

const resultado = (page: Page) => page.getByTestId("resultado-checkin")

test.describe("check-in con varios celulares", () => {
  test.skip(!REF, "Sin .env.local no se sabe la clave de sesion de Supabase")

  for (const cantidad of [2, 3, 5]) {
    test(`${cantidad} celulares registran a la misma persona al mismo tiempo: queda UNA vez`, async ({ browser }) => {
      const base = crearBase(PERSONAS)
      const celulares = await Promise.all(Array.from({ length: cantidad }, (_, i) => abrirCelular(browser, base, i)))

      for (const { page } of celulares) await page.getByLabel(/Buscar por nombre/i).fill("iara colombo")
      for (const { page } of celulares) await expect(page.getByTestId("resultados-busqueda")).toContainText("Iara Colombo")

      // Todos aprietan Enter a la vez.
      await Promise.all(celulares.map(({ page }) => page.getByLabel(/Buscar por nombre/i).press("Enter")))

      const textos: string[] = []
      for (const { page } of celulares) {
        await expect(resultado(page)).toContainText(/CHECK-IN OK|YA REGISTRADO/)
        textos.push((await resultado(page).innerText()).toUpperCase())
      }
      expect(textos.filter((t) => t.includes("CHECK-IN OK"))).toHaveLength(1)
      expect(textos.filter((t) => t.includes("YA REGISTRADO"))).toHaveLength(cantidad - 1)
      expect(base.estado.updatesQueRegistraron).toBe(1)

      // El que perdio dice quien lo registro.
      const ganador = String(base.tabla.get("iara")!.checked_in_by)
      for (const t of textos.filter((x) => x.includes("YA REGISTRADO"))) expect(t).toContain(ganador.toUpperCase())

      for (const { contexto } of celulares) await contexto.close()
    })
  }

  test("5 celulares registran a toda la lista a la vez, en distinto orden: cada uno una vez", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const celulares = await Promise.all(Array.from({ length: 5 }, (_, i) => abrirCelular(browser, base, i)))
    await Promise.all(
      celulares.map(async ({ page }, i) => {
        const orden = [...PERSONAS].sort(() => Math.random() - 0.5)
        for (const p of orden) {
          await page.getByLabel(/Buscar por nombre/i).fill(String(p.dni))
          await page.getByLabel(/Buscar por nombre/i).press("Enter")
          await expect(resultado(page)).toContainText(/CHECK-IN OK|YA REGISTRADO/)
          await page.getByRole("button", { name: "Limpiar" }).click()
        }
        return i
      }),
    )
    expect(base.estado.updatesQueRegistraron).toBe(PERSONAS.length)
    expect([...base.tabla.values()].every((f) => f.checked_in === true)).toBe(true)
    for (const { contexto } of celulares) await contexto.close()
  })

  test("el contador de presentes sube y Enter con dos parecidos no registra a nadie", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const { page, contexto } = await abrirCelular(browser, base, 0)
    const buscador = page.getByLabel(/Buscar por nombre/i)

    // "ia" trae a Iara y a Ian: Enter no adivina.
    await buscador.fill("ia")
    await expect(page.getByTestId("resultados-busqueda").getByRole("button")).toHaveCount(2)
    await buscador.press("Enter")
    expect(base.estado.updatesQueRegistraron).toBe(0)

    // Se toca el correcto.
    await page.getByTestId("resultados-busqueda").getByRole("button", { name: /Iara Colombo/ }).click()
    await expect(resultado(page)).toContainText("CHECK-IN OK")
    await expect(resultado(page)).toContainText("Iara Colombo")
    await expect(resultado(page)).toContainText("CON MEDALLA")
    expect(base.estado.updatesQueRegistraron).toBe(1)
    await expect(page.getByTitle("Presentes")).toHaveText("1")
    await expect(page.getByTitle("Faltan")).toHaveText(String(PERSONAS.length - 1))
    await contexto.close()
  })

  test("busqueda inteligente: todas las formas de escribir 'Iara Colombo'", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const { page, contexto } = await abrirCelular(browser, base, 0)
    const buscador = page.getByLabel(/Buscar por nombre/i)
    for (const forma of ["iara", "colombo", "ia colomb", "colombo iara", "COLOMBO, IARA", "íara", "colonbo", "35123456", "35.123.456", "123456"]) {
      await buscador.fill(forma)
      const primero = page.getByTestId("resultados-busqueda").getByRole("button").first()
      await expect(primero, `buscando "${forma}"`).toContainText("Iara Colombo")
    }
    // Nada se registro solo por buscar.
    expect(base.estado.updatesQueRegistraron).toBe(0)
    await contexto.close()
  })

  test("una inscripcion pendiente aparece y dice que no esta confirmada", async ({ browser }) => {
    const base = crearBase([...PERSONAS, PENDIENTE])
    const { page, contexto } = await abrirCelular(browser, base, 0)
    await page.getByLabel(/Buscar por nombre/i).fill("pedro pendiente")
    const fila = page.getByTestId("resultados-busqueda").getByRole("button", { name: /Pedro Pendiente/ })
    await expect(fila).toBeVisible()
    await fila.click()
    await expect(resultado(page)).toContainText("NO CONFIRMADA")
    expect(base.tabla.get("pend")!.checked_in).toBe(false)
    await contexto.close()
  })

  test("si la base no deja escribir, NO dice exitoso", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    base.estado.bloquearEscritura = true
    const { page, contexto } = await abrirCelular(browser, base, 0)
    await page.getByLabel(/Buscar por nombre/i).fill("35123456")
    await page.getByLabel(/Buscar por nombre/i).press("Enter")
    await expect(resultado(page)).toContainText("SIN PERMISO")
    await expect(resultado(page)).not.toContainText("CHECK-IN OK")
    await contexto.close()
  })

  test("deshacer pide dos toques y deja volver a registrar", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const { page, contexto } = await abrirCelular(browser, base, 0)
    await page.getByLabel(/Buscar por nombre/i).fill("35123456")
    await page.getByLabel(/Buscar por nombre/i).press("Enter")
    await expect(resultado(page)).toContainText("CHECK-IN OK")

    await resultado(page).getByRole("button", { name: /Deshacer/ }).click()
    expect(base.tabla.get("iara")!.checked_in).toBe(true) // un toque no alcanza
    await resultado(page).getByRole("button", { name: /Tocá de nuevo/ }).click()
    await expect.poll(() => base.tabla.get("iara")!.checked_in).toBe(false)

    await page.getByLabel(/Buscar por nombre/i).fill("35123456")
    await page.getByLabel(/Buscar por nombre/i).press("Enter")
    await expect(resultado(page)).toContainText("CHECK-IN OK")
    await contexto.close()
  })

  test("sin señal: registra en el celular y lo sube solo al volver, sin duplicar", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const a = await abrirCelular(browser, base, 0)
    const b = await abrirCelular(browser, base, 1)

    // El celular A se queda sin señal y registra a Iara y a Jose.
    base.estado.sinRed = true
    await a.contexto.setOffline(true)
    for (const dni of ["35123456", "30555666"]) {
      await a.page.getByLabel(/Buscar por nombre/i).fill(dni)
      await a.page.getByLabel(/Buscar por nombre/i).press("Enter")
      await expect(resultado(a.page)).toContainText("SIN SEÑAL")
    }
    await expect(a.page.getByText(/2 registros guardados/)).toBeVisible()
    expect(base.estado.updatesQueRegistraron).toBe(0)

    // Mientras tanto, el celular B (con señal) registra a Iara.
    base.estado.sinRed = false
    await b.page.getByLabel(/Buscar por nombre/i).fill("iara colombo")
    await b.page.getByLabel(/Buscar por nombre/i).press("Enter")
    await expect(resultado(b.page)).toContainText("CHECK-IN OK")

    // Vuelve la señal en A: sube lo suyo. Iara ya estaba: no se duplica.
    await a.contexto.setOffline(false)
    await expect(a.page.getByText(/registros? guardados?/)).toHaveCount(0, { timeout: 20_000 })
    expect(base.estado.updatesQueRegistraron).toBe(2) // Iara (por B) y Jose (por A)
    expect(base.tabla.get("iara")!.checked_in_by).toBe(b.email)
    expect(base.tabla.get("jose")!.checked_in_by).toBe(a.email)

    await a.contexto.close()
    await b.contexto.close()
  })

  test("lo registrado sin señal sobrevive a recargar la pagina", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const a = await abrirCelular(browser, base, 0)
    base.estado.sinRed = true
    await a.contexto.setOffline(true)
    await a.page.getByLabel(/Buscar por nombre/i).fill("35123456")
    await a.page.getByLabel(/Buscar por nombre/i).press("Enter")
    await expect(resultado(a.page)).toContainText("SIN SEÑAL")

    // Se recarga con señal (el celular se reinicio, se cerro la pestaña...).
    base.estado.sinRed = false
    await a.contexto.setOffline(false)
    await a.page.reload()
    await expect.poll(() => base.estado.updatesQueRegistraron, { timeout: 20_000 }).toBe(1)
    expect(base.tabla.get("iara")!.checked_in_by).toBe(a.email)
    await a.contexto.close()
  })

  test("la pantalla entra en el celular sin desbordar", async ({ browser }) => {
    const base = crearBase(PERSONAS)
    const { page, contexto } = await abrirCelular(browser, base, 0)
    await page.setViewportSize({ width: 320, height: 640 })
    await page.getByLabel(/Buscar por nombre/i).fill("a")
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(desborde).toBeLessThanOrEqual(1)
    await contexto.close()
  })
})
