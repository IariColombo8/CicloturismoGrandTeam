import { test, expect } from "@playwright/test"

// Smoke tests: verifican que las páginas públicas clave cargan y renderizan
// sus elementos principales. No dependen de datos de Supabase ni de auth, así
// que corren en cualquier entorno con el dev server levantado.

test.describe("Landing pública", () => {
  test("la home carga con el título del evento", async ({ page }) => {
    await page.goto("/")
    // El H1 del Hero contiene el nombre del cicloturismo.
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/CICLOTURISMO/i)
  })

  test("el navbar muestra el CTA de inscripción", async ({ page }) => {
    await page.goto("/")
    // En desktop el navbar tiene el botón "Inscribirse".
    await expect(page.getByRole("link", { name: /inscribirse/i }).first()).toBeVisible()
  })

  test("navegar a inscripción desde el Hero", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /inscríbete ahora/i }).first().click()
    await expect(page).toHaveURL(/\/inscripcion/)
  })
})

test.describe("Formulario de inscripción", () => {
  test("renderiza el encabezado y los pasos", async ({ page }) => {
    await page.goto("/inscripcion")
    await expect(page.getByRole("heading", { name: /formulario de/i })).toBeVisible()
    // Paso 1 visible por defecto.
    await expect(page.getByText(/información personal/i).first()).toBeVisible()
  })

  test("bloquea avanzar con campos vacíos", async ({ page }) => {
    await page.goto("/inscripcion")
    await page.getByRole("button", { name: /siguiente/i }).click()
    // Debe seguir en el paso 1 (no navega) y mostrar feedback de campos.
    await expect(page.getByText(/información personal/i).first()).toBeVisible()
  })
})

test.describe("Pedir remera", () => {
  test("la página pública de remera carga", async ({ page }) => {
    await page.goto("/pedir-remera")
    await expect(page.locator("body")).toBeVisible()
    // Hay un control para iniciar el pedido.
    await expect(page.getByRole("button", { name: /remera/i }).first()).toBeVisible()
  })
})
