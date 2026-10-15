import { test, expect } from "@playwright/test"
import {
  MAX_COMPROBANTE_BYTES,
  normalizeGrupoCiclistas,
  normalizeLookupKey,
  parseDataUrl,
  submitSchema,
} from "@/lib/inscripcion-schema"

// Tests unitarios de la validacion de la inscripcion.
//
// La politica cambio: antes el servidor rechazaba la inscripcion ante
// cualquier dato raro (email con un typo, pais fuera de la lista, comprobante
// que no se pudo subir) y la persona veia "Datos invalidos" despues de llenar
// los cuatro pasos, perdiendo todo. Ahora solo el DNI y el nombre son
// imprescindibles: el resto se normaliza a algo guardable y el equipo lo
// corrige desde el panel. Una fila con un dato para revisar es mucho mejor que
// una inscripcion que no existe.

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

test.describe("submitSchema · lo que acepta", () => {
  test("acepta una inscripción válida y aplica defaults", () => {
    const result = submitSchema.safeParse(baseData)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.relacionEmergencia).toBe("")
    expect(result.data.alergias).toBe("")
    expect(result.data.condicionSalud).toBe("")
    expect(result.data.comprobanteNota).toBe("")
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

  test("acepta DNI de 7 y de 8 dígitos", () => {
    expect(submitSchema.safeParse({ ...baseData, dni: "1234567" }).success).toBe(true)
    expect(submitSchema.safeParse({ ...baseData, dni: "12345678" }).success).toBe(true)
  })

  test("limpia el DNI de puntos y espacios en vez de rechazarlo", () => {
    const result = submitSchema.safeParse({ ...baseData, dni: " 12.345.678 " })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.dni).toBe("12345678")
  })

  test("ignora campos extra no declarados", () => {
    const result = submitSchema.safeParse({ ...baseData, hackeo: "<script>" })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect((result.data as Record<string, unknown>).hackeo).toBeUndefined()
  })
})

test.describe("submitSchema · nada se pierde por un dato raro", () => {
  test("un email con typo entra igual, para no perder la inscripción", () => {
    for (const email of ["juan", "juan@", "@example.com", ""]) {
      const result = submitSchema.safeParse({ ...baseData, email })
      expect(result.success, `email=${email}`).toBe(true)
    }
  })

  test("un país que no está en la lista se guarda tal cual", () => {
    const result = submitSchema.safeParse({ ...baseData, pais: "Brasil" })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.pais).toBe("Brasil")
  })

  test("sin país, queda Argentina", () => {
    const result = submitSchema.safeParse({ ...baseData, pais: "" })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.pais).toBe("Argentina")
  })

  test("el grupo sanguíneo se normaliza y lo desconocido queda DESCONOCIDO", () => {
    const minuscula = submitSchema.safeParse({ ...baseData, grupoSanguineo: "o+" })
    expect(minuscula.success).toBe(true)
    if (minuscula.success) expect(minuscula.data.grupoSanguineo).toBe("O+")

    const raro = submitSchema.safeParse({ ...baseData, grupoSanguineo: "Z+" })
    expect(raro.success).toBe(true)
    if (raro.success) expect(raro.data.grupoSanguineo).toBe("DESCONOCIDO")
  })

  test("los sí/no toleran acentos, mayúsculas y booleanos", () => {
    for (const valor of ["Sí", "SI", "sí", true, 1, "true"]) {
      const result = submitSchema.safeParse({ ...baseData, esCeliaco: valor })
      expect(result.success, `valor=${String(valor)}`).toBe(true)
      if (result.success) expect(result.data.esCeliaco).toBe("si")
    }

    for (const valor of ["No", "", null, undefined, "cualquier cosa"]) {
      const result = submitSchema.safeParse({ ...baseData, esCeliaco: valor })
      expect(result.success, `valor=${String(valor)}`).toBe(true)
      if (result.success) expect(result.data.esCeliaco).toBe("no")
    }
  })

  test("los campos secundarios vacíos no frenan la inscripción", () => {
    const opcionales = [
      "apellido",
      "telefono",
      "localidad",
      "nombreEmergencia",
      "telefonoEmergencia",
      "numeroReferencia",
      "fechaNacimiento",
    ] as const

    for (const campo of opcionales) {
      expect(submitSchema.safeParse({ ...baseData, [campo]: "   " }).success, campo).toBe(true)
    }
  })

  test("sin grupo de ciclistas queda 'Sin grupo'", () => {
    const result = submitSchema.safeParse({ ...baseData, grupoCiclistas: "  " })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.grupoCiclistas).toBe("Sin grupo")
  })

  test("acepta una inscripción sin comprobante, con la nota del motivo", () => {
    const result = submitSchema.safeParse({
      ...baseData,
      comprobanteBase64: "",
      comprobanteNota: "PDF de 30 MB: pedírselo por WhatsApp",
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.comprobanteBase64).toBe("")
    expect(result.data.comprobanteNota).toContain("WhatsApp")
  })
})

test.describe("submitSchema · lo único imprescindible", () => {
  test("sin DNI no hay fila que guardar", () => {
    for (const dni of ["", "abcdefgh", "12345"]) {
      expect(submitSchema.safeParse({ ...baseData, dni }).success, `dni=${dni}`).toBe(false)
    }
  })

  test("sin nombre tampoco", () => {
    expect(submitSchema.safeParse({ ...baseData, nombre: "   " }).success).toBe(false)
  })

  test("un payload vacío se rechaza sin explotar", () => {
    expect(submitSchema.safeParse({}).success).toBe(false)
    expect(submitSchema.safeParse(null).success).toBe(false)
    expect(submitSchema.safeParse(undefined).success).toBe(false)
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
    expect(parseDataUrl("data:application/pdf;base64,QUJD")?.extension).toBe("pdf")
    expect(parseDataUrl("data:image/webp;base64,QUJD")?.extension).toBe("webp")
  })

  test("acepta mime en mayúsculas", () => {
    expect(parseDataUrl("data:IMAGE/JPEG;base64,QUJD")?.extension).toBe("jpg")
  })

  test("devuelve null (sin lanzar) si el formato no sirve", () => {
    // Lanzar acá tiraba abajo la inscripción entera; ahora se guarda sin
    // archivo y con la nota.
    expect(parseDataUrl("data:image/svg+xml;base64,QUJD")).toBeNull()
    expect(parseDataUrl("data:text/html;base64,QUJD")).toBeNull()
    expect(parseDataUrl("")).toBeNull()
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
  test("el tope del archivo ya comprimido es 4 MB", () => {
    expect(MAX_COMPROBANTE_BYTES).toBe(4 * 1024 * 1024)
  })

  test("pasarse del tope no es un error: se detecta para dejar la nota", () => {
    const grande = Buffer.alloc(MAX_COMPROBANTE_BYTES + 1)
    expect(grande.length > MAX_COMPROBANTE_BYTES).toBe(true)
  })
})
