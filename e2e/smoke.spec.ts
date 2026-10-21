import { test, expect } from "@playwright/test"
import { silenciarAvisoDeVersion } from "./helpers"

// Smoke tests: verifican que las páginas públicas clave cargan y renderizan
// sus elementos principales. No dependen de datos de Supabase ni de auth, así
// que corren en cualquier entorno con el dev server levantado.

test.beforeEach(async ({ page }) => {
  // El aviso de "hicimos actualizaciones" tiene su propio spec; acá solo
  // molestaría.
  await silenciarAvisoDeVersion(page)
})

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
    // En desktop el navbar tiene el CTA "Inscribirme".
    await expect(page.getByRole("link", { name: /inscribirme/i }).first()).toBeVisible()
  })

  test("navegar a inscripción desde el Hero", async ({ page }) => {
    await page.goto("/")
    // El botón del hero: "Quiero inscribirme" (el del navbar dice "Inscribirme").
    await page.getByRole("link", { name: /quiero inscribirme/i }).first().click()
    await expect(page).toHaveURL(/\/inscripcion/)
  })

  test("el hero aclara que es cicloturismo y no una carrera", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText(/no es una carrera/i).first()).toBeVisible()
  })

  test("los bloques que aparecen al bajar terminan visibles", async ({ page }) => {
    // Red de seguridad del efecto de scroll: si el observador de
    // components/ui/Revelar.tsx dejara de funcionar, media home quedaría en
    // blanco (los bloques arrancan con opacity 0).
    await page.goto("/")
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 90))
      }
    })
    await page.waitForTimeout(1200)

    const sinRevelar = await page.locator(".gt-revelar:not(.gt-visible)").count()
    expect(sinRevelar).toBe(0)
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
