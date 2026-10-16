import { test, expect, type Page } from "@playwright/test"
import { silenciarAvisoDeVersion } from "./helpers"

// Barrido de pantallas: ninguna página pública puede desbordarse para los
// costados ni esconder contenido fuera de la pantalla, desde un celular chico
// (320 px, iPhone SE) hasta una compu.
//
// El test no solo avisa que hay desborde: devuelve el elemento culpable con su
// clase, para poder arreglarlo sin adivinar.

const ANCHOS = [
  { nombre: "celular chico (320)", ancho: 320, alto: 640 },
  { nombre: "celular común (360)", ancho: 360, alto: 740 },
  { nombre: "celular grande (390)", ancho: 390, alto: 844 },
  { nombre: "tablet (768)", ancho: 768, alto: 1024 },
  { nombre: "compu (1280)", ancho: 1280, alto: 800 },
]

const RUTAS = ["/", "/inscripcion", "/pedir-remera", "/contacto", "/mi-qr", "/grand-team", "/sorteos", "/inscripcion/exito"]

/**
 * Elementos que se salen de la pantalla y de verdad molestan.
 *
 * No cuentan los que están recortados por un contenedor con overflow oculto
 * (carruseles, el brillo decorativo de los botones, la barra de progreso):
 * esos no se ven ni empujan la página.
 */
async function desbordes(page: Page) {
  return page.evaluate(() => {
    const ancho = window.innerWidth
    const culpables: { etiqueta: string; clase: string; derecha: number; izquierda: number; texto: string }[] = []

    /** ¿Algún ancestro lo recorta? */
    const estaRecortado = (el: HTMLElement) => {
      let padre = el.parentElement
      while (padre && padre !== document.body) {
        const s = getComputedStyle(padre)
        if (/hidden|clip|auto|scroll/.test(s.overflowX) || /hidden|clip|auto|scroll/.test(s.overflow)) {
          const caja = padre.getBoundingClientRect()
          const propia = el.getBoundingClientRect()
          // Se sale de su contenedor, que lo tapa: no se ve.
          if (propia.right > caja.right + 1 || propia.left < caja.left - 1) return true
        }
        padre = padre.parentElement
      }
      return false
    }

    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const estilo = getComputedStyle(el)
      if (estilo.display === "none" || estilo.visibility === "hidden") return
      if (estilo.position === "fixed" || estilo.position === "sticky") return
      if (Number(estilo.opacity) === 0) return
      if (el.getAttribute("aria-hidden") === "true") return
      // Lo que está oculto a propósito (menús cerrados) no cuenta.
      if (el.offsetParent === null && estilo.position !== "absolute") return

      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      if (r.right <= ancho + 1 && r.left >= -1) return
      if (estaRecortado(el)) return

      culpables.push({
        etiqueta: el.tagName.toLowerCase(),
        clase: (el.className || "").toString().slice(0, 120),
        derecha: Math.round(r.right),
        izquierda: Math.round(r.left),
        texto: (el.textContent || "").trim().slice(0, 40),
      })
    })

    return {
      ancho,
      scrollWidth: document.documentElement.scrollWidth,
      culpables: culpables.slice(0, 12),
    }
  })
}

for (const { nombre, ancho, alto } of ANCHOS) {
  test.describe(`Pantalla ${nombre}`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    for (const ruta of RUTAS) {
      test(`${ruta} entra en la pantalla`, async ({ page }) => {
        await silenciarAvisoDeVersion(page)
        await page.goto(ruta, { waitUntil: "domcontentloaded" })
        // Un rato para que carguen fuentes, imágenes y lo que se dibuja en el cliente.
        await page.waitForTimeout(1_500)

        const info = await desbordes(page)

        const detalle = info.culpables
          .map((c) => `  <${c.etiqueta} class="${c.clase}"> → derecha ${c.derecha}px (pantalla ${info.ancho}px) "${c.texto}"`)
          .join("\n")

        expect(
          info.culpables,
          `${ruta} a ${ancho}px tiene elementos fuera de la pantalla:\n${detalle}`,
        ).toEqual([])

        expect(
          info.scrollWidth,
          `${ruta} a ${ancho}px se puede arrastrar para los costados (scrollWidth ${info.scrollWidth})`,
        ).toBeLessThanOrEqual(info.ancho + 1)
      })
    }
  })
}
