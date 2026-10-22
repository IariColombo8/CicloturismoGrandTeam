import { test, expect, devices, type Page } from "@playwright/test"
import { silenciarAvisoDeVersion } from "./helpers"

// El pedido de remera, en celular. Tiene los mismos riesgos que la
// inscripción: una foto pesada de comprobante y una conexión que se corta.
// Igual que la inscripción, no puede mostrar un error ni perder el pedido.

test.use({ ...devices["Pixel 5"] })
test.setTimeout(180_000)

async function stubRed(page: Page) {
  await silenciarAvisoDeVersion(page)
  await page.route("**/api/remera/lookup**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ found: false, participante: null, pedido: null }),
    }),
  )
  await page.route("**/api/remera/settings**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ aliasInfo: "Alias de prueba", precio: "25000", talles: ["S", "M", "L"] }),
    }),
  )
}

/** Abre el modal del pedido y espera a que el formulario responda. */
async function abrirModal(page: Page) {
  await page.goto("/pedir-remera")
  const boton = page.getByRole("button", { name: /remera/i }).first()
  await expect(boton).toBeVisible()
  await boton.click()

  // Antes del formulario, el aviso de que es a domicilio y llega despues.
  const aviso = page.getByRole("dialog", { name: "Antes de pedir tu remera" })
  await expect(aviso.getByText(/llega después del evento/)).toBeVisible()
  await aviso.getByRole("button", { name: /entendido/i }).click()

  const dni = page.getByPlaceholder("12345678")
  await expect(dni).toBeVisible({ timeout: 30_000 })

  // Hidratación: el DNI solo acepta números cuando React ya tomó el control.
  await expect(async () => {
    await dni.fill("a7")
    await expect(dni).toHaveValue("7", { timeout: 1_000 })
  }).toPass({ timeout: 30_000 })
  await dni.fill("")
}

test.describe("Pedido de remera en celular", () => {
  test("el formulario abre y acepta los datos de contacto", async ({ page }) => {
    const errores: string[] = []
    page.on("pageerror", (e) => errores.push(`${e.name}: ${e.message}`))

    await stubRed(page)
    await abrirModal(page)

    await page.getByPlaceholder("12345678").fill("31234567")
    await page.getByPlaceholder("Juan Pérez").fill("Juan Perez")
    await page.getByPlaceholder("+54 9 3442 65-4257").fill("3442654257")
    await page.getByPlaceholder("tu@email.com").fill("juan.test@example.com")

    await page.getByRole("button", { name: /continuar/i }).click()
    // Pasó al paso de los talles.
    await expect(page.getByText(/talle/i).first()).toBeVisible()

    expect(errores, `Excepciones de JS:\n${errores.join("\n")}`).toEqual([])
  })

  test("la página del pedido no desborda la pantalla", async ({ page }) => {
    await stubRed(page)
    await page.goto("/pedir-remera")
    await page.waitForTimeout(1_500)

    const { ancho, scroll } = await page.evaluate(() => ({
      ancho: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(scroll).toBeLessThanOrEqual(ancho + 1)
  })
})
