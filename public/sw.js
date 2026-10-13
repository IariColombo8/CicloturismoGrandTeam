// Service Worker de Grand Team Bike.
// Unica responsabilidad: recibir las notificaciones push del evento y abrir el
// panel cuando se tocan. No cachea nada: el sitio lo sirve Next/Vercel.

self.addEventListener("install", (event) => {
  // Toma el control sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let datos = {}

  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    // Payload que no es JSON: se muestra como texto plano.
    datos = { titulo: "Grand Team Bike", cuerpo: event.data ? event.data.text() : "" }
  }

  const titulo = datos.titulo || "Grand Team Bike"
  const opciones = {
    body: datos.cuerpo || "",
    icon: datos.icono || "/email/logo.png",
    badge: "/email/logo.png",
    // Agrupa por tipo: una inscripcion nueva reemplaza al aviso anterior en vez
    // de apilar diez notificaciones.
    tag: datos.tag || "grandteam",
    renotify: true,
    requireInteraction: false,
    data: { url: datos.url || "/admin/registro-inscripciones" },
  }

  event.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const destino = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientes) => {
      // Si ya hay una pestaña del sitio abierta, se reutiliza.
      for (const cliente of clientes) {
        if (cliente.url.includes(self.location.origin) && "focus" in cliente) {
          cliente.navigate(destino)
          return cliente.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino)
    })
  )
})
