import { expect, type Page } from "@playwright/test"

/**
 * Abre el formulario y espera a que React tenga el control.
 *
 * Sin esto los tests son inestables: Playwright escribe en los campos antes de
 * la hidratación, el texto aparece en pantalla pero el formulario no se enteró
 * de nada. La señal es que el campo de DNI descarta lo que no sea número, algo
 * que solo pasa cuando el JavaScript ya está andando.
 */
/**
 * Calla el aviso de "hicimos actualizaciones" en los tests que no lo prueban.
 *
 * Es un cartel legítimo, pero si aparece a mitad de un test tapa media
 * pantalla. Sin respuesta de /api/version, el aviso no se muestra (es lo que
 * pasa cuando no hay internet). Tiene su propio spec en offline.spec.ts.
 */
export async function silenciarAvisoDeVersion(page: Page) {
  await page.route("**/api/version", (route) => route.fulfill({ status: 503, body: "" }))
}

/**
 * Cierra solo la ventana "Antes de inscribirte" (lluvia, acompañantes,
 * medallas) cada vez que aparece, tambien despues de un reload.
 *
 * Se abre siempre al entrar a /inscripcion y tapa el formulario: los tests que
 * no la prueban la dan por leida. La prueba propia esta en inscripcion.spec.ts.
 */
export async function cerrarAvisosDelEvento(page: Page) {
  const aviso = page.getByRole("dialog", { name: "Antes de inscribirte" })
  await page.addLocatorHandler(aviso, async () => {
    await aviso.getByRole("button", { name: "Entendido" }).click()
  })
}

export async function abrirInscripcion(page: Page) {
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
