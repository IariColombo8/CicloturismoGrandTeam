import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// El pedido de remera tiene los mismos dos riesgos que la inscripcion: un
// comprobante pesado y una conexion que se corta. El recorrido completo por la
// UI no se puede automatizar con sensatez (el paso de la direccion depende de
// la API de localidades del Estado), asi que lo que se verifica aca es que el
// formulario siga usando las piezas que ya estan probadas:
//
// - prepararComprobante (e2e/unit/comprobante.spec.ts): nunca falla, achica las
//   fotos, no tiene limite de tamaño.
// - la cola de envios (e2e/unit/cola-offline.spec.ts), con la direccion de
//   entrega viajando junto al pedido.
//
// Si alguien vuelve a poner un limite de tamaño o saca la cola, esto falla.

const modal = readFileSync(join(process.cwd(), "components", "remera", "RemeroFormModal.tsx"), "utf8")
const envio = readFileSync(join(process.cwd(), "lib", "remera", "envio.ts"), "utf8")

test.describe("formulario de pedido de remera", () => {
  test("no rechaza comprobantes por su tamaño", () => {
    expect(modal, "volvió el límite de 5 MB").not.toContain("5 * 1024 * 1024")
    expect(modal, "volvió el cartel de archivo demasiado grande").not.toContain("demasiado grande")
  })

  test("prepara el comprobante con el compresor compartido", () => {
    expect(modal).toContain("prepararComprobante")
    // El lector crudo de archivos ya no se usa: mandaba la foto entera.
    expect(modal).not.toContain("const archivoABase64")
  })

  test("acepta fotos de cualquier formato, HEIC incluido", () => {
    expect(modal).toContain('accept="image/*,.pdf,.heic,.heif,application/pdf"')
  })

  test("manda el pedido por la cola, no con un fetch pelado", () => {
    expect(modal).toContain("enviarPedidoRemera")
    expect(modal, "un POST directo se perdería sin internet").not.toContain('fetch("/api/remera/submit"')
  })

  test("avisa cuando el pedido quedó esperando internet", () => {
    expect(modal).toContain("pedidoEnCola")
    expect(modal).toContain("Quedó guardado en este teléfono")
    // Y lo reintenta solo.
    expect(modal).toContain("vigilarPedidosPendientes")
  })

  test("nunca le muestra un error a la persona al enviar", () => {
    // El catch del envío ya no abre un toast de error: confirma y guarda.
    expect(modal).not.toContain('title: "Error al enviar el pedido"')
  })

  test("la dirección de entrega viaja con el pedido", () => {
    expect(envio).toContain("guardar_entrega_remera_v2")
    expect(envio).toContain("/api/remera/submit")
    expect(envio).toContain('tipo: "remera"')
  })
})
