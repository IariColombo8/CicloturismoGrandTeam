import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// El Service Worker hace dos cosas que no se pueden pisar: recibir las
// notificaciones push y guardar el sitio para abrirlo sin internet. Este test
// lee el archivo y falla si alguien saca una de las dos, o si empieza a
// guardar cosas que no debe.

const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8")

test.describe("public/sw.js", () => {
  test("sigue atendiendo las notificaciones push", () => {
    expect(sw, "falta el listener de push").toContain('addEventListener("push"')
    expect(sw, "falta el listener del click en la notificación").toContain('addEventListener("notificationclick"')
    expect(sw, "ya no muestra la notificación").toContain("showNotification")
  })

  test("guarda el sitio para abrirlo sin internet", () => {
    expect(sw, "falta el listener de fetch").toContain('addEventListener("fetch"')
    expect(sw, "falta la pantalla de sin conexión").toContain("offline.html")
    expect(sw, "no precachea el formulario de inscripción").toContain('"/inscripcion"')
    expect(sw, "no precachea el pedido de remera").toContain('"/pedir-remera"')
  })

  test("nunca guarda las API, el panel ni el login", () => {
    expect(sw).toContain("NUNCA_CACHEAR")
    for (const ruta of ["api", "admin", "login", "auth"]) {
      expect(sw, `${ruta} tendría que estar excluido`).toContain(ruta)
    }
  })

  test("la cache lleva la versión del sitio, así cada deploy estrena una", () => {
    expect(sw).toContain('searchParams.get("v")')
    expect(sw).toContain("gtb-")
  })

  test("deja que la página pida activar la versión nueva", () => {
    expect(sw).toContain("activar-ahora")
    expect(sw).toContain("skipWaiting")
  })
})
