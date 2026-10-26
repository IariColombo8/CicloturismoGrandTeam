import { test, expect } from "@playwright/test"
import { agruparTextos, claveTexto, nombrePropio } from "@/lib/agruparTexto"

test.describe("localidades escritas de mil formas", () => {
  const variantes = [
    "concepcion del uruguay",
    "Concepcion del uruguay",
    "Concepcion Del Uruguay",
    "CONCEPCION DEL URUGUAY",
    "CONCEPCIÓN DEL URUGUAY",
    "  Concepción  del Uruguay ",
  ]

  test("mayusculas, acentos y espacios de mas son la misma ciudad", () => {
    const claves = new Set(variantes.map(claveTexto))
    expect(claves.size).toBe(1)
  })

  test("se agrupan en una sola, con todas las variantes para filtrar", () => {
    const grupos = agruparTextos([...variantes, "Concordia", "CONCORDIA", null, "", "   "])

    expect(grupos).toHaveLength(2)
    const cdu = grupos.find((g) => g.clave === "concepcion del uruguay")!
    expect(cdu.cantidad).toBe(6)
    expect(cdu.variantes).toHaveLength(6)
    // Se muestra la variante con acento, bien escrita.
    expect(cdu.etiqueta).toBe("Concepción del Uruguay")
    expect(grupos.find((g) => g.clave === "concordia")!.etiqueta).toBe("Concordia")
  })

  test("las variantes quedan tal cual estan en la base", () => {
    const [grupo] = agruparTextos(["CONCEPCIÓN DEL URUGUAY", "  Concepción  del Uruguay "])
    expect(grupo.variantes).toEqual(["CONCEPCIÓN DEL URUGUAY", "  Concepción  del Uruguay "])
  })

  test("los nombres se muestran como nombre propio", () => {
    expect(nombrePropio("CONCEPCIÓN DEL URUGUAY")).toBe("Concepción del Uruguay")
    expect(nombrePropio("de la paz")).toBe("De la Paz")
    expect(nombrePropio("paysandú")).toBe("Paysandú")
  })

  test("ciudades distintas no se mezclan", () => {
    expect(agruparTextos(["Colón", "Colonia", "Concordia"])).toHaveLength(3)
  })
})
