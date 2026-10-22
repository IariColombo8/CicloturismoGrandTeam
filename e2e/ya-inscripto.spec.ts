import { test, expect, devices, type Page } from "@playwright/test"
import { cerrarAvisosDelEvento, silenciarAvisoDeVersion } from "./helpers"

// Quien ya está inscripto en esta edición no tiene que volver a llenar el
// formulario: se le dice cómo está su inscripción y se lo lleva a /mi-qr.
//
// Dos motivos: el alta es un UPSERT por DNI (cargar de nuevo pisaría lo que el
// equipo ya revisó) y, además, sus datos no pueden quedar a la vista de
// cualquiera que escriba un DNI.

test.use({ ...devices["Pixel 5"] })
test.setTimeout(120_000)

const DNI = "31234567"

/** Respuesta del lookup para alguien ya inscripto. */
async function stubYaInscripto(page: Page, estado: string, nombre = "Marisa") {
  await page.route("**/api/lookup-participant**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ found: true, isEdicion: true, yaInscripto: true, estado, nombre, data: null }),
    }),
  )
}

/** Respuesta para alguien que participó antes pero no está inscripto ahora. */
async function stubDeOtraEdicion(page: Page) {
  await page.route("**/api/lookup-participant**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        found: true,
        isEdicion: false,
        yaInscripto: false,
        estado: null,
        nombre: "Juan",
        data: {
          nombre: "Juan",
          apellido: "Perez",
          email: "juan@example.com",
          telefono: "3442654257",
          fechaNacimiento: "1990-05-12",
          pais: "Argentina",
          localidad: "Concepción del Uruguay",
          nombreEmergencia: "Maria Perez",
          telefonoEmergencia: "3442111222",
          relacionEmergencia: "Esposa",
          haRecorridoDistancia: "si",
          grupoCiclistas: "Sin grupo",
          grupoSanguineo: "O+",
          esCeliaco: "no",
          tieneAlergias: "no",
          alergias: "",
          tieneProblemasSalud: "no",
          condicionSalud: "",
        },
      }),
    }),
  )
}

async function abrir(page: Page) {
  await silenciarAvisoDeVersion(page)
  await cerrarAvisosDelEvento(page)
  await page.goto("/inscripcion")
  await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
  await expect(async () => {
    await page.fill("#dni", "a7")
    await expect(page.locator("#dni")).toHaveValue("7", { timeout: 1_000 })
  }).toPass({ timeout: 30_000 })
  await page.fill("#dni", "")
}

test.describe("Si ya estás inscripto", () => {
  test("con la inscripción confirmada, lo dice y no muestra los datos", async ({ page }) => {
    await stubYaInscripto(page, "confirmada")
    await abrir(page)
    await page.fill("#dni", DNI)

    const modal = page.getByRole("dialog")
    await expect(modal).toBeVisible({ timeout: 20_000 })
    await expect(modal.getByText(/marisa, ya estás inscripto/i)).toBeVisible()
    await expect(modal.getByText(/tu inscripción está confirmada/i)).toBeVisible()

    // Nada de sus datos quedó cargado en el formulario.
    await expect(page.locator("#nombre")).toHaveValue("")
    await expect(page.locator("#email")).toHaveValue("")
    await expect(page.locator("#telefono")).toHaveValue("")
  })

  test("con la inscripción pendiente, avisa que la están revisando", async ({ page }) => {
    await stubYaInscripto(page, "pendiente")
    await abrir(page)
    await page.fill("#dni", DNI)

    const modal = page.getByRole("dialog")
    await expect(modal.getByText(/pendiente de aprobación/i)).toBeVisible({ timeout: 20_000 })
    await expect(modal.getByText(/el equipo está revisando tu pago/i)).toBeVisible()
  })

  test("el botón lleva a /mi-qr con el DNI puesto", async ({ page }) => {
    await stubYaInscripto(page, "confirmada")
    await page.route("**/api/mi-inscripcion**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encontrada: true,
          inscripcion: {
            nombre: "Marisa",
            apellido: "Campodonico",
            estado: "confirmada",
            numeroInscripcion: 7,
            tokenQR: "f23633d2-13e9-413e-8a26-749e26cf6330",
          },
          remera: null,
        }),
      }),
    )

    await abrir(page)
    await page.fill("#dni", DNI)

    const modal = page.getByRole("dialog")
    await expect(modal).toBeVisible({ timeout: 20_000 })
    await modal.getByRole("button", { name: /ver mi inscripción y mi qr/i }).click()

    await page.waitForURL(`**/mi-qr?dni=${DNI}`, { timeout: 30_000 })
    // Y busca sola: no hay que volver a escribir el DNI ni tocar "Buscar".
    await expect(page.getByText(/confirmada/i).first()).toBeVisible({ timeout: 30_000 })
  })

  test("sola, sin tocar nada, lleva igual a la inscripción", async ({ page }) => {
    await stubYaInscripto(page, "confirmada")
    await page.route("**/api/mi-inscripcion**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ encontrada: false }),
      }),
    )

    await abrir(page)
    await page.fill("#dni", DNI)
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 })

    // La cuenta regresiva la lleva sin que tenga que entender nada.
    await page.waitForURL("**/mi-qr**", { timeout: 40_000 })
  })

  test("se puede seguir para inscribir a otra persona", async ({ page }) => {
    await stubYaInscripto(page, "confirmada")
    await abrir(page)
    await page.fill("#dni", DNI)

    const modal = page.getByRole("dialog")
    await expect(modal).toBeVisible({ timeout: 20_000 })
    await modal.getByRole("button", { name: /inscribir a otra persona/i }).click()

    await expect(page.getByRole("dialog")).toHaveCount(0)
    // El DNI queda vacío y listo para escribir el de la otra persona.
    await expect(page.locator("#dni")).toHaveValue("")
    await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()
  })
})

test.describe("Si NO estás inscripto todavía", () => {
  test("los datos de una edición anterior se autocompletan", async ({ page }) => {
    await stubDeOtraEdicion(page)
    await abrir(page)
    await page.fill("#dni", DNI)

    // Sin modal: puede inscribirse.
    await expect(page.locator("#nombre")).toHaveValue("Juan", { timeout: 20_000 })
    await expect(page.locator("#email")).toHaveValue("juan@example.com")
    await expect(page.locator("#localidad")).toHaveValue("Concepción del Uruguay")
    await expect(page.locator("#fechaNacimiento")).toHaveValue("1990-05-12")
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })
})

test.describe("Página /mi-qr", () => {
  test("dice para qué sirve cuando se comparte el link", async ({ page }) => {
    await silenciarAvisoDeVersion(page)
    await page.goto("/mi-qr")

    await expect(page).toHaveTitle(/mi inscripción y mi qr/i)

    const descripcion = await page.locator('meta[name="description"]').getAttribute("content")
    expect(descripcion).toMatch(/consultá el estado de tu inscripción/i)
    expect(descripcion).toMatch(/descargá tu código qr/i)

    const og = await page.locator('meta[property="og:description"]').getAttribute("content")
    expect(og).toMatch(/estado de tu inscripción/i)
  })
})
