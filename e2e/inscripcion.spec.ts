import { test, expect, type Page } from "@playwright/test"
import { cargarFechaNacimiento, silenciarAvisoDeVersion } from "./helpers"

// E2E del flujo de inscripción. No toca Supabase real: interceptamos las
// llamadas de red (lookup por DNI y submit) para que los tests sean
// deterministas y no ensucien la base.

const datosPaso1 = {
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

// Devuelve "no encontrado" para el lookup por DNI, así el formulario no
// depende de datos existentes en la base.
async function stubLookup(page: Page) {
  await silenciarAvisoDeVersion(page)
  await page.route("**/api/lookup-participant**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ found: false }) })
  )
}

async function completarPaso1(page: Page) {
  await page.fill("#dni", datosPaso1.dni)
  await page.fill("#nombre", datosPaso1.nombre)
  await page.fill("#apellido", datosPaso1.apellido)
  await page.fill("#email", datosPaso1.email)
  await page.fill("#telefono", datosPaso1.telefono)
  await cargarFechaNacimiento(page, datosPaso1.fechaNacimiento)
  await page.fill("#localidad", datosPaso1.localidad)
  await page.fill("#nombreEmergencia", datosPaso1.nombreEmergencia)
  await page.fill("#telefonoEmergencia", datosPaso1.telefonoEmergencia)
}

test.describe("Inscripción · paso 1", () => {
  test.beforeEach(async ({ page }) => {
    await stubLookup(page)
    await page.goto("/inscripcion")
  })

  test("arranca en el paso 1 con 'Anterior' deshabilitado", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
    await expect(page.getByRole("button", { name: /anterior/i })).toBeDisabled()
  })

  test("el DNI sólo acepta dígitos y se corta en 8", async ({ page }) => {
    await page.fill("#dni", "12.345.678abc90")
    await expect(page.locator("#dni")).toHaveValue("12345678")
  })

  test("no avanza con campos vacíos y abre la lista de lo que falta", async ({ page }) => {
    await page.getByRole("button", { name: /siguiente/i }).click()
    // En vez de un cartel que se va solo, un modal con cada dato que falta y
    // un botón que lleva hasta el campo. El detalle está en faltantes.spec.ts.
    const modal = page.getByRole("dialog")
    await expect(modal.getByText(/faltan 9 datos para seguir/i)).toBeVisible()

    // Sigue en el paso 1. (Se cierra el modal primero: mientras está abierto,
    // el fondo queda oculto para las búsquedas por rol.)
    await modal.getByRole("button", { name: /^cerrar$/i }).click()
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
  })

  test("no avanza si falta un solo campo obligatorio", async ({ page }) => {
    await completarPaso1(page)
    await page.fill("#telefonoEmergencia", "")
    await page.getByRole("button", { name: /siguiente/i }).click()

    const modal = page.getByRole("dialog")
    await expect(modal.getByText("Teléfono de emergencia", { exact: true })).toBeVisible()
    await modal.getByRole("button", { name: /^cerrar$/i }).click()
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
  })

  test("avanza al paso 2 con el paso 1 completo", async ({ page }) => {
    await completarPaso1(page)
    await page.getByRole("button", { name: /siguiente/i }).click()
    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /anterior/i })).toBeEnabled()
  })

  test("volver al paso 1 conserva los datos cargados", async ({ page }) => {
    await completarPaso1(page)
    await page.getByRole("button", { name: /siguiente/i }).click()
    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
    await page.getByRole("button", { name: /anterior/i }).click()
    await expect(page.locator("#nombre")).toHaveValue(datosPaso1.nombre)
    await expect(page.locator("#email")).toHaveValue(datosPaso1.email)
  })
})

test.describe("Inscripción · paso 2 (salud)", () => {
  test("no avanza sin completar los campos de salud", async ({ page }) => {
    await stubLookup(page)
    await page.goto("/inscripcion")
    await completarPaso1(page)
    await page.getByRole("button", { name: /siguiente/i }).click()
    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()

    await page.getByRole("button", { name: /siguiente/i }).click()

    // Dice qué falta de salud y sigue en el paso 2.
    const modal = page.getByRole("dialog")
    await expect(modal.getByText("Grupo sanguíneo", { exact: true })).toBeVisible()
    await modal.getByRole("button", { name: /^cerrar$/i }).click()
    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
  })
})

test.describe("Inscripción · borrador local", () => {
  test("ofrece retomar un borrador guardado previamente", async ({ page }) => {
    await stubLookup(page)
    await page.goto("/inscripcion")
    await completarPaso1(page)
    // El draft se guarda en cada cambio de formData.
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("inscripcion-draft-v2") !== null))
      .toBe(true)

    await page.reload()
    await expect(page.getByText(/inscripción a medio completar/i)).toBeVisible()

    await page.getByRole("button", { name: /retomar/i }).click()
    await expect(page.locator("#nombre")).toHaveValue(datosPaso1.nombre)
  })

  test("'Empezar de cero' descarta el borrador", async ({ page }) => {
    await stubLookup(page)
    await page.goto("/inscripcion")
    await completarPaso1(page)
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("inscripcion-draft-v2") !== null))
      .toBe(true)

    await page.reload()
    await page.getByRole("button", { name: /empezar de cero/i }).click()
    await expect(page.locator("#nombre")).toHaveValue("")
  })
})

test.describe("Consola limpia", () => {
  // El bug reportado en error.md era un hydration mismatch. Estos tests fallan
  // si vuelve a aparecer un error de hidratación en las páginas clave.
  for (const ruta of ["/", "/inscripcion", "/pedir-remera"]) {
    test(`${ruta} no genera errores de hidratación`, async ({ page }) => {
      const errores: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") errores.push(msg.text())
      })

      await page.goto(ruta, { waitUntil: "networkidle" })

      const hidratacion = errores.filter((e) =>
        /hydrat|server rendered HTML didn't match|Text content does not match/i.test(e)
      )
      expect(hidratacion, `Errores de hidratación en ${ruta}:\n${hidratacion.join("\n")}`).toEqual([])
    })
  }
})
