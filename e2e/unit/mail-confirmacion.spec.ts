import { test, expect } from "@playwright/test"
import { templateConfirmacion } from "@/lib/email/templates"
import { LIMITE_MEDALLAS } from "@/lib/constants"

// El mail de confirmacion repite lo que dice la ventana de /inscripcion:
// lluvia, acompañantes, remera a domicilio y, si corresponde, sin medalla.

const base = { nombreCompleto: "Juan Perez", tokenQR: "abc" }

test.describe("Mail de confirmacion · avisos", () => {
  test("siempre avisa la fecha si llueve y lo que pagan los acompañantes", () => {
    const { html, texto } = templateConfirmacion({ ...base, numeroInscripcion: 10 })
    for (const salida of [html, texto]) {
      expect(salida).toContain("domingo 28 de marzo")
      expect(salida).toContain("$10.000")
    }
  })

  test("sin medalla solo si el numero pasa el limite", () => {
    const dentro = templateConfirmacion({ ...base, numeroInscripcion: LIMITE_MEDALLAS })
    expect(dentro.texto).not.toContain("no hay más medallas")

    const fuera = templateConfirmacion({ ...base, numeroInscripcion: LIMITE_MEDALLAS + 1 })
    expect(fuera.texto).toContain("no hay más medallas")
    expect(fuera.html).toContain("no hay más medallas")

    // Sin numero no se sabe: no se avisa.
    expect(templateConfirmacion(base).texto).not.toContain("no hay más medallas")
  })

  test("la remera es a domicilio, con costo de envio y despues del evento, aunque el pedido diga retiro", () => {
    for (const remera of [
      { pedida: true, envioTipo: "retiro" as const },
      { pedida: true, envioTipo: "envio" as const },
      { pedida: false },
    ]) {
      const { texto, html } = templateConfirmacion({ ...base, remera })
      expect(texto).toContain("costo adicional de envío")
      expect(texto).toContain("después del evento")
      expect(texto).not.toContain("en el evento.")
      expect(html).toContain("costo adicional de env&iacute;o")
    }
  })
})
