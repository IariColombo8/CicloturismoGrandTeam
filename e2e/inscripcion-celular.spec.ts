import { test, expect, devices, type Page } from "@playwright/test"
import { abrirInscripcion, cargarFechaNacimiento, comprobanteDePrueba } from "./helpers"

// Recorrido completo de la inscripción en un celular. Nació de un error
// reportado en el teléfono que no se veía en la compu: acá se recorren los 4
// pasos con viewport y user agent de celular, y cualquier excepción de
// JavaScript hace fallar el test (antes no había forma de verlas).
//
// No toca la base: el lookup por DNI y el submit están interceptados.

test.use({ ...devices["Pixel 5"] })

const datos = {
  dni: "31234567",
  nombre: "Juan",
  apellido: "Perez",
  email: "juan.test@example.com",
  telefono: "3442654257",
  fechaNacimiento: "1990-05-12",
  localidad: "Concepción del Uruguay",
  nombreEmergencia: "Maria Perez",
  telefonoEmergencia: "3442111222",
  numeroReferencia: "Juan Perez",
}

/** Excepciones de JS y errores de consola, descartando el ruido de red. */
function vigilarErrores(page: Page) {
  const excepciones: string[] = []
  const consola: string[] = []

  page.on("pageerror", (err) => excepciones.push(`${err.name}: ${err.message}\n${err.stack ?? ""}`))
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const texto = msg.text()
    // Sin credenciales locales, Supabase y analytics fallan: no es este bug.
    if (/Failed to load resource|net::ERR_|supabase\.co|vitals\.vercel/i.test(texto)) return
    consola.push(texto)
  })

  return { excepciones, consola }
}

async function stubRed(page: Page) {
  await page.route("**/api/lookup-participant**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ found: false }) }),
  )
  await page.route("**/api/inscripcion/submit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, tokenQR: "token-de-prueba", numeroInscripcion: null }),
    }),
  )
}

async function completarPaso1(page: Page) {
  await page.fill("#dni", datos.dni)
  await page.fill("#nombre", datos.nombre)
  await page.fill("#apellido", datos.apellido)
  await page.fill("#email", datos.email)
  await page.fill("#telefono", datos.telefono)
  await cargarFechaNacimiento(page, datos.fechaNacimiento)
  await page.fill("#localidad", datos.localidad)
  await page.fill("#nombreEmergencia", datos.nombreEmergencia)
  await page.fill("#telefonoEmergencia", datos.telefonoEmergencia)
}

async function completarPaso2(page: Page) {
  await page.locator("#distancia-si").click()

  await page.fill("#grupoCiclistas", "Sin grupo")
  // Cierra el desplegable de sugerencias.
  await page.getByRole("heading", { name: /información médica/i }).click()

  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "O+", exact: true }).click()

  await page.locator("#celiaco-no").click()
  await page.locator("#alergias-no").click()
  await page.locator("#salud-no").click()
}

async function completarPaso3(page: Page, archivo = comprobanteDePrueba()) {
  await page.fill("#numeroReferencia", datos.numeroReferencia)
  await page.setInputFiles("#comprobante", archivo)
}

async function siguiente(page: Page) {
  await page.getByRole("button", { name: /siguiente/i }).click()
}

/** Paso 1 → 4, dejando el deslinde aceptado y listo para enviar. */
async function hastaElFinal(page: Page, archivo = comprobanteDePrueba()) {
  await completarPaso1(page)
  await siguiente(page)
  await completarPaso2(page)
  await siguiente(page)
  await completarPaso3(page, archivo)
  await siguiente(page)
  await page.getByRole("button", { name: /acepto el deslinde/i }).click()
}

test.describe("Inscripción en celular", () => {
  // El recorrido completo contra el dev server no entra en 30 segundos.
  test.setTimeout(120_000)

  test("los 4 pasos se recorren sin errores de JavaScript", async ({ page }) => {
    const { excepciones, consola } = vigilarErrores(page)
    await stubRed(page)
    await abrirInscripcion(page)

    await completarPaso1(page)
    await siguiente(page)

    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
    await completarPaso2(page)
    await siguiente(page)

    await expect(page.getByRole("heading", { name: /método de pago/i })).toBeVisible()
    await completarPaso3(page)
    await siguiente(page)

    // Paso 4: el deslinde se abre solo.
    await expect(page.getByRole("dialog")).toBeVisible()
    const aceptar = page.getByRole("button", { name: /acepto el deslinde/i })
    await expect(aceptar).toBeEnabled()
    await aceptar.click()

    await expect(page.getByRole("button", { name: /enviar inscripción/i })).toBeEnabled()

    expect(excepciones, `Excepciones de JS:\n${excepciones.join("\n")}`).toEqual([])
    expect(consola, `Errores de consola:\n${consola.join("\n")}`).toEqual([])
  })

  test("enviar la inscripción lleva a la pantalla de éxito", async ({ page }) => {
    const { excepciones } = vigilarErrores(page)
    await stubRed(page)
    await abrirInscripcion(page)

    await hastaElFinal(page)
    await page.getByRole("button", { name: /enviar inscripción/i }).click()

    await page.waitForURL("**/inscripcion/exito", { timeout: 30_000 })
    expect(excepciones, `Excepciones de JS:\n${excepciones.join("\n")}`).toEqual([])
  })

  test("la fecha de nacimiento se carga sin depender del calendario del celular", async ({ page }) => {
    await stubRed(page)
    await abrirInscripcion(page)

    // Tres campos comunes, no un selector nativo de fecha.
    const dia = page.locator("#fechaNacimiento-dia")
    const mes = page.locator("#fechaNacimiento-mes")
    const anio = page.locator("#fechaNacimiento-anio")

    for (const campo of [dia, mes, anio]) {
      await expect(campo).toBeVisible()
      await expect(campo).toBeEditable()
      const caja = await campo.boundingBox()
      expect(caja, "el campo no tiene caja visible").not.toBeNull()
      // 44px es el mínimo que recomiendan Apple y Google para tocar con el dedo.
      expect(caja!.height, "campo muy bajo para tocarlo con el dedo").toBeGreaterThanOrEqual(44)
    }

    await cargarFechaNacimiento(page, "1990-05-12")
    await expect(page.getByText(/años/)).toBeVisible()
  })

  test("escribir la fecha a mano alcanza para pasar al paso 2", async ({ page }) => {
    await stubRed(page)
    await abrirInscripcion(page)

    await completarPaso1(page)
    await siguiente(page)
    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
  })

  test("una fecha imposible avisa pero no rompe nada", async ({ page }) => {
    await stubRed(page)
    await abrirInscripcion(page)

    await page.fill("#fechaNacimiento-dia", "31")
    await page.selectOption("#fechaNacimiento-mes", "02")
    await page.fill("#fechaNacimiento-anio", "1990")

    await expect(page.getByText(/esa fecha no existe/i)).toBeVisible()
    await expect(page.locator("#fechaNacimiento")).toHaveValue("")

    // Se corrige y queda bien.
    await page.fill("#fechaNacimiento-dia", "28")
    await expect(page.locator("#fechaNacimiento")).toHaveValue("1990-02-28")
  })

  test("el paso 1 no desborda la pantalla del celular", async ({ page }) => {
    await stubRed(page)
    await abrirInscripcion(page)

    const { ancho, ventana } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      ventana: window.innerWidth,
    }))
    expect(ancho, "la página se puede arrastrar para los costados en el celular").toBeLessThanOrEqual(ventana + 1)
  })
})

test.describe("Inscripción · nada puede frenarla", () => {
  // Cada uno de estos casos antes terminaba en un error y dejaba a la persona
  // sin inscripción después de llenar los cuatro pasos.

  // Hay archivos de 30 MB y esperas de reintento: estos tests son lentos a
  // propósito.
  test.setTimeout(240_000)

  test("un comprobante de 25 MB se acepta sin protestar", async ({ page }) => {
    const { excepciones } = vigilarErrores(page)
    await stubRed(page)
    await abrirInscripcion(page)

    await completarPaso1(page)
    await siguiente(page)
    await completarPaso2(page)
    await siguiente(page)
    await completarPaso3(page, comprobanteDePrueba("foto-enorme.png", 25 * 1024 * 1024))

    // Ni un cartel de error, y se puede seguir.
    await expect(page.getByText(/no puede superar|supera los|solo se permiten/i)).toHaveCount(0)
    await siguiente(page)
    await expect(page.getByRole("button", { name: /acepto el deslinde/i })).toBeVisible()
    expect(excepciones, `Excepciones de JS:\n${excepciones.join("\n")}`).toEqual([])
  })

  test("un PDF de 20 MB tampoco frena la inscripción", async ({ page }) => {
    await stubRed(page)
    await abrirInscripcion(page)

    await completarPaso1(page)
    await siguiente(page)
    await completarPaso2(page)
    await siguiente(page)
    await completarPaso3(page, comprobanteDePrueba("comprobante.pdf", 20 * 1024 * 1024))

    // Avisa que se lo van a pedir aparte, pero toma la inscripción.
    await expect(page.getByText(/tomamos tu inscripción igual/i)).toBeVisible({ timeout: 30_000 })
    await siguiente(page)
    await page.getByRole("button", { name: /acepto el deslinde/i }).click()
    await page.getByRole("button", { name: /enviar inscripción/i }).click()
    await page.waitForURL("**/inscripcion/exito", { timeout: 30_000 })
  })

  test("sin internet, la inscripción queda guardada y se envía cuando vuelve", async ({ page, context }) => {
    const { excepciones } = vigilarErrores(page)
    await stubRed(page)
    await abrirInscripcion(page)
    await hastaElFinal(page)

    // Se corta internet justo antes de enviar. Hay que cortar también la ruta
    // interceptada: si no, el stub contesta igual y no habría corte real.
    let sinInternet = true
    await page.route("**/api/inscripcion/submit", async (route) => {
      if (sinInternet) return route.abort("internetdisconnected")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, tokenQR: "token-de-prueba", numeroInscripcion: null }),
      })
    })
    await context.setOffline(true)
    await page.getByRole("button", { name: /enviar inscripción/i }).click()

    // Confirmación en la misma pantalla: sin red no se puede cargar otra
    // página, y el navegador mostraría su propio cartel de error.
    await expect(page.getByText(/quedaron guardados en este teléfono/i)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/hubo un problema|error/i)).toHaveCount(0)

    // Está guardada en el navegador, esperando.
    const pendientes = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const req = indexedDB.open("grandteam-inscripciones", 1)
          req.onsuccess = () => {
            try {
              const tx = req.result.transaction("pendientes", "readonly")
              const todo = tx.objectStore("pendientes").getAll()
              todo.onsuccess = () => resolve(todo.result.length)
              todo.onerror = () => resolve(-1)
            } catch {
              resolve(-1)
            }
          }
          req.onerror = () => resolve(-1)
        }),
    )
    expect(pendientes, "la inscripción tendría que estar guardada esperando internet").toBeGreaterThan(0)

    // Vuelve internet: se envía sola, sin que la persona toque nada.
    sinInternet = false
    await context.setOffline(false)
    await expect(page.getByText(/inscripción enviada/i)).toBeVisible({ timeout: 90_000 })
    expect(excepciones, `Excepciones de JS:\n${excepciones.join("\n")}`).toEqual([])
  })

  test("si el servidor falla, la persona no ve ningún error", async ({ page }) => {
    await stubRed(page)
    // El servidor se cae justo en el envío.
    await page.route("**/api/inscripcion/submit", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) }),
    )
    await abrirInscripcion(page)
    await hastaElFinal(page)
    await page.getByRole("button", { name: /enviar inscripción/i }).click()

    await expect(page.getByText(/quedaron guardados en este teléfono/i)).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(/hubo un problema/i)).toHaveCount(0)
  })

  test("el envío no se queda esperando una conexión lentísima", async ({ page }) => {
    await stubRed(page)
    // La respuesta nunca llega.
    await page.route("**/api/inscripcion/submit", () => {})
    await abrirInscripcion(page)
    await hastaElFinal(page)
    await page.getByRole("button", { name: /enviar inscripción/i }).click()

    // Corta por timeout y guarda, sin dejar a la persona mirando un spinner
    // para siempre.
    await expect(page.getByText(/quedaron guardados en este teléfono/i)).toBeVisible({ timeout: 120_000 })
  })
})
