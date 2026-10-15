import { test, expect } from "@playwright/test"
import { silenciarAvisoDeVersion } from "./helpers"

// Lo que se ve cuando alguien comparte un link del sitio por WhatsApp.
//
// Antes todas las páginas mostraban la misma imagen del evento: el link de
// "Mi QR" se veía igual que el de la inscripción y no se entendía cuál era
// cuál. Ahora cada una dice lo suyo y muestra su propia imagen.

const PAGINAS = [
  {
    ruta: "/mi-qr",
    titulo: /mi inscripción y mi qr/i,
    descripcion: /consultá el estado de tu inscripción/i,
    imagen: "/og/mi-qr.png",
  },
  {
    ruta: "/inscripcion",
    titulo: /inscripción/i,
    descripcion: /50 km el 8 de noviembre/i,
    imagen: "/og/inscripcion.png",
  },
  {
    ruta: "/pedir-remera",
    titulo: /pedir la remera/i,
    // Lo que más preguntan, dicho antes de entrar.
    descripcion: /solo con envío a domicilio y la entrega es después del evento/i,
    imagen: "/og/remera.png",
  },
  {
    ruta: "/contacto",
    titulo: /contacto/i,
    descripcion: /escribinos y te respondemos/i,
    imagen: "/og/contacto.png",
  },
  {
    ruta: "/grand-team",
    titulo: /grand team bike/i,
    descripcion: /el grupo que organiza/i,
    imagen: "/og/grand-team.png",
  },
]

test.describe("Vista previa al compartir", () => {
  for (const pagina of PAGINAS) {
    test(`${pagina.ruta} tiene su propio título, texto e imagen`, async ({ page, request }) => {
      await silenciarAvisoDeVersion(page)
      await page.goto(pagina.ruta)

      await expect(page).toHaveTitle(pagina.titulo)

      const descripcion = await page.locator('meta[name="description"]').getAttribute("content")
      expect(descripcion, `la descripción de ${pagina.ruta}`).toMatch(pagina.descripcion)

      const og = await page.locator('meta[property="og:description"]').getAttribute("content")
      expect(og, `el og:description de ${pagina.ruta}`).toMatch(pagina.descripcion)

      const imagen = await page.locator('meta[property="og:image"]').getAttribute("content")
      expect(imagen, `la imagen de ${pagina.ruta}`).toContain(pagina.imagen)

      // La imagen tiene que existir de verdad: una vista previa rota se ve peor
      // que no tener ninguna.
      const archivo = await request.get(pagina.imagen)
      expect(archivo.status(), `${pagina.imagen} no existe`).toBe(200)
      expect(archivo.headers()["content-type"]).toContain("image/png")
    })
  }

  test("cada página muestra una imagen distinta", async ({ page }) => {
    const vistas: string[] = []

    for (const pagina of PAGINAS) {
      await silenciarAvisoDeVersion(page)
      await page.goto(pagina.ruta)
      const imagen = await page.locator('meta[property="og:image"]').getAttribute("content")
      vistas.push(imagen ?? "")
    }

    expect(new Set(vistas).size, `hay páginas compartiendo la misma imagen:\n${vistas.join("\n")}`).toBe(
      PAGINAS.length,
    )
  })

  test("la home mantiene la pieza del evento", async ({ page }) => {
    await silenciarAvisoDeVersion(page)
    await page.goto("/")
    const imagen = await page.locator('meta[property="og:image"]').getAttribute("content")
    expect(imagen).toContain("METADATOS.png")
  })
})
