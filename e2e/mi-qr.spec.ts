import { test, expect, type Page } from "@playwright/test"

// E2E de /mi-qr. Se interceptan las respuestas de la API para no depender
// de datos reales en Supabase.

const TOKEN = "f23633d2-13e9-413e-8a26-749e26cf6330"

async function stub(page: Page, body: unknown) {
  await page.route("**/api/mi-inscripcion**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  )
}

const confirmada = {
  encontrada: true,
  inscripcion: {
    nombre: "Marisa Roxana",
    apellido: "Campodonico",
    estado: "confirmada",
    numeroInscripcion: 1,
    tokenQR: TOKEN,
  },
  remera: {
    items: [{ talle: "M", genero: "hombre", cantidad: 1 }],
    envioTipo: "retiro",
    estado: "pendiente",
    entregado: false,
    ciudad: null,
  },
}

test.describe("Mi QR · acceso", () => {
  test("el navbar lleva a la página", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /^mi qr$/i }).first().click()
    await expect(page).toHaveURL(/\/mi-qr/)
  })

  test("pide el DNI antes de mostrar nada", async ({ page }) => {
    await page.goto("/mi-qr")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("#dni")).toBeVisible()
    await expect(page.getByText(/inscripción confirmada/i)).toHaveCount(0)
  })

  test("el DNI sólo acepta dígitos y corta en 8", async ({ page }) => {
    await page.goto("/mi-qr")
    await page.fill("#dni", "12.345.678abc90")
    await expect(page.locator("#dni")).toHaveValue("12345678")
  })

  test("avisa si el DNI está incompleto", async ({ page }) => {
    await page.goto("/mi-qr")
    await page.fill("#dni", "123")
    await page.getByRole("button", { name: /ver mi inscripción/i }).click()
    // `p[role=alert]` para no chocar con el route announcer de Next.
    await expect(page.locator("p[role=alert]")).toContainText(/7 u 8 dígitos/i)
  })
})

test.describe("Mi QR · confirmada", () => {
  test.beforeEach(async ({ page }) => {
    await stub(page, confirmada)
    await page.goto("/mi-qr")
    await page.fill("#dni", "22819640")
    await page.getByRole("button", { name: /ver mi inscripción/i }).click()
  })

  test("muestra el estado, el número y el QR", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /inscripción confirmada/i })).toBeVisible()
    await expect(page.getByText("#001")).toBeVisible()
    await expect(page.getByText(/Marisa Roxana Campodonico/).first()).toBeVisible()
    // El QR se renderiza como SVG.
    await expect(page.locator("svg").filter({ has: page.locator("path") }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /descargar qr/i })).toBeVisible()
  })

  test("muestra el detalle de la remera", async ({ page }) => {
    await expect(page.getByText(/confirmamos tu pedido de 1 remera/i)).toBeVisible()
    await expect(page.getByText("1 x M (hombre)")).toBeVisible()
    await expect(page.getByText("Retiro en el evento")).toBeVisible()
    // Si se retira en el evento no se muestra el estado de entrega.
    await expect(page.getByText(/pendiente de entrega/i)).toHaveCount(0)
  })

  test("ofrece el grupo de WhatsApp", async ({ page }) => {
    await expect(page.getByRole("link", { name: /unirme al grupo/i })).toBeVisible()
  })
})

test.describe("Mi QR · pendiente", () => {
  test("no muestra el QR mientras está pendiente", async ({ page }) => {
    await stub(page, {
      encontrada: true,
      inscripcion: {
        nombre: "Iara",
        apellido: "Colombo",
        estado: "pendiente",
        numeroInscripcion: null,
        tokenQR: null,
      },
      remera: null,
    })
    await page.goto("/mi-qr")
    await page.fill("#dni", "44196057")
    await page.getByRole("button", { name: /ver mi inscripción/i }).click()

    await expect(page.getByRole("heading", { name: /inscripción pendiente/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /descargar qr/i })).toHaveCount(0)
    // Sin número asignado todavía.
    await expect(page.getByText(/^#\d{3}$/)).toHaveCount(0)
  })

  test("sin remera pedida ofrece el botón para pedirla", async ({ page }) => {
    await stub(page, {
      encontrada: true,
      inscripcion: {
        nombre: "Iara",
        apellido: "Colombo",
        estado: "pendiente",
        numeroInscripcion: null,
        tokenQR: null,
      },
      remera: null,
    })
    await page.goto("/mi-qr")
    await page.fill("#dni", "44196057")
    await page.getByRole("button", { name: /ver mi inscripción/i }).click()

    await expect(page.getByRole("link", { name: /pedir mi remera/i })).toBeVisible()
  })
})

test.describe("Mi QR · no encontrada", () => {
  test("explica que no hay inscripción y ofrece inscribirse", async ({ page }) => {
    await stub(page, { encontrada: false })
    await page.goto("/mi-qr")
    await page.fill("#dni", "99999999")
    await page.getByRole("button", { name: /ver mi inscripción/i }).click()

    await expect(page.getByRole("heading", { name: /no encontramos tu inscripción/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /^inscribirme$/i }).last()).toBeVisible()
    await expect(page.getByRole("button", { name: /descargar qr/i })).toHaveCount(0)
  })
})
