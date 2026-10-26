import { test, expect } from "@playwright/test"
import { silenciarAvisoDeVersion } from "./helpers"

// La lista de roles del dia del evento se mira y se carga desde el celular, y
// el link no esta en el menu: se llega por el link directo.
//
// Estos tests no escriben nada en la base: prueban lo que se ve y la validacion
// del formulario, no el alta (eso lo cubre e2e/unit/roles.spec.ts del lado de
// la logica).

const CELULAR = { width: 360, height: 740 }

test.describe("Lista de roles", () => {
  test("se puede abrir por el link aunque no este en el menu", async ({ page }) => {
    await silenciarAvisoDeVersion(page)
    await page.goto("/roles")

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/quién hace qué/i)

    // El menú de la landing no la ofrece: es una lista interna que circula por link.
    const menu = page.locator("nav").first()
    await expect(menu.locator('a[href="/roles"]')).toHaveCount(0)
  })

  test("en el celular se abre el formulario sin desbordar la pantalla", async ({ page }) => {
    await page.setViewportSize(CELULAR)
    await silenciarAvisoDeVersion(page)
    await page.goto("/roles")

    await page.getByRole("button", { name: /sumarme a la lista/i }).click()

    // Las tres respuestas de "qué hacés el día del evento" tienen que estar
    // todas a la vista: son la pregunta principal del formulario. El nombre
    // accesible de cada botón es la etiqueta más su línea de ayuda, así que se
    // busca por el comienzo.
    await expect(page.getByRole("button", { name: /^Pedaleo Hago el recorrido/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Pedaleo y ayudo/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Ayudo y no pedaleo/i })).toBeVisible()
    // "No pedaleo, acompaño" se saco a pedido (25/10/2026).
    await expect(page.getByRole("button", { name: /^No pedaleo, acompaño/i })).toHaveCount(0)

    // Y el contenido no se sale para los costados con el modal abierto.
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(desborde, "el formulario desborda a lo ancho").toBeLessThanOrEqual(1)
  })

  test("sin nombre no se guarda nada y se avisa", async ({ page }) => {
    await page.setViewportSize(CELULAR)
    await silenciarAvisoDeVersion(page)
    await page.goto("/roles")

    await page.getByRole("button", { name: /sumarme a la lista/i }).click()
    await page.getByRole("button", { name: /^Sumarme$/ }).click()

    // El aviso sale dos veces (el cartel y la región que leen los lectores de
    // pantalla): alcanza con que se vea el primero.
    await expect(page.getByText(/escribí tu nombre/i).first()).toBeVisible()
    // El modal sigue abierto: no se pierde lo que la persona venía cargando.
    await expect(page.getByRole("button", { name: /^Sumarme$/ })).toBeVisible()
  })

  test("elegir una tarea la deja marcada", async ({ page }) => {
    await page.setViewportSize(CELULAR)
    await silenciarAvisoDeVersion(page)
    await page.goto("/roles")

    await page.getByRole("button", { name: /sumarme a la lista/i }).click()
    const tarea = page.getByRole("button", { name: "Acreditación" })
    await tarea.click()
    await expect(tarea).toHaveAttribute("aria-pressed", "true")
    await tarea.click()
    await expect(tarea).toHaveAttribute("aria-pressed", "false")
  })
})
