import { test, expect, devices, type Page } from "@playwright/test"
import { cerrarAvisosDelEvento } from "./helpers"

// El sitio tiene que abrir sin internet, y las notificaciones push tienen que
// seguir funcionando: las dos cosas viven en el mismo Service Worker
// (public/sw.js), así que se prueban juntas.

test.use({ ...devices["Pixel 5"] })
test.setTimeout(180_000)

test.beforeEach(async ({ page }) => {
  await cerrarAvisosDelEvento(page)
})

/**
 * Espera a que el Service Worker esté activo y controlando la página.
 *
 * Ojo con `waitForFunction` y una función `async`: devuelve una promesa, que
 * siempre es "verdadera", así que la espera pasa de largo sin comprobar nada.
 * Por eso acá se usa `page.evaluate` (que sí espera la promesa) y una
 * condición sincrónica.
 */
async function esperarServiceWorker(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        if (!("serviceWorker" in navigator)) return reject(new Error("este navegador no soporta Service Workers"))
        const limite = setTimeout(() => reject(new Error("el Service Worker no se activó")), 60_000)
        navigator.serviceWorker.ready.then(() => {
          clearTimeout(limite)
          resolve()
        })
      }),
  )
}

/** Espera a que además esté manejando los pedidos de esta pestaña. */
async function esperarQueControle(page: Page) {
  await esperarServiceWorker(page)
  await page.waitForFunction(() => navigator.serviceWorker.controller != null, null, { timeout: 60_000 })
}

test.describe("El sitio abre sin internet", () => {
  test("el formulario de inscripción carga y se puede completar sin conexión", async ({ page, context }) => {
    await page.route("**/api/lookup-participant**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ found: false }) }),
    )

    // Primera visita con internet: acá el Service Worker guarda la copia.
    await page.goto("/inscripcion")
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
    await esperarServiceWorker(page)

    // Una recarga para que el worker tome el control de la página y guarde el
    // HTML y los archivos que pide.
    await page.reload()
    await esperarQueControle(page)
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
    await page.waitForTimeout(2_000)

    // Se corta internet y se vuelve a entrar.
    await context.setOffline(true)
    await page.reload()

    // El formulario abre igual y se puede escribir.
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible({ timeout: 30_000 })
    await page.fill("#nombre", "Juan")
    await expect(page.locator("#nombre")).toHaveValue("Juan")

    await context.setOffline(false)
  })

  test("una página que nunca se visitó muestra el aviso de sin conexión", async ({ page, context }) => {
    await page.goto("/")
    await esperarServiceWorker(page)
    await page.reload()
    await esperarQueControle(page)

    // Esperar a que la pantalla de sin conexión esté realmente guardada: si se
    // corta la red antes, el test falla por una carrera y no por un bug.
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const nombres = await caches.keys()
            for (const nombre of nombres) {
              const guardada = await (await caches.open(nombre)).match("/offline.html")
              if (guardada) return true
            }
            return false
          }),
        { timeout: 30_000 },
      )
      .toBe(true)

    await context.setOffline(true)
    // Una ruta que no está entre las guardadas.
    await page.goto("/contacto")

    await expect(page.getByText(/te quedaste sin internet/i)).toBeVisible({ timeout: 30_000 })
    // Y aclara que una inscripción enviada no se perdió.
    await expect(page.getByText(/quedó guardado y se envía solo/i)).toBeVisible()

    await context.setOffline(false)
  })
})

test.describe("Las notificaciones push siguen andando", () => {
  test("el Service Worker se registra una sola vez y queda listo para el push", async ({ page }) => {
    await page.goto("/")
    await esperarServiceWorker(page)

    const info = await page.evaluate(async () => {
      const registros = await navigator.serviceWorker.getRegistrations()
      const registro = registros[0]
      return {
        cantidad: registros.length,
        tieneScope: registro?.scope?.endsWith("/") ?? false,
        // Si esto existe, el navegador puede suscribirse a las notificaciones.
        puedeSuscribirse: !!registro?.pushManager,
        url: registro?.active?.scriptURL ?? "",
      }
    })

    // Un solo registro: si hubiera dos con URLs distintas, uno reemplazaría al
    // otro y se perdería la suscripción al push.
    expect(info.cantidad).toBe(1)
    expect(info.tieneScope).toBe(true)
    expect(info.puedeSuscribirse).toBe(true)
    expect(info.url).toContain("/sw.js")
  })

  test("el Service Worker no guarda nada del panel ni de las API", async ({ page }) => {
    await page.goto("/")
    await esperarServiceWorker(page)
    await page.reload()
    await esperarQueControle(page)

    // Pedimos una API y revisamos que no quede guardada.
    await page.evaluate(() => fetch("/api/version").catch(() => null))
    await page.waitForTimeout(1_500)

    // Y que sí haya guardado algo: si la cache estuviera vacía, este test
    // pasaría sin probar nada.
    const cuantas = await page.evaluate(async () => {
      const nombres = await caches.keys()
      let total = 0
      for (const nombre of nombres) total += (await (await caches.open(nombre)).keys()).length
      return total
    })
    expect(cuantas, "el Service Worker no guardó nada").toBeGreaterThan(0)

    const guardadas = await page.evaluate(async () => {
      const nombres = await caches.keys()
      const urls: string[] = []
      for (const nombre of nombres) {
        const cache = await caches.open(nombre)
        for (const req of await cache.keys()) urls.push(req.url)
      }
      return urls
    })

    // Los archivos JS del panel (/_next/static/chunks/app/admin/...) sí se
    // pueden guardar: son estáticos y no tienen datos de nadie. Lo que no puede
    // quedar guardado son las respuestas de las API y las páginas del panel.
    const prohibidas = guardadas
      .map((u) => new URL(u).pathname)
      .filter((p) => !p.startsWith("/_next/"))
      .filter((p) => /^\/api\/|^\/admin|^\/login|^\/auth/.test(p))
    expect(prohibidas, `No deberían estar guardadas:\n${prohibidas.join("\n")}`).toEqual([])
  })
})

test.describe("Aviso de versión nueva", () => {
  test("avisa que hay actualizaciones y se puede cerrar", async ({ page }) => {
    // El servidor dice que la versión publicada es otra.
    await page.route("**/api/version", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "una-version-mas-nueva" }),
      }),
    )

    await page.goto("/")

    await expect(page.getByText(/hicimos actualizaciones/i)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/por favor reiniciá la página/i)).toBeVisible()

    // Se puede cerrar: nadie queda tapado por el cartel.
    await page.getByRole("button", { name: /cerrar el aviso/i }).click()
    await expect(page.getByText(/hicimos actualizaciones/i)).toHaveCount(0)
  })

  test("el cartel no tapa ni bloquea los botones de la página", async ({ page }) => {
    await page.route("**/api/version", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "una-version-mas-nueva" }),
      }),
    )
    await page.route("**/api/lookup-participant**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ found: false }) }),
    )

    await page.goto("/inscripcion")
    await expect(page.getByText(/hicimos actualizaciones/i)).toBeVisible({ timeout: 30_000 })

    // Esto es lo que se rompió una vez: el cartel ocupaba todo el ancho de la
    // pantalla y se comía los clics del botón "Siguiente", que está al final
    // del formulario. La inscripción quedaba trabada.
    await page.getByRole("button", { name: /siguiente/i }).click({ timeout: 15_000 })
    await expect(page.getByRole("dialog").getByText(/faltan? \d* ?datos? para seguir/i)).toBeVisible()
  })

  test("no molesta cuando la versión es la correcta", async ({ page }) => {
    await page.goto("/")
    await page.waitForTimeout(3_000)
    await expect(page.getByText(/hicimos actualizaciones/i)).toHaveCount(0)
  })

  test("sin internet no aparece el aviso", async ({ page, context }) => {
    await page.goto("/")
    await esperarServiceWorker(page)
    await context.setOffline(true)
    await page.waitForTimeout(3_000)
    // Sin saber qué versión hay publicada, no se dice nada.
    await expect(page.getByText(/hicimos actualizaciones/i)).toHaveCount(0)
    await context.setOffline(false)
  })
})
