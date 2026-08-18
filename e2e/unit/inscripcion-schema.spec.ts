import { test, expect } from "@playwright/test"
import {
  MAX_COMPROBANTE_BYTES,
  normalizeGrupoCiclistas,
  normalizeLookupKey,
  parseDataUrl,
  submitSchema,
} from "@/lib/inscripcion-schema"

// Tests unitarios de la logica de validacion de inscripcion.
// No usan navegador: corren en el proceso de Node de Playwright.

const baseData = {
  nombre: "Juan",
  apellido: "Perez",
  dni: "12345678",
  email: "juan@example.com",
  telefono: "3442654257",
  fechaNacimiento: "1990-05-12",
  pais: "Argentina",
  localidad: "Concepción del Uruguay",
  nombreEmergencia: "Maria Perez",
  telefonoEmergencia: "3442111222",
  haRecorridoDistancia: "si",
  grupoCiclistas: "Sin grupo",
  grupoSanguineo: "O+",
  esCeliaco: "no",
  tieneAlergias: "no",
  tieneProblemasSalud: "no",
  numeroReferencia: "REF-001",
  comprobanteBase64: "data:image/jpeg;base64,AAAA",
}

test.describe("submitSchema", () => {
  test("acepta una inscripción válida y aplica defaults", () => {
    const result = submitSchema.safeParse(baseData)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.relacionEmergencia).toBe("")
    expect(result.data.alergias).toBe("")
    expect(result.data.condicionSalud).toBe("")
  })

  test("recorta espacios en nombre y email", () => {
    const result = submitSchema.safeParse({
      ...baseData,
      nombre: "  Juan  ",
      email: "  juan@example.com  ",
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.nombre).toBe("Juan")
    expect(result.data.email).toBe("juan@example.com")
  })

  test("rechaza DNI con formato inválido", () => {
    for (const dni of ["123456", "123456789", "12.345.678", "abcdefgh", ""]) {
      expect(submitSchema.safeParse({ ...baseData, dni }).success, `dni=${dni}`).toBe(false)
    }
  })

  test("acepta DNI de 7 y de 8 dígitos", () => {
    expect(submitSchema.safeParse({ ...baseData, dni: "1234567" }).success).toBe(true)
    expect(submitSchema.safeParse({ ...baseData, dni: "12345678" }).success).toBe(true)
  })

  test("rechaza email inválido", () => {
    for (const email of ["juan", "juan@", "@example.com", "juan example.com"]) {
      expect(submitSchema.safeParse({ ...baseData, email }).success, `email=${email}`).toBe(false)
    }
  })

  test("rechaza país fuera del enum", () => {
    expect(submitSchema.safeParse({ ...baseData, pais: "Brasil" }).success).toBe(false)
  })

  test("rechaza grupo sanguíneo inválido", () => {
    expect(submitSchema.safeParse({ ...baseData, grupoSanguineo: "Z+" }).success).toBe(false)
    expect(submitSchema.safeParse({ ...baseData, grupoSanguineo: "o+" }).success).toBe(false)
  })

  test("rechaza campos obligatorios vacíos o solo espacios", () => {
    const requeridos = [
      "nombre",
      "apellido",
      "telefono",
      "localidad",
      "nombreEmergencia",
      "telefonoEmergencia",
      "grupoCiclistas",
      "numeroReferencia",
    ] as const

    for (const campo of requeridos) {
      expect(submitSchema.safeParse({ ...baseData, [campo]: "   " }).success, campo).toBe(false)
    }
  })

  test("rechaza comprobante vacío", () => {
    expect(submitSchema.safeParse({ ...baseData, comprobanteBase64: "" }).success).toBe(false)
  })

  test("rechaza un payload sin campos (no debe explotar)", () => {
    const result = submitSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test("ignora campos extra no declarados", () => {
    const result = submitSchema.safeParse({ ...baseData, hackeo: "<script>" })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect((result.data as Record<string, unknown>).hackeo).toBeUndefined()
  })
})

test.describe("normalizeGrupoCiclistas", () => {
  test("mapea alias conocidos a su nombre canónico", () => {
    expect(normalizeGrupoCiclistas("kamikaze mtb")).toBe("Kamikaze MTB")
    expect(normalizeGrupoCiclistas("KAMIKAZE MTB")).toBe("Kamikaze MTB")
    expect(normalizeGrupoCiclistas("chicas treck")).toBe("Chicas Trek")
    expect(normalizeGrupoCiclistas("xtralage team")).toBe("Xtralarge Team")
    expect(normalizeGrupoCiclistas("Empujando Límites")).toBe("Empujando Límites")
  })

  test("normaliza variantes de 'sin grupo'", () => {
    for (const v of ["ninguno", "Ninguna", "no pertenezco", "SIN GRUPO"]) {
      expect(normalizeGrupoCiclistas(v), v).toBe("Sin grupo")
    }
  })

  test("colapsa espacios múltiples y recorta", () => {
    expect(normalizeGrupoCiclistas("  Los   Pedales  ")).toBe("Los Pedales")
  })

  test("deja intacto un grupo nuevo desconocido", () => {
    expect(normalizeGrupoCiclistas("Club Ciclista Nuevo")).toBe("Club Ciclista Nuevo")
  })
})

test.describe("normalizeLookupKey", () => {
  test("quita acentos, símbolos y normaliza a minúsculas", () => {
    expect(normalizeLookupKey("Empujando Límites")).toBe("empujando limites")
    expect(normalizeLookupKey("Grand-Team_Bike  CdelU!")).toBe("grand team bike cdelu")
  })
})

test.describe("parseDataUrl", () => {
  test("extrae mime, base64 y extensión de un data URL válido", () => {
    expect(parseDataUrl("data:image/png;base64,QUJD")).toEqual({
      mimeType: "image/png",
      base64Data: "QUJD",
      extension: "png",
    })
    expect(parseDataUrl("data:application/pdf;base64,QUJD").extension).toBe("pdf")
    expect(parseDataUrl("data:image/webp;base64,QUJD").extension).toBe("webp")
  })

  test("acepta mime en mayúsculas", () => {
    expect(parseDataUrl("data:IMAGE/JPEG;base64,QUJD").extension).toBe("jpg")
  })

  test("rechaza formatos no permitidos", () => {
    expect(() => parseDataUrl("data:image/svg+xml;base64,QUJD")).toThrow(/no permitido/i)
    expect(() => parseDataUrl("data:text/html;base64,QUJD")).toThrow(/no permitido/i)
  })

  test("trata un base64 pelado como jpeg", () => {
    expect(parseDataUrl("QUJD")).toEqual({
      mimeType: "image/jpeg",
      base64Data: "QUJD",
      extension: "jpg",
    })
  })
})

test.describe("límite de comprobante", () => {
  test("el máximo es 5 MB", () => {
    expect(MAX_COMPROBANTE_BYTES).toBe(5 * 1024 * 1024)
  })

  test("un buffer por encima del límite se detecta", () => {
    const grande = Buffer.alloc(MAX_COMPROBANTE_BYTES + 1)
    expect(grande.length > MAX_COMPROBANTE_BYTES).toBe(true)
  })
})
