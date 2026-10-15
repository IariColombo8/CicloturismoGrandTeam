import { test, expect } from "@playwright/test"
import { prepararComprobante } from "@/lib/inscripcion/comprobante"

// prepararComprobante tiene una sola regla: nunca lanza y nunca deja a la
// persona sin inscripcion. Estos tests corren en Node (sin canvas ni
// FileReader), que es el peor escenario posible: aun asi tiene que contestar
// con el motivo en vez de explotar.

/** File falso, del peso que se quiera, sin tener que crear un archivo real. */
function archivoFalso(nombre: string, tipo: string, bytes: number): File {
  return {
    name: nombre,
    type: tipo,
    size: bytes,
    lastModified: Date.now(),
  } as unknown as File
}

test.describe("prepararComprobante", () => {
  test("sin archivo avisa que no adjuntó comprobante", async () => {
    const r = await prepararComprobante(null)
    expect(r.base64).toBe("")
    expect(r.motivo).toMatch(/no adjunt/i)
  })

  test("un PDF enorme no se intenta subir, pero deja el motivo con el peso", async () => {
    const r = await prepararComprobante(archivoFalso("comprobante.pdf", "application/pdf", 30 * 1024 * 1024))
    expect(r.base64).toBe("")
    expect(r.motivo).toMatch(/30\.0 MB/)
    expect(r.motivo).toMatch(/WhatsApp/i)
    expect(r.nombreArchivo).toBe("comprobante.pdf")
    expect(r.pesoOriginal).toBe(30 * 1024 * 1024)
  })

  test("un formato que no sirve tampoco frena nada", async () => {
    const r = await prepararComprobante(archivoFalso("pago.docx", "application/msword", 1024))
    expect(r.base64).toBe("")
    expect(r.motivo).toMatch(/formato/i)
  })

  test("una foto gigante nunca lanza, pase lo que pase con el canvas", async () => {
    // En Node no hay canvas: tiene que contestar con el motivo, no romperse.
    const r = await prepararComprobante(archivoFalso("foto.jpg", "image/jpeg", 25 * 1024 * 1024))
    expect(r.base64).toBe("")
    expect(r.motivo).toBeTruthy()
  })

  test("reconoce las imágenes por la extensión cuando el tipo viene vacío", async () => {
    // Los celulares a veces entregan el archivo sin MIME.
    const r = await prepararComprobante(archivoFalso("IMG_0001.HEIC", "", 8 * 1024 * 1024))
    expect(r.motivo).toMatch(/imagen/i)
  })

  test("un archivo roto devuelve el motivo en vez de una excepción", async () => {
    const roto = { name: "x.png", type: "image/png" } as unknown as File
    const r = await prepararComprobante(roto)
    expect(r).toBeTruthy()
    expect(r.base64).toBe("")
  })
})
