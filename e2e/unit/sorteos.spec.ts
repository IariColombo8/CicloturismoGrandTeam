import { test, expect } from "@playwright/test"
import {
  candidatosRepesca,
  estadoBolillero,
  etiquetaPremio,
  ganadores,
  participantesElegibles,
  planDePremios,
  prepararTirada,
  slotsSinReclamar,
  slotsSinTirar,
  tiradaEnEspera,
  tiradasDePremios,
  VUELTA_REPESCA,
  VUELTA_SORTEO,
  type Candidato,
  type FilaParticipante,
  type Premio,
  type Resultado,
  type Sorteo,
} from "@/lib/sorteos"

// ──────────────────────────────────────────────────────────────
// Ayudas
// ──────────────────────────────────────────────────────────────

const SORTEO_BASE: Sorteo = {
  id: "s1",
  nombre: "Sorteo de premios",
  descripcion: null,
  total_sorteos: 3,
  estado: "borrador",
  publico: false,
  orden: 0,
  excluir_grupos: [],
  excluir_participantes: [],
  incluir_participantes: [],
  solo_confirmados: true,
  solo_acreditados: false,
}

function persona(over: Partial<FilaParticipante> & { id: string }): FilaParticipante {
  return {
    nombre: over.id.toUpperCase(),
    apellido: "Apellido",
    estado: "confirmada",
    localidad: "Concepción del Uruguay",
    grupo_ciclistas: null,
    checked_in: true,
    ...over,
  }
}

function candidato(id: string): Candidato {
  return { id, nombre: id.toUpperCase(), localidad: null, grupo: null }
}

let contador = 0

function resultado(over: Partial<Resultado> & { participante_id: string; slot: number }): Resultado {
  contador++
  return {
    id: `r${contador}`,
    sorteo_id: "s1",
    premio_id: null,
    premio_nombre: null,
    orden: over.orden ?? over.slot,
    ronda: 1,
    vuelta: VUELTA_SORTEO,
    nombre: over.participante_id.toUpperCase(),
    localidad: null,
    grupo: null,
    estado: "pendiente",
    resuelto_en: null,
    created_at: new Date(2026, 10, 8, 12, contador).toISOString(),
    ...over,
  }
}

/** Azar fijo: siempre el primero de la lista. */
const primero = () => 0

// ──────────────────────────────────────────────────────────────
// Quien entra al bolillero
// ──────────────────────────────────────────────────────────────

test.describe("participantesElegibles", () => {
  test("deja afuera las rechazadas y las no confirmadas", () => {
    const filas = [
      persona({ id: "a" }),
      persona({ id: "b", estado: "pendiente" }),
      persona({ id: "c", estado: "rechazada" }),
      persona({ id: "d", estado: "aprobado" }),
    ]
    const ids = participantesElegibles(filas, SORTEO_BASE).map((c) => c.id)
    expect(ids).toEqual(["a", "d"])
  })

  test("con solo_confirmados en false entran las pendientes, nunca las rechazadas", () => {
    const filas = [persona({ id: "a", estado: "pendiente" }), persona({ id: "b", estado: "rechazada" })]
    const ids = participantesElegibles(filas, { ...SORTEO_BASE, solo_confirmados: false }).map((c) => c.id)
    expect(ids).toEqual(["a"])
  })

  test("excluye grupos sin importar acentos ni mayusculas", () => {
    const filas = [
      persona({ id: "a", grupo_ciclistas: "Grand Team Bike" }),
      persona({ id: "b", grupo_ciclistas: "grand team bike " }),
      persona({ id: "c", grupo_ciclistas: "Pedaleá Paysandú" }),
      persona({ id: "d", grupo_ciclistas: "PEDALEA PAYSANDU" }),
      persona({ id: "e" }),
    ]
    const sorteo = { ...SORTEO_BASE, excluir_grupos: ["GRAND TEAM BIKE", "pedalea paysandu"] }
    expect(participantesElegibles(filas, sorteo).map((c) => c.id)).toEqual(["e"])
  })

  test("excluye personas marcadas a mano", () => {
    const filas = [persona({ id: "a" }), persona({ id: "b" })]
    const sorteo = { ...SORTEO_BASE, excluir_participantes: ["b"] }
    expect(participantesElegibles(filas, sorteo).map((c) => c.id)).toEqual(["a"])
  })

  test("solo_acreditados deja solo a los que hicieron check-in", () => {
    const filas = [persona({ id: "a" }), persona({ id: "b", checked_in: false })]
    const sorteo = { ...SORTEO_BASE, solo_acreditados: true }
    expect(participantesElegibles(filas, sorteo).map((c) => c.id)).toEqual(["a"])
  })

  test("la lista cerrada manda sobre los filtros, pero no sobre las exclusiones", () => {
    const filas = [
      persona({ id: "a", estado: "pendiente", checked_in: false }),
      persona({ id: "b" }),
      persona({ id: "c" }),
    ]
    const sorteo = {
      ...SORTEO_BASE,
      solo_acreditados: true,
      incluir_participantes: ["a", "b"],
      excluir_participantes: ["b"],
    }
    expect(participantesElegibles(filas, sorteo).map((c) => c.id)).toEqual(["a"])
  })
})

// ──────────────────────────────────────────────────────────────
// Premios
// ──────────────────────────────────────────────────────────────

test.describe("planDePremios", () => {
  const premio = (id: string, orden: number, cantidad = 1): Premio => ({
    id,
    sorteo_id: "s1",
    nombre: id,
    descripcion: null,
    imagen_url: null,
    cantidad,
    visible: true,
    orden,
  })

  test("reparte cada premio tantas veces como su cantidad", () => {
    const plan = planDePremios([premio("gorra", 0, 2), premio("bidon", 1)], 4)
    expect(plan.map((p) => p?.nombre ?? null)).toEqual(["gorra", "gorra", "bidon", null])
  })

  test("las tiradas sin premio cargado quedan en null y se anuncian por numero", () => {
    const plan = planDePremios([], 2)
    expect(plan).toEqual([null, null])
    expect(etiquetaPremio(null, 2)).toBe("Premio 2")
    expect(etiquetaPremio("Bici", 2)).toBe("Bici")
  })

  test("no inventa tiradas si hay mas premios que sorteos", () => {
    const plan = planDePremios([premio("a", 0, 5)], 2)
    expect(plan).toHaveLength(2)
    expect(tiradasDePremios([premio("a", 0, 5)])).toBe(5)
  })
})

// ──────────────────────────────────────────────────────────────
// La regla de las rondas (lo que pidio el usuario)
// ──────────────────────────────────────────────────────────────

test.describe("estadoBolillero", () => {
  const pool = [candidato("a"), candidato("b"), candidato("c")]

  test("quien ya salio no vuelve a salir en la misma ronda", () => {
    const resultados = [resultado({ participante_id: "a", slot: 1 })]
    const estado = estadoBolillero(pool, resultados, VUELTA_SORTEO)
    expect(estado.ronda).toBe(1)
    expect(estado.disponibles.map((c) => c.id)).toEqual(["b", "c"])
  })

  test("cuando salieron todos arranca una ronda nueva con el bolillero lleno", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1 }),
      resultado({ participante_id: "b", slot: 2 }),
      resultado({ participante_id: "c", slot: 3 }),
    ]
    const estado = estadoBolillero(pool, resultados, VUELTA_SORTEO)
    expect(estado.ronda).toBe(2)
    expect(estado.rondaNueva).toBe(true)
    expect(estado.disponibles.map((c) => c.id)).toEqual(["a", "b", "c"])
  })

  test("las tiradas de la repesca no gastan las rondas del sorteo original", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1, vuelta: VUELTA_REPESCA, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 2, vuelta: VUELTA_REPESCA, estado: "no_reclamo" }),
    ]
    const estado = estadoBolillero(pool, resultados, VUELTA_SORTEO)
    expect(estado.disponibles.map((c) => c.id)).toEqual(["a", "b", "c"])
  })

  test("el que ya se llevo un premio no vuelve a entrar, ni ganado en la repesca", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 1, vuelta: VUELTA_REPESCA, estado: "reclamado" }),
    ]
    const estado = estadoBolillero(pool, resultados, VUELTA_SORTEO)
    // "a" salio en la ronda, "b" ya tiene premio: queda solo "c".
    expect(estado.disponibles.map((c) => c.id)).toEqual(["c"])
  })

  test("el que esta esperando respuesta tampoco entra en otra tirada", () => {
    const resultados = [resultado({ participante_id: "b", slot: 1, estado: "pendiente" })]
    const estado = estadoBolillero(pool, resultados, VUELTA_SORTEO)
    expect(estado.disponibles.map((c) => c.id)).toEqual(["a", "c"])
  })
})

test.describe("mas sorteos que inscriptos", () => {
  test("reparte a todos antes de que alguien repita", () => {
    const filas = [persona({ id: "a" }), persona({ id: "b" })]
    const sorteo = { ...SORTEO_BASE, total_sorteos: 5 }
    const elegibles = participantesElegibles(filas, sorteo)

    const resultados: Resultado[] = []
    const salidas: { id: string; ronda: number }[] = []

    for (let i = 0; i < 5; i++) {
      const tirada = prepararTirada({
        elegibles,
        resultados,
        premios: [],
        total: sorteo.total_sorteos,
        vuelta: VUELTA_SORTEO,
        aleatorio: primero,
      })
      expect(tirada, `tirada ${i + 1}`).not.toBeNull()
      salidas.push({ id: tirada!.candidato.id, ronda: tirada!.ronda })
      resultados.push(
        resultado({
          participante_id: tirada!.candidato.id,
          slot: tirada!.slot,
          orden: tirada!.orden,
          ronda: tirada!.ronda,
          estado: "reclamado",
        }),
      )
    }

    // Dos personas, cinco premios: a, b (ronda 1), a, b (ronda 2), a (ronda 3).
    expect(salidas.map((s) => s.id)).toEqual(["a", "b", "a", "b", "a"])
    expect(salidas.map((s) => s.ronda)).toEqual([1, 1, 2, 2, 3])
    // Nadie salio dos veces en la misma ronda.
    for (const ronda of [1, 2, 3]) {
      const deLaRonda = salidas.filter((s) => s.ronda === ronda).map((s) => s.id)
      expect(new Set(deLaRonda).size).toBe(deLaRonda.length)
    }
  })

  test("se detiene al completar las tiradas pedidas", () => {
    const elegibles = [candidato("a"), candidato("b")]
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "reclamado" }),
      resultado({ participante_id: "b", slot: 2, estado: "reclamado" }),
    ]
    const tirada = prepararTirada({
      elegibles,
      resultados,
      premios: [],
      total: 2,
      vuelta: VUELTA_SORTEO,
      aleatorio: primero,
    })
    expect(tirada).toBeNull()
    expect(slotsSinTirar(resultados, 2)).toEqual([])
  })

  test("sin nadie en el bolillero no sortea", () => {
    const tirada = prepararTirada({
      elegibles: [],
      resultados: [],
      premios: [],
      total: 3,
      vuelta: VUELTA_SORTEO,
      aleatorio: primero,
    })
    expect(tirada).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────
// Reclamo, "pasar al siguiente" y repesca
// ──────────────────────────────────────────────────────────────

test.describe("los que no reclamaron", () => {
  test("el premio sin reclamar queda en la lista y el sorteo sigue con el siguiente", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 2, estado: "reclamado" }),
    ]
    expect(slotsSinReclamar(resultados).map((r) => r.slot)).toEqual([1])
    expect(ganadores(resultados).map((r) => r.participante_id)).toEqual(["b"])
    // La tirada siguiente es por el premio 3, no por el 1.
    const tirada = prepararTirada({
      elegibles: [candidato("c")],
      resultados,
      premios: [],
      total: 3,
      vuelta: VUELTA_SORTEO,
      aleatorio: primero,
    })
    expect(tirada?.slot).toBe(3)
  })

  test("la repesca sortea solo entre los que no reclamaron", () => {
    const elegibles = [candidato("a"), candidato("b"), candidato("c")]
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 2, estado: "reclamado" }),
      resultado({ participante_id: "c", slot: 3, estado: "no_reclamo" }),
    ]

    expect(candidatosRepesca(resultados, elegibles).map((c) => c.id)).toEqual(["a", "c"])

    const tirada = prepararTirada({
      elegibles,
      resultados,
      premios: [],
      total: 3,
      vuelta: VUELTA_REPESCA,
      aleatorio: primero,
    })
    // Se repesca el primer premio sin dueño y el que gano no entra.
    expect(tirada?.slot).toBe(1)
    expect(["a", "c"]).toContain(tirada?.candidato.id)
  })

  test("en la repesca nadie sale dos veces hasta que salieron todos", () => {
    const elegibles = [candidato("a"), candidato("b")]
    const resultados: Resultado[] = [
      resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 2, estado: "no_reclamo" }),
    ]

    const primera = prepararTirada({
      elegibles,
      resultados,
      premios: [],
      total: 2,
      vuelta: VUELTA_REPESCA,
      aleatorio: primero,
    })!
    resultados.push(
      resultado({
        participante_id: primera.candidato.id,
        slot: primera.slot,
        orden: primera.orden,
        ronda: primera.ronda,
        vuelta: VUELTA_REPESCA,
        estado: "reclamado",
      }),
    )

    const segunda = prepararTirada({
      elegibles,
      resultados,
      premios: [],
      total: 2,
      vuelta: VUELTA_REPESCA,
      aleatorio: primero,
    })!
    expect(segunda.candidato.id).not.toBe(primera.candidato.id)
    expect(segunda.slot).not.toBe(primera.slot)
  })

  test("sin premios sin reclamar no hay repesca", () => {
    const resultados = [resultado({ participante_id: "a", slot: 1, estado: "reclamado" })]
    const tirada = prepararTirada({
      elegibles: [candidato("a")],
      resultados,
      premios: [],
      total: 1,
      vuelta: VUELTA_REPESCA,
      aleatorio: primero,
    })
    expect(tirada).toBeNull()
  })

  test("un premio repescado deja de estar sin dueño", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 1, vuelta: VUELTA_REPESCA, estado: "reclamado" }),
    ]
    expect(slotsSinReclamar(resultados)).toEqual([])
    expect(ganadores(resultados).map((r) => r.participante_id)).toEqual(["b"])
  })

  test("si tampoco reclama el repescado, el premio vuelve a la lista", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" }),
      resultado({ participante_id: "b", slot: 1, vuelta: VUELTA_REPESCA, estado: "no_reclamo" }),
    ]
    expect(slotsSinReclamar(resultados).map((r) => r.participante_id)).toEqual(["b"])
  })
})

test.describe("tiradaEnEspera", () => {
  test("es la ultima que salio y todavia no se resolvio", () => {
    const resultados = [
      resultado({ participante_id: "a", slot: 1, estado: "reclamado" }),
      resultado({ participante_id: "b", slot: 2, estado: "pendiente" }),
    ]
    expect(tiradaEnEspera(resultados)?.participante_id).toBe("b")
  })

  test("sin tiradas sin resolver no hay nadie esperando", () => {
    const resultados = [resultado({ participante_id: "a", slot: 1, estado: "no_reclamo" })]
    expect(tiradaEnEspera(resultados)).toBeNull()
  })
})
