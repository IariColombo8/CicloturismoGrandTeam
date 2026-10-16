import { test, expect, type Page } from "@playwright/test"
import { silenciarAvisoDeVersion } from "./helpers"

// La pagina publica de los sorteos: la unica que ve la gente.
//
// Los datos salen de Supabase, asi que se interceptan las llamadas REST: el
// test tiene que poder decir "este premio es el mejor" y mirar como queda la
// pagina, sin depender de lo que haya cargado el panel en la base real.

const SORTEO = {
  id: "s1",
  nombre: "Sorteo de premios",
  descripcion: "Entre todos los inscriptos presentes",
  total_sorteos: 3,
  estado: "borrador",
  publico: true,
  orden: 0,
}

type PremioParcial = { id: string; nombre: string; orden?: number; nivel?: string | null }

function premio({ id, nombre, orden = 0, nivel = "otro" }: PremioParcial) {
  return {
    id,
    sorteo_id: "s1",
    nombre,
    descripcion: null,
    imagen_url: null,
    cantidad: 1,
    visible: true,
    orden,
    nivel,
  }
}

async function conDatos(
  page: Page,
  datos: { sorteos?: unknown[]; premios?: unknown[]; resultados?: unknown[] },
) {
  await silenciarAvisoDeVersion(page)
  await page.route(/\/rest\/v1\/sorteos\?/, (route) =>
    route.fulfill({ json: datos.sorteos ?? [SORTEO] }),
  )
  await page.route(/\/rest\/v1\/sorteo_premios\?/, (route) =>
    route.fulfill({ json: datos.premios ?? [] }),
  )
  await page.route(/\/rest\/v1\/sorteo_resultados\?/, (route) =>
    route.fulfill({ json: datos.resultados ?? [] }),
  )
}

test.describe("Página de sorteos", () => {
  test("el mejor premio va primero y el resto después", async ({ page }) => {
    await conDatos(page, {
      premios: [
        premio({ id: "p1", nombre: "Gorra", orden: 0 }),
        premio({ id: "p2", nombre: "Bicicleta", orden: 9, nivel: "principal" }),
        premio({ id: "p3", nombre: "Casco", orden: 5, nivel: "segundo" }),
      ],
    })
    await page.goto("/sorteos")

    // El titulo de cada bloque, en el orden en que se lee la pagina.
    const titulos = page.locator("h3")
    await expect(titulos.first()).toHaveText(/el mejor premio/i)
    await expect(titulos.nth(1)).toHaveText(/el segundo premio/i)
    await expect(titulos.nth(2)).toHaveText(/otro premio/i)

    // Y los tres premios se ven, aunque el mejor sea el ultimo en `orden`
    // (la jerarquia es de la web, el orden es del sorteo).
    await expect(page.getByText("Bicicleta")).toBeVisible()
    await expect(page.getByText("Casco")).toBeVisible()
    await expect(page.getByText("Gorra")).toBeVisible()
  })

  test("un premio sin jerarquía no desaparece de la página", async ({ page }) => {
    // Los premios cargados antes de que existiera la columna vienen sin nivel.
    await conDatos(page, { premios: [{ ...premio({ id: "p1", nombre: "Bidón" }), nivel: null }] })
    await page.goto("/sorteos")

    await expect(page.locator("h3").first()).toHaveText(/otro premio/i)
    await expect(page.getByText("Bidón")).toBeVisible()
  })

  test("sin sorteos publicados la página no queda vacía", async ({ page }) => {
    await conDatos(page, { sorteos: [] })
    await page.goto("/sorteos")

    await expect(page.getByText(/todavía no publicamos los sorteos/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /quiero inscribirme/i })).toBeVisible()
  })

  test("los ganadores que reclamaron se publican con su premio", async ({ page }) => {
    await conDatos(page, {
      premios: [premio({ id: "p1", nombre: "Bicicleta", nivel: "principal" })],
      resultados: [
        {
          id: "r1",
          sorteo_id: "s1",
          premio_id: "p1",
          premio_nombre: "Bicicleta",
          orden: 1,
          slot: 1,
          ronda: 1,
          vuelta: 0,
          participante_id: "u1",
          nombre: "Ana Pérez",
          localidad: "Concordia",
          grupo: null,
          estado: "reclamado",
          resuelto_en: null,
          created_at: new Date().toISOString(),
        },
      ],
    })
    await page.goto("/sorteos")

    await expect(page.getByText("Ana Pérez")).toBeVisible()
    await expect(page.getByText("Concordia")).toBeVisible()
    await expect(page.getByText(/felicitaciones a los ganadores/i)).toBeVisible()
  })

  test("la última fila de premios queda centrada cuando no se completa", async ({ page }) => {
    // 7 premios en filas de 4: los 3 últimos tienen que quedar en el medio, no
    // colgando a la izquierda.
    await conDatos(page, {
      premios: Array.from({ length: 7 }, (_, i) =>
        premio({ id: `p${i}`, nombre: `Premio ${i + 1}`, orden: i }),
      ),
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/sorteos")
    await expect(page.locator("[data-premio]")).toHaveCount(7)

    const centrada = await page.evaluate(() => {
      const tarjetas = [...document.querySelectorAll("[data-premio]")].map((el) =>
        el.getBoundingClientRect(),
      )
      const fila = Math.max(...tarjetas.map((c) => Math.round(c.top)))
      const ultimos = tarjetas.filter((c) => Math.round(c.top) === fila)
      const contenedor = document
        .querySelector("[data-premio]")!
        .parentElement!.getBoundingClientRect()
      const izquierda = ultimos[0].left - contenedor.left
      const derecha = contenedor.right - ultimos[ultimos.length - 1].right
      return { cuantos: ultimos.length, izquierda, derecha }
    })

    expect(centrada.cuantos).toBe(3)
    expect(Math.abs(centrada.izquierda - centrada.derecha)).toBeLessThan(2)
  })

  test("en un celular chico los premios no desbordan la pantalla", async ({ page }) => {
    await conDatos(page, {
      premios: [
        premio({ id: "p0", nombre: "Bicicleta", nivel: "principal" }),
        premio({ id: "p1", nombre: "Casco", nivel: "segundo", orden: 1 }),
        ...Array.from({ length: 5 }, (_, i) =>
          premio({ id: `o${i}`, nombre: `Premio ${i + 1}`, orden: i + 2 }),
        ),
      ],
    })
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto("/sorteos")
    await expect(page.locator("[data-premio]")).toHaveCount(5)

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(desborde).toBeLessThanOrEqual(1)
  })

  test("los sorteos ya no son una sección de la portada: el menú lleva a la página", async ({
    page,
  }) => {
    await silenciarAvisoDeVersion(page)
    await page.goto("/")

    // La seccion vieja (#sorteos) no existe mas: la pagina es el unico lugar.
    await expect(page.locator("#sorteos")).toHaveCount(0)

    await page.getByRole("button", { name: /detalles/i }).first().click()
    const link = page.getByRole("link", { name: "Sorteos" }).first()
    await expect(link).toHaveAttribute("href", "/sorteos")
  })
})
