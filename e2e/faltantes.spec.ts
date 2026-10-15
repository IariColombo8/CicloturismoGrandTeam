import { test, expect, devices, type Page } from "@playwright/test"
import { abrirInscripcion, cargarFechaNacimiento, comprobanteDePrueba } from "./helpers"

// Cuando falta un dato, nadie puede quedarse sin saber qué hacer.
//
// Antes aparecía un cartelito "Campos incompletos" que se iba en tres segundos:
// no decía qué faltaba ni dónde estaba. Ahora se abre un modal con la lista, y
// tocando cualquiera la pantalla lleva hasta ese campo y lo marca con un anillo.

test.use({ ...devices["Pixel 5"] })
test.setTimeout(120_000)

async function siguiente(page: Page) {
  await page.getByRole("button", { name: /siguiente/i }).click()
}

test.describe("Qué falta para seguir", () => {
  test("con el formulario vacío, lista todo lo que falta", async ({ page }) => {
    await abrirInscripcion(page)
    await siguiente(page)

    const modal = page.getByRole("dialog")
    await expect(modal).toBeVisible()
    await expect(modal.getByText(/faltan 9 datos para seguir/i)).toBeVisible()

    // Cada dato con el nombre que se ve en pantalla y una línea de ayuda.
    for (const etiqueta of [
      "DNI",
      "Nombre",
      "Apellido",
      "Fecha de nacimiento",
      "Email",
      "Teléfono",
      "Ciudad",
      "Contacto de emergencia",
      "Teléfono de emergencia",
    ]) {
      await expect(modal.getByText(etiqueta, { exact: true })).toBeVisible()
    }
    await expect(modal.getByText(/ahí te llega la confirmación con tu qr/i)).toBeVisible()

    // Y sigue en el paso 1. (Se cierra el modal primero: mientras está
    // abierto, el fondo queda oculto para los lectores de pantalla y para
    // las búsquedas por rol.)
    await modal.getByRole("button", { name: /^cerrar$/i }).click()
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
  })

  test("con la lista larga, los botones siguen al alcance en el celular", async ({ page }) => {
    await abrirInscripcion(page)
    await siguiente(page)

    const modal = page.getByRole("dialog")
    await expect(modal).toBeVisible()

    // Con nueve datos faltantes el modal se iba de la pantalla y los botones
    // quedaban fuera de alcance: no se podía ni cerrar.
    const caja = await modal.boundingBox()
    const alto = page.viewportSize()?.height ?? 0
    expect(caja!.height, "el modal es más alto que la pantalla").toBeLessThanOrEqual(alto)

    for (const nombre of [/empezar por el primero/i, /^cerrar$/i]) {
      const boton = modal.getByRole("button", { name: nombre })
      const cajaBoton = await boton.boundingBox()
      expect(cajaBoton, `el botón ${nombre} no está en pantalla`).not.toBeNull()
      expect(cajaBoton!.y + cajaBoton!.height, `el botón ${nombre} quedó fuera de la pantalla`).toBeLessThanOrEqual(
        alto,
      )
    }

    await modal.getByRole("button", { name: /^cerrar$/i }).click({ timeout: 10_000 })
    await expect(modal).toHaveCount(0)
  })

  test("si falta un solo dato, lo dice en singular", async ({ page }) => {
    await abrirInscripcion(page)

    await page.fill("#dni", "31234567")
    await page.fill("#nombre", "Juan")
    await page.fill("#apellido", "Perez")
    await cargarFechaNacimiento(page, "1990-05-12")
    await page.fill("#email", "juan@example.com")
    await page.fill("#telefono", "3442654257")
    await page.fill("#localidad", "Concepción del Uruguay")
    await page.fill("#nombreEmergencia", "Maria Perez")
    // Falta solo el teléfono de emergencia.
    await siguiente(page)

    const modal = page.getByRole("dialog")
    await expect(modal.getByText(/falta un dato para seguir/i)).toBeVisible()
    await expect(modal.getByText("Teléfono de emergencia", { exact: true })).toBeVisible()
    await expect(modal.getByRole("button", { name: /ir al campo/i })).toBeVisible()
  })

  test("el botón lleva hasta el campo, lo marca y lo deja listo para escribir", async ({ page }) => {
    await abrirInscripcion(page)
    await siguiente(page)

    await page.getByRole("button", { name: /empezar por el primero/i }).click()

    // El modal se cierra.
    await expect(page.getByRole("dialog")).toHaveCount(0)

    // El campo queda enfocado: se puede escribir sin tocar nada más.
    await expect(page.locator("#dni")).toBeFocused()
    // Y marcado con el anillo.
    await expect(page.locator(".gt-resaltado")).toHaveCount(1)
    await expect(page.locator("#dni").locator("xpath=ancestor::*[@data-campo]")).toHaveClass(/gt-resaltado/)

    // Al escribir, la marca se va sola.
    await page.fill("#dni", "31234567")
    await expect(page.locator(".gt-resaltado")).toHaveCount(0)
  })

  test("se puede elegir cualquiera de la lista, no solo el primero", async ({ page }) => {
    await abrirInscripcion(page)
    await siguiente(page)

    await page.getByRole("dialog").getByText("Ciudad", { exact: true }).click()

    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator("#localidad")).toBeFocused()
  })

  test("el modal se puede cerrar y el formulario queda como estaba", async ({ page }) => {
    await abrirInscripcion(page)
    await page.fill("#nombre", "Juan")
    await siguiente(page)

    await page.getByRole("dialog").getByRole("button", { name: /^cerrar$/i }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator("#nombre")).toHaveValue("Juan")
  })

  test("en el paso de salud nombra la pregunta, no el nombre interno", async ({ page }) => {
    await abrirInscripcion(page)

    await page.fill("#dni", "31234567")
    await page.fill("#nombre", "Juan")
    await page.fill("#apellido", "Perez")
    await cargarFechaNacimiento(page, "1990-05-12")
    await page.fill("#email", "juan@example.com")
    await page.fill("#telefono", "3442654257")
    await page.fill("#localidad", "Concepción del Uruguay")
    await page.fill("#nombreEmergencia", "Maria Perez")
    await page.fill("#telefonoEmergencia", "3442111222")
    await siguiente(page)

    await expect(page.getByRole("heading", { name: /experiencia en ciclismo/i })).toBeVisible()
    await siguiente(page)

    const modal = page.getByRole("dialog")
    await expect(modal.getByText(/¿recorriste 50 km antes\?/i)).toBeVisible()
    await expect(modal.getByText("Grupo sanguíneo", { exact: true })).toBeVisible()
    await expect(modal.getByText(/si no lo sabés/i)).toBeVisible()

    // Llevar a una pregunta de sí/no marca el bloque entero, no un botón suelto.
    await modal.getByText(/¿recorriste 50 km antes\?/i).click()
    await expect(page.locator("#campo-distancia")).toHaveClass(/gt-resaltado/)
  })

  test("en el paso del pago también dice qué falta", async ({ page }) => {
    await abrirInscripcion(page)

    await page.fill("#dni", "31234567")
    await page.fill("#nombre", "Juan")
    await page.fill("#apellido", "Perez")
    await cargarFechaNacimiento(page, "1990-05-12")
    await page.fill("#email", "juan@example.com")
    await page.fill("#telefono", "3442654257")
    await page.fill("#localidad", "Concepción del Uruguay")
    await page.fill("#nombreEmergencia", "Maria Perez")
    await page.fill("#telefonoEmergencia", "3442111222")
    await siguiente(page)

    await page.locator("#distancia-si").click()
    await page.fill("#grupoCiclistas", "Sin grupo")
    await page.getByRole("heading", { name: /información médica/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "O+", exact: true }).click()
    await page.locator("#celiaco-no").click()
    await page.locator("#alergias-no").click()
    await page.locator("#salud-no").click()
    await siguiente(page)

    await expect(page.getByRole("heading", { name: /método de pago/i })).toBeVisible()
    await siguiente(page)

    const modal = page.getByRole("dialog")
    await expect(modal.getByText(/faltan 2 datos/i)).toBeVisible()
    await expect(modal.getByText("Nombre de quien transfirió", { exact: true })).toBeVisible()
    await expect(modal.getByText("Comprobante de pago", { exact: true })).toBeVisible()

    // Se completa uno y el aviso ya solo nombra el que falta.
    await modal.getByText("Nombre de quien transfirió", { exact: true }).click()
    await page.fill("#numeroReferencia", "Juan Perez")
    await siguiente(page)
    await expect(page.getByRole("dialog").getByText(/falta un dato/i)).toBeVisible()
    await expect(page.getByRole("dialog").getByText("Comprobante de pago", { exact: true })).toBeVisible()

    // Y con el comprobante, avanza al último paso (donde el deslinde se abre
    // solo, así que lo que se ve es ese modal).
    await page.getByRole("dialog").getByRole("button", { name: /^cerrar$/i }).click()
    await page.setInputFiles("#comprobante", comprobanteDePrueba())
    await siguiente(page)
    await expect(page.getByRole("button", { name: /acepto el deslinde/i })).toBeVisible()
  })

  test("al enviar sin aceptar el deslinde, explica qué hacer", async ({ page }) => {
    await abrirInscripcion(page)

    await page.fill("#dni", "31234567")
    await page.fill("#nombre", "Juan")
    await page.fill("#apellido", "Perez")
    await cargarFechaNacimiento(page, "1990-05-12")
    await page.fill("#email", "juan@example.com")
    await page.fill("#telefono", "3442654257")
    await page.fill("#localidad", "Concepción del Uruguay")
    await page.fill("#nombreEmergencia", "Maria Perez")
    await page.fill("#telefonoEmergencia", "3442111222")
    await siguiente(page)

    await page.locator("#distancia-si").click()
    await page.fill("#grupoCiclistas", "Sin grupo")
    await page.getByRole("heading", { name: /información médica/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "O+", exact: true }).click()
    await page.locator("#celiaco-no").click()
    await page.locator("#alergias-no").click()
    await page.locator("#salud-no").click()
    await siguiente(page)

    await page.fill("#numeroReferencia", "Juan Perez")
    await page.setInputFiles("#comprobante", comprobanteDePrueba())
    await siguiente(page)

    // El deslinde se abre solo; se cierra sin aceptar.
    await page.keyboard.press("Escape")
    await expect(page.getByRole("button", { name: /acepto el deslinde/i })).toHaveCount(0)

    // El botón de enviar NO está deshabilitado: un botón gris que no hace nada
    // deja a la persona sin saber qué le falta.
    const enviar = page.getByRole("button", { name: /enviar inscripción/i })
    await expect(enviar).toBeEnabled()
    await enviar.click()

    const modal = page.getByRole("dialog")
    await expect(modal.getByText(/aceptar el deslinde de responsabilidad/i).first()).toBeVisible()
    await expect(modal.getByText(/abrí "leer deslinde/i)).toBeVisible()

    // Y lleva hasta la casilla.
    await modal.getByRole("button", { name: /ir al campo/i }).click()
    await expect(page.locator(".gt-resaltado")).toHaveCount(1)
  })
})
