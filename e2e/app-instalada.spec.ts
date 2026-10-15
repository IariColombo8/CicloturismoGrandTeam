import { test, expect } from "@playwright/test"

// La app instalada desde el navegador (PWA).
//
// El bug que originó estos tests: en la pantalla de arranque se veía el dibujo
// del logo pero no el nombre del evento. Los iconos del manifest salían de los
// favicon, que tienen las letras NEGRAS sobre fondo transparente, y el fondo
// de arranque es negro.

test.describe("App instalada", () => {
  test("el manifest dice el nombre del evento y de qué se trata", async ({ request }) => {
    const res = await request.get("/manifest.json")
    expect(res.status()).toBe(200)

    const manifest = await res.json()

    expect(manifest.name).toBe("Cicloturismo Ruinas del Viejo Molino")
    // Debajo del icono entran pocos caracteres.
    expect(manifest.short_name.length).toBeLessThanOrEqual(14)
    expect(manifest.description).toMatch(/50 km/i)
    expect(manifest.description).toMatch(/8 de noviembre/i)
    expect(manifest.description).toMatch(/25\.000/)

    expect(manifest.start_url).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.background_color).toBe("#000000")
  })

  test("los iconos existen y no son los de letras negras", async ({ request }) => {
    const res = await request.get("/manifest.json")
    const manifest = await res.json()

    expect(manifest.icons.length).toBeGreaterThanOrEqual(4)

    for (const icono of manifest.icons) {
      // Los favicon tienen las letras negras: no pueden volver al manifest.
      expect(icono.src, "el manifest volvió a usar un favicon").not.toMatch(/favicon/)

      const archivo = await request.get(icono.src)
      expect(archivo.status(), `${icono.src} no existe`).toBe(200)
      expect(archivo.headers()["content-type"]).toContain("image/png")
    }

    // Android recorta los "maskable": tiene que haber al menos uno, con el
    // logo encogido y fondo propio.
    const maskables = manifest.icons.filter((i: { purpose?: string }) => i.purpose?.includes("maskable"))
    expect(maskables.length, "sin icono maskable, Android recorta las letras").toBeGreaterThanOrEqual(1)

    // Y los tamaños que pide Android para instalar.
    const tamanos = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(tamanos).toContain("192x192")
    expect(tamanos).toContain("512x512")
  })

  test("tiene accesos directos a lo que la gente usa", async ({ request }) => {
    const manifest = await (await request.get("/manifest.json")).json()

    const urls = (manifest.shortcuts ?? []).map((s: { url: string }) => s.url)
    expect(urls).toContain("/inscripcion")
    expect(urls).toContain("/mi-qr")
    expect(urls).toContain("/pedir-remera")
  })

  test("el icono de iPhone tiene fondo propio", async ({ request }) => {
    // iOS no respeta la transparencia: pinta el fondo y se come las letras.
    const res = await request.get("/app/apple-touch-icon.png")
    expect(res.status()).toBe(200)
  })

  test("la página enlaza el manifest y el icono de iPhone", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.json/)
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /\/app\//)
  })
})
