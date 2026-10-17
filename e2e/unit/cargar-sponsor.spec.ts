import { test, expect } from "@playwright/test"
import { explicarError } from "@/lib/errores"
import { limpiarSlug } from "@/lib/api/subirImagen"
import { prepararImagen } from "@/lib/imagenes/prepararImagen"

// Cargar un sponsor fallaba con un cartel vacio ("Error al guardar: ") porque
// el error de la base venia sin message. Estas son las dos reglas que lo
// arreglan: el error SIEMPRE dice algo, y preparar la imagen NUNCA explota.

/** File falso, del peso que se quiera, sin crear un archivo real. */
function archivoFalso(nombre: string, tipo: string, bytes: number): File {
  return {
    name: nombre,
    type: tipo,
    size: bytes,
    lastModified: Date.now(),
  } as unknown as File
}

test.describe("explicarError", () => {
  test("nunca devuelve vacio, ni con un error sin mensaje", () => {
    expect(explicarError(null).length).toBeGreaterThan(0)
    expect(explicarError({}).length).toBeGreaterThan(0)
    expect(explicarError(undefined).length).toBeGreaterThan(0)
    expect(explicarError({ message: "" }).length).toBeGreaterThan(0)
  })

  test("un error de permisos explica que hacer, no solo que fallo", () => {
    const texto = explicarError({
      code: "42501",
      message: 'new row violates row-level security policy for table "sponsors"',
    })
    expect(texto).toMatch(/permiso/i)
    expect(texto).toMatch(/volv[eé] a entrar/i)
  })

  test("una columna que no existe se nombra como falta de migracion", () => {
    const texto = explicarError({
      code: "PGRST204",
      message: "Could not find the 'categoria' column of 'sponsors' in the schema cache",
    })
    expect(texto).toMatch(/migraci/i)
    expect(texto).toContain("categoria")
  })

  test("sin internet lo dice en criollo y recuerda el borrador", () => {
    const texto = explicarError(new Error("Failed to fetch"))
    expect(texto).toMatch(/conexi[oó]n/i)
    expect(texto).toMatch(/borrador/i)
  })

  test("un error con detalle lo muestra entero, no lo esconde", () => {
    const texto = explicarError({
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (nombre)=(Diesel Nando) already exists.",
    })
    expect(texto).toMatch(/duplicad/i)
    expect(texto).toContain("Diesel Nando")
    expect(texto).toContain("23505")
  })

  test("un objeto raro igual deja ver algo", () => {
    const texto = explicarError({ loQueSea: 1 })
    expect(texto).toContain("loQueSea")
  })
})

test.describe("limpiarSlug", () => {
  test("acentos y simbolos no rompen el nombre del archivo", () => {
    expect(limpiarSlug("Panadería Ñandú & Cía.", "sponsor")).toBe("panaderia-nandu-cia")
  })

  test("un nombre vacio no deja el archivo sin nombre", () => {
    expect(limpiarSlug("", "sponsor")).toBe("sponsor")
    expect(limpiarSlug("///", "sponsor")).toBe("sponsor")
    expect(limpiarSlug(null, "premio")).toBe("premio")
  })

  test("un nombre larguisimo se recorta", () => {
    expect(limpiarSlug("a".repeat(200), "sponsor").length).toBeLessThanOrEqual(60)
  })
})

test.describe("prepararImagen", () => {
  // Corre en Node, sin canvas ni createImageBitmap: el peor escenario. Aun asi
  // tiene que devolver un archivo para subir, no lanzar.
  test("sin canvas en el entorno devuelve el original en vez de explotar", async () => {
    const file = archivoFalso("logo.png", "image/png", 7 * 1024 * 1024)
    const r = await prepararImagen(file)
    expect(r.archivo).toBe(file)
  })

  test("un logo chico pasa tal cual (no se le pone fondo blanco)", async () => {
    const file = archivoFalso("logo.png", "image/png", 40 * 1024)
    const r = await prepararImagen(file)
    expect(r.archivo).toBe(file)
    expect(r.comprimida).toBe(false)
  })

  test("un SVG no se toca: comprimirlo lo romperia", async () => {
    const file = archivoFalso("logo.svg", "image/svg+xml", 3 * 1024 * 1024)
    const r = await prepararImagen(file)
    expect(r.archivo).toBe(file)
    expect(r.comprimida).toBe(false)
  })

  test("una foto enorme que no se pudo reducir avisa, pero igual se sube", async () => {
    const file = archivoFalso("foto.heic", "image/heic", 12 * 1024 * 1024)
    const r = await prepararImagen(file)
    expect(r.archivo).toBe(file)
    expect(r.aviso).toMatch(/12\.0 MB/)
  })
})
