import { test, expect } from "@playwright/test"
import {
  MODOS,
  TAREAS,
  catalogoDeTareas,
  cuposDeTareas,
  infoModo,
  leerAjustesRoles,
  textoFalta,
  banderasDeModo,
  esTareaConocida,
  etiquetaTarea,
  filtrarRoles,
  inicialesDe,
  limpiarNombre,
  modoDeRol,
  normalizarDatosRol,
  normalizarNombre,
  ordenarRoles,
  resumirRoles,
  type RolEvento,
} from "@/lib/roles"

/** Fila armada a mano, con lo minimo para que se entienda el caso. */
function rol(nombre: string, extra: Partial<RolEvento> = {}): RolEvento {
  return {
    id: nombre,
    participante_id: null,
    nombre,
    pedalea: false,
    ayuda: false,
    tareas: [],
    familiares: 0,
    familiares_detalle: null,
    notas: null,
    bloqueado: false,
    cargado_por: null,
    orden: 0,
    ...extra,
  }
}

test.describe("pedalea / ayuda", () => {
  test("las cuatro respuestas de pantalla van y vuelven sin perderse", () => {
    for (const modo of ["pedalea", "pedalea_ayuda", "ayuda", "acompana"] as const) {
      const banderas = banderasDeModo(modo)
      expect(modoDeRol(banderas), `el modo ${modo}`).toBe(modo)
    }
  })

  test("el que pedalea y ayuda cuenta en las dos cosas", () => {
    const lista = [
      rol("Pedalea", { pedalea: true }),
      rol("Ayuda", { ayuda: true }),
      rol("Las dos", { pedalea: true, ayuda: true }),
      rol("Acompaña"),
    ]
    const resumen = resumirRoles(lista)

    expect(resumen.total).toBe(4)
    expect(resumen.pedalean).toBe(2)
    expect(resumen.ayudan).toBe(2)
    // El numero que importa para cubrir los puestos: ayudan sin pedalear.
    expect(resumen.soloAyudan).toBe(1)
  })
})

test.describe("nombres", () => {
  test("acentos, mayusculas y espacios de mas son la misma persona", () => {
    expect(normalizarNombre("JOSÉ  PÉREZ")).toBe(normalizarNombre("jose perez"))
    expect(normalizarNombre("  Iñaki   Muñoz ")).toBe("inaki munoz")
  })

  test("el nombre se guarda limpio pero sin cambiar lo que escribio la persona", () => {
    expect(limpiarNombre("  Jose   Perez  ")).toBe("Jose Perez")
  })

  test("las iniciales salen de las dos primeras palabras", () => {
    expect(inicialesDe("jose perez gonzalez")).toBe("JP")
    expect(inicialesDe("Lore")).toBe("L")
    expect(inicialesDe("")).toBe("")
  })
})

test.describe("tareas", () => {
  test("una tarea de la lista muestra su etiqueta", () => {
    expect(etiquetaTarea("acreditacion")).toBe("Acreditación")
    expect(esTareaConocida("acreditacion")).toBe(true)
  })

  test("una tarea escrita a mano se muestra tal cual", () => {
    expect(etiquetaTarea("manejar el drone")).toBe("manejar el drone")
    expect(esTareaConocida("manejar el drone")).toBe(false)
  })

  test("el resumen ordena las tareas de la mas cubierta a la menos", () => {
    const lista = [
      rol("A", { tareas: ["acreditacion", "comida"] }),
      rol("B", { tareas: ["acreditacion"] }),
      rol("C", { tareas: ["acreditacion", "fotos"] }),
    ]
    const resumen = resumirRoles(lista)

    expect(resumen.porTarea[0]).toEqual({ id: "acreditacion", etiqueta: "Acreditación", cantidad: 3 })
    expect(resumen.porTarea).toHaveLength(3)
  })

  test("avisa de las tareas que no tienen a nadie", () => {
    const resumen = resumirRoles([rol("A", { tareas: ["acreditacion"] })])

    expect(resumen.tareasSinGente).toHaveLength(TAREAS.length - 1)
    expect(resumen.tareasSinGente.some((t) => t.id === "acreditacion")).toBe(false)
  })
})

test.describe("familiares", () => {
  test("cuenta cuanta gente hay en total contando los familiares", () => {
    const resumen = resumirRoles([rol("A", { familiares: 2 }), rol("B", { familiares: 1 }), rol("C")])

    expect(resumen.familiares).toBe(3)
    expect(resumen.conFamiliares).toBe(6)
  })

  test("un numero negativo no resta gente", () => {
    const resumen = resumirRoles([rol("A", { familiares: -5 })])
    expect(resumen.familiares).toBe(0)
  })
})

test.describe("filtros", () => {
  const lista = [
    rol("Jose Perez", { pedalea: true, tareas: ["acreditacion"] }),
    rol("Lore Gomez", { ayuda: true, familiares: 2, notas: "llego 7:30" }),
    rol("Iñaki Muñoz", { pedalea: true, ayuda: true, tareas: ["comida"] }),
  ]

  test("busca sin importar acentos ni mayusculas", () => {
    expect(filtrarRoles(lista, { texto: "INAKI" }).map((r) => r.nombre)).toEqual(["Iñaki Muñoz"])
  })

  test("busca tambien por tarea y por las notas", () => {
    expect(filtrarRoles(lista, { texto: "acreditacion" }).map((r) => r.nombre)).toEqual(["Jose Perez"])
    expect(filtrarRoles(lista, { texto: "7:30" }).map((r) => r.nombre)).toEqual(["Lore Gomez"])
  })

  test("el filtro de modo distingue al que ayuda y pedalea del que solo pedalea", () => {
    expect(filtrarRoles(lista, { modo: "pedalea" }).map((r) => r.nombre)).toEqual(["Jose Perez"])
    expect(filtrarRoles(lista, { modo: "pedalea_ayuda" }).map((r) => r.nombre)).toEqual(["Iñaki Muñoz"])
  })

  test("se puede ver solo a los que traen familiares", () => {
    expect(filtrarRoles(lista, { conFamiliares: true }).map((r) => r.nombre)).toEqual(["Lore Gomez"])
  })

  test("sin filtros no se cae nadie de la lista", () => {
    expect(filtrarRoles(lista, {})).toHaveLength(3)
    expect(filtrarRoles(lista, { texto: "", modo: "todos", tarea: "todas" })).toHaveLength(3)
  })
})

test.describe("orden", () => {
  test("manda el orden del panel y a igual orden van primero los que ayudan", () => {
    const lista = [
      rol("Zulma", { orden: 1, pedalea: true }),
      rol("Ana", { orden: 1, ayuda: true }),
      rol("Beto", { orden: 0, pedalea: true }),
    ]
    expect(ordenarRoles(lista).map((r) => r.nombre)).toEqual(["Beto", "Ana", "Zulma"])
  })

  test("no toca la lista original", () => {
    const lista = [rol("B", { orden: 1 }), rol("A", { orden: 0 })]
    ordenarRoles(lista)
    expect(lista.map((r) => r.nombre)).toEqual(["B", "A"])
  })
})

test.describe("lo que llega del formulario", () => {
  test("sin nombre no se guarda nada", () => {
    expect(normalizarDatosRol({ nombre: "   " })).toBeNull()
    expect(normalizarDatosRol({})).toBeNull()
  })

  test("con el nombre alcanza: nada mas puede frenar el guardado", () => {
    const datos = normalizarDatosRol({ nombre: "Jose Perez" })
    expect(datos).not.toBeNull()
    expect(datos!.pedalea).toBe(false)
    expect(datos!.tareas).toEqual([])
    expect(datos!.familiares).toBe(0)
    expect(datos!.notas).toBeNull()
  })

  test("acomoda los valores raros en vez de rechazar el envio", () => {
    const datos = normalizarDatosRol({
      nombre: "  Lore   Gomez ",
      familiares: -3,
      tareas: ["comida", "comida", "  ", "fotos"],
      notas: "   ",
    })!

    expect(datos.nombre).toBe("Lore Gomez")
    expect(datos.familiares).toBe(0)
    expect(datos.tareas).toEqual(["comida", "fotos"])
    expect(datos.notas).toBeNull()
  })

  test("un familiares con coma o enorme queda en un numero usable", () => {
    expect(normalizarDatosRol({ nombre: "A", familiares: 2.7 })!.familiares).toBe(2)
    expect(normalizarDatosRol({ nombre: "A", familiares: 999 })!.familiares).toBe(20)
    expect(normalizarDatosRol({ nombre: "A", familiares: Number.NaN })!.familiares).toBe(0)
  })
})

test.describe("cupos por tarea", () => {
  const catalogo = [
    { id: "acreditacion", etiqueta: "Acreditación", necesarios: 3 },
    { id: "Desayuno", etiqueta: "Desayuno", necesarios: 2 },
    { id: "fotos", etiqueta: "Fotos y video", necesarios: 1 },
    { id: "mecanica", etiqueta: "Mecánica", necesarios: 0 },
  ]
  const lista = [
    rol("A", { tareas: ["acreditacion", "fotos"] }),
    rol("B", { tareas: ["acreditacion", "Cierre de pelotón"] }),
    rol("C", { tareas: ["Desayuno"] }),
  ]

  test("dice cuantos faltan y deja lo cubierto abajo de todo", () => {
    const cupos = cuposDeTareas(lista, catalogo)
    const ids = cupos.map((c) => c.id)

    expect(cupos[0]).toMatchObject({ id: "acreditacion", tenemos: 2, necesarios: 3, faltan: 1, estado: "falta" })
    expect(cupos.find((c) => c.id === "Desayuno")).toMatchObject({ faltan: 1, estado: "falta" })
    expect(ids[ids.length - 1]).toBe("fotos")
    expect(cupos.find((c) => c.id === "fotos")!.estado).toBe("cubierta")
    expect(textoFalta(cupos[0])).toBe("Falta 1 de Acreditación")
    expect(textoFalta({ faltan: 3, etiqueta: "Desayuno" })).toBe("Faltan 3 de Desayuno")
  })

  test("una tarea escrita a mano en una ficha se puede elegir (entra al catalogo)", () => {
    const todas = catalogoDeTareas({ tareas: catalogo }, lista)
    expect(todas.some((t) => t.id === "Cierre de pelotón")).toBe(true)
    expect(cuposDeTareas(lista, catalogo).find((c) => c.id === "Cierre de pelotón")).toMatchObject({
      tenemos: 1,
      estado: "sin-cupo",
    })
  })

  test("el total de faltantes suma solo las tareas con cupo", () => {
    expect(resumirRoles(lista, catalogo).faltanEnTotal).toBe(2)
  })

  test("pasarse del cupo no da faltantes negativos", () => {
    const cupos = cuposDeTareas([rol("A", { tareas: ["fotos"] }), rol("B", { tareas: ["fotos"] })], catalogo)
    expect(cupos.find((c) => c.id === "fotos")).toMatchObject({ tenemos: 2, faltan: 0, estado: "cubierta" })
  })

  test("sin fila guardada se usa la lista de siempre; una fila rota no rompe", () => {
    expect(leerAjustesRoles(null).tareas).toHaveLength(TAREAS.length)
    expect(leerAjustesRoles({ tareas: "x" }).tareas).toHaveLength(TAREAS.length)
    const leidas = leerAjustesRoles({
      tareas: [{ etiqueta: "Desayuno", necesarios: -4 }, { id: "", etiqueta: "" }, { etiqueta: "Desayuno" }],
    }).tareas
    expect(leidas).toEqual([{ id: "Desayuno", etiqueta: "Desayuno", necesarios: 0 }])
  })

  test("'No pedaleo, acompaño' ya no se ofrece, pero las fichas viejas se siguen viendo", () => {
    expect(MODOS.some((m) => m.modo === "acompana")).toBe(false)
    expect(infoModo(modoDeRol(rol("Viejo"))).etiqueta).toBe("Acompaña")
  })
})
