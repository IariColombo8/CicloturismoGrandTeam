import { expect, type Page } from "@playwright/test"

/**
 * Abre el formulario y espera a que React tenga el control.
 *
 * Sin esto los tests son inestables: Playwright escribe en los campos antes de
 * la hidratación, el texto aparece en pantalla pero el formulario no se enteró
 * de nada. La señal es que el campo de DNI descarta lo que no sea número, algo
 * que solo pasa cuando el JavaScript ya está andando.
 */
export async function abrirInscripcion(page: Page) {
  await page.goto("/inscripcion")
  await expect(page.getByRole("heading", { name: "Información Personal" })).toBeVisible()

  await expect(async () => {
    await page.fill("#dni", "a7")
    await expect(page.locator("#dni")).toHaveValue("7", { timeout: 1_000 })
  }).toPass({ timeout: 30_000 })

  await page.fill("#dni", "")
}

/**
 * Carga la fecha de nacimiento en los tres campos (día / mes / año).
 *
 * Reemplazó al `<input type="date">`, que en el celular dependía del selector
 * nativo y en varios navegadores no dejaba cargar nada.
 */
export async function cargarFechaNacimiento(page: Page, iso: string, id = "fechaNacimiento") {
  const [anio, mes, dia] = iso.split("-")
  await page.fill(`#${id}-dia`, String(Number(dia)))
  await page.selectOption(`#${id}-mes`, mes)
  await page.fill(`#${id}-anio`, anio)
  // El resto del formulario lee el valor del campo oculto.
  await expect(page.locator(`#${id}`)).toHaveValue(iso)
}

/** PNG de 1x1: sirve de comprobante en los tests. */
export const PNG_MINIMO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
)

/** Comprobante de prueba, del peso que se quiera (para probar los grandes). */
export function comprobanteDePrueba(nombre = "comprobante.png", bytes = 0) {
  return {
    name: nombre,
    mimeType: nombre.endsWith(".pdf") ? "application/pdf" : "image/png",
    buffer: bytes > 0 ? Buffer.concat([PNG_MINIMO, Buffer.alloc(bytes)]) : PNG_MINIMO,
  }
}
