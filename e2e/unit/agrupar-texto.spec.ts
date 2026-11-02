import { test, expect } from "@playwright/test"
import { agruparParecidos, agruparTextos, claveTexto, nombrePropio } from "@/lib/agruparTexto"
import { resumirEdades } from "@/lib/edades"

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

// Datos reales del registro (noviembre 2026): cada linea de cada grupo tiene
// que terminar en UNA sola opcion del filtro.
test.describe("parecidos: errores de tipeo y agregados", () => {
  const etiquetasDe = (valores: string[], tipo: "ciudad" | "grupo") =>
    agruparParecidos(valores, tipo).map((g) => g.etiqueta)

  test("las 13 formas de Concepción del Uruguay son una", () => {
    const grupos = agruparParecidos(
      [
        "Concepcion del uruguay", "Concepcion del Uruguay", "Concepcion Del Uruguay",
        "CONCEPCION DEL URUGUAY", "Concepción del uruguay", "Concepción del Uruguay",
        "Concepción del Uruguay", "Concepción del URUGUAY", "Concepción del Uruguay (3260)",
        "Concepción del uruguayo", "Concepcion del UruguY", "CONCEPCION DEL.URUGUAY",
        "CONCEPCION DRL URUGUAY", "cdelu",
      ],
      "ciudad",
    )
    expect(grupos).toHaveLength(1)
    expect(grupos[0].etiqueta).toBe("Concepción del Uruguay")
    expect(grupos[0].cantidad).toBe(14)
    expect(grupos[0].variantes).toContain("cdelu")
  })

  test("provincia agregada y letras de mas o de menos", () => {
    expect(etiquetasDe(["Federación", "Federación", "Federacion", "Fedeeacion", "Federación Entre Rios"], "ciudad")).toEqual(["Federación"])
    expect(etiquetasDe(["Gualeguaychú", "gualeguaychu", "Gualeguychu"], "ciudad")).toEqual(["Gualeguaychú"])
    expect(etiquetasDe(["Chajari", "Chajari", "Chajari entre ríos"], "ciudad")).toEqual(["Chajari"])
    expect(etiquetasDe(["Coronda -Santa fe", "Coronda-Santa fe"], "ciudad")).toHaveLength(1)
  })

  test("ciudades distintas siguen separadas", () => {
    expect(agruparParecidos(["Colón", "Colon", "Colonia", "Concordia", "San José", "San Justo", "Buenos Aires"], "ciudad")).toHaveLength(6)
  })

  test("grupos escritos de varias formas", () => {
    expect(
      etiquetasDe(
        ["Grand Team Bike CdelU", "Grand Team Bike CdelU", "Grand Team Bike CdelU", "Grand Team bike", "Grand Team Bike", "Grand theam", "Grande Team"],
        "grupo",
      ),
    ).toEqual(["Grand Team Bike CdelU"])
    expect(etiquetasDe(["Ciclo Materos", "Ciclomateros", "Los ciclomateros"], "grupo")).toHaveLength(1)
    expect(etiquetasDe(["Bici Aventuras", "Bici Aventuras", "bici aventura"], "grupo")).toEqual(["Bici Aventuras"])
    expect(etiquetasDe(["Colon a Todo Pedal", "Colon a Todo Pedal", "Colón A Todos Pedal"], "grupo")).toHaveLength(1)
    expect(etiquetasDe(["Vuelteros Bikers Federación", "Vuerlteros Bikers Federación"], "grupo")).toHaveLength(1)
    expect(etiquetasDe(["La heroica bike", "La heroica bike", "La heroica montan bike"], "grupo")).toEqual(["La heroica bike"])
    expect(etiquetasDe(["Sansabat", "San sabtt"], "grupo")).toHaveLength(1)
  })

  test("'No' y 'Solo' en el grupo son Sin grupo", () => {
    expect(etiquetasDe(["Sin grupo", "Sin grupo", "No", "Solo"], "grupo")).toEqual(["Sin grupo"])
  })

  test("grupos distintos siguen separados", () => {
    expect(agruparParecidos(["Kamikaze MTB", "Kamikazetortuga", "Bici Chicas", "Bici Aventuras", "Los charrúas", "Vuelta Charrúa"], "grupo")).toHaveLength(6)
  })
})

test.describe("resumen de edades", () => {
  const hace = (anios: number) => `${new Date().getFullYear() - anios}-01-01`

  test("mas chico, mas grande, edad mas repetida y fechas dudosas", () => {
    const r = resumirEdades([
      { nombre: "Ana", fecha_nacimiento: hace(12) },
      { nombre: "Beto", fecha_nacimiento: hace(70) },
      { nombre: "Caro", fecha_nacimiento: hace(40) },
      { nombre: "Dani", fecha_nacimiento: hace(40) },
      { nombre: "Eli", fecha_nacimiento: `${new Date().getFullYear()}-01-01` }, // 0 años: dudosa
      { nombre: "Fede", fecha_nacimiento: null },
    ])
    expect(r.masChicos).toEqual([{ nombre: "Ana", edad: 12 }])
    expect(r.masGrandes).toEqual([{ nombre: "Beto", edad: 70 }])
    expect(r.modas).toEqual([40])
    expect(r.cantidadModa).toBe(2)
    expect(r.conEdad).toBe(4)
    expect(r.sinEdad).toBe(2)
  })

  test("sin datos no explota", () => {
    const r = resumirEdades([])
    expect(r.modas).toEqual([])
    expect(r.promedio).toBeNull()
  })
})
