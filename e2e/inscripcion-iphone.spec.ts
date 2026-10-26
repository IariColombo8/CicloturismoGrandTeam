import { test, expect, devices, type Page } from "@playwright/test"
import { cargarFechaNacimiento, cerrarAvisosDelEvento, comprobanteDePrueba, silenciarAvisoDeVersion } from "./helpers"

// Los mismos pasos, pero en Safari de iPhone (WebKit). No es por repetir: las
// cosas que se rompen en el celular casi siempre se rompen primero acá —
// Safari es el que más se diferencia en campos de fecha, cámara, IndexedDB y
// almacenamiento.

// Sin Service Worker: apenas carga toma el control de la pagina (skipWaiting +
// clients.claim) y en WebKit las peticiones que pasan por el ya no las
// intercepta page.route. El /api/version silenciado llegaba igual, salia el
// cartel "Hicimos actualizaciones" tapando el "Entendido" de los avisos y el
// test se colgaba. Lo offline se prueba en offline.spec.ts y en
// inscripcion-celular.spec.ts, que si usan el worker.
test.use({ ...devices["iPhone 13"], serviceWorkers: "block" })
test.setTimeout(180_000)

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
}

async function stubRed(page: Page) {
  await silenciarAvisoDeVersion(page)
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

/** En WebKit la hidratación tarda más: esperamos a que el DNI filtre letras. */
async function abrir(page: Page) {
  await cerrarAvisosDelEvento(page)
  await page.goto("/inscripcion")
  await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
  await expect(async () => {
    await page.fill("#dni", "a7")
    await expect(page.locator("#dni")).toHaveValue("7", { timeout: 1_500 })
  }).toPass({ timeout: 40_000 })
  await page.fill("#dni", "")
}

test.describe("Inscripción en iPhone (Safari)", () => {
  test("se puede completar el paso 1, fecha incluida", async ({ page }) => {
    const errores: string[] = []
    page.on("pageerror", (e) => errores.push(`${e.name}: ${e.message}`))

    await stubRed(page)
    await abrir(page)

    await page.fill("#dni", datos.dni)
    await page.fill("#nombre", datos.nombre)
    await page.fill("#apellido", datos.apellido)
    await page.fill("#email", datos.email)
    await page.fill("#telefono", datos.telefono)
    await cargarFechaNacimiento(page, datos.fechaNacimiento)
    await page.fill("#localidad", datos.localidad)
    await page.fill("#nombreEmergencia", datos.nombreEmergencia)
    await page.fill("#telefonoEmergencia", datos.telefonoEmergencia)

    await page.getByRole("button", { name: /siguiente/i }).click()
    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
    expect(errores, `Excepciones de JS en Safari:\n${errores.join("\n")}`).toEqual([])
  })

  test("una foto pesada tampoco frena el paso del pago", async ({ page }) => {
    await stubRed(page)
    await abrir(page)

    await page.fill("#dni", datos.dni)
    await page.fill("#nombre", datos.nombre)
    await page.fill("#apellido", datos.apellido)
    await page.fill("#email", datos.email)
    await page.fill("#telefono", datos.telefono)
    await cargarFechaNacimiento(page, datos.fechaNacimiento)
    await page.fill("#localidad", datos.localidad)
    await page.fill("#nombreEmergencia", datos.nombreEmergencia)
    await page.fill("#telefonoEmergencia", datos.telefonoEmergencia)
    await page.getByRole("button", { name: /siguiente/i }).click()

    await page.locator("#distancia-si").click()
    await page.fill("#grupoCiclistas", "Sin grupo")
    await page.getByRole("heading", { name: /información médica/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "O+", exact: true }).click()
    await page.locator("#celiaco-no").click()
    await page.locator("#alergias-no").click()
    await page.locator("#salud-no").click()
    await page.getByRole("button", { name: /siguiente/i }).click()

    await page.fill("#numeroReferencia", "Juan Perez")
    await page.setInputFiles("#comprobante", comprobanteDePrueba("foto.png", 12 * 1024 * 1024))

    await expect(page.getByText(/no puede superar|supera los/i)).toHaveCount(0)
    await page.getByRole("button", { name: /siguiente/i }).click()
    await expect(page.getByRole("button", { name: /acepto el deslinde/i })).toBeVisible()
  })

  test("nada se sale de la pantalla del iPhone", async ({ page }) => {
    await stubRed(page)
    await abrir(page)

    const { ancho, scroll } = await page.evaluate(() => ({
      ancho: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(scroll).toBeLessThanOrEqual(ancho + 1)
  })
})
