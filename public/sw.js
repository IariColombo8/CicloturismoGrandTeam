// Service Worker de Grand Team Bike.
//
// Dos trabajos, separados y sin pisarse:
//
// 1. NOTIFICACIONES PUSH (eventos "push" y "notificationclick"). Es lo que ya
//    hacia antes y no cambio.
// 2. QUE EL SITIO ABRA SIN INTERNET (evento "fetch"). Guarda una copia de las
//    paginas y de los archivos JS/CSS que ya se bajaron, asi alguien que entro
//    antes puede abrir el formulario de inscripcion con el celular sin señal,
//    cargarlo, y mandarlo cuando vuelva la conexion (la cola de envio esta en
//    lib/inscripcion/envio.ts).
//
// Se registra con /sw.js?v=<version del sitio>, asi cada deploy instala un
// Service Worker nuevo y estrena su propia cache.

const VERSION = new URL(self.location.href).searchParams.get("v") || "sin-version"
const CACHE = `gtb-${VERSION}`

// Lo unico que se guarda al instalar: la pantalla de "sin conexion", que es un
// archivo suelto y liviano.
//
// Las paginas NO se precachean a proposito. Pedir "/", "/inscripcion",
// "/pedir-remera" y "/mi-qr" durante la instalacion la hacia depender de cuatro
// descargas (en desarrollo, de cuatro compilaciones): el worker se quedaba
// instalando y nunca llegaba a activarse. Cada pagina se guarda sola cuando la
// persona la visita, que es justo lo que hace falta para que despues abra sin
// internet.
const BASICOS = ["/offline.html"]

// Nunca se guardan: datos que tienen que ser frescos o privados.
const NUNCA_CACHEAR = [/^\/api\//, /^\/admin/, /^\/login/, /^\/auth/]

// Excepcion al bloqueo de /admin: el panel de sorteos tiene que abrir el dia
// del evento aunque no haya señal. Lo que se guarda es la pagina vacia (el
// shell) y sus archivos JS; los nombres y los premios los precarga la propia
// pagina en el telefono (lib/sorteosLocal.ts).
const IGUAL_SE_GUARDA = [/^\/admin\/sorteos/]

const esGet = (req) => req.method === "GET"
const mismoOrigen = (url) => url.origin === self.location.origin
const prohibido = (url) =>
  !IGUAL_SE_GUARDA.some((re) => re.test(url.pathname)) &&
  NUNCA_CACHEAR.some((re) => re.test(url.pathname))

self.addEventListener("install", (event) => {
  // Primero lo importante: tomar el control sin esperar a que se cierren las
  // pestañas viejas. Si la activacion dependiera de la red, una conexion mala
  // dejaria el worker a medio instalar.
  self.skipWaiting()

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE)
        await Promise.allSettled(BASICOS.map((ruta) => cache.add(new Request(ruta, { cache: "reload" }))))
      } catch {
        // Sin cache igual funciona: el sitio lo sigue sirviendo la red.
      }
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Borra las caches de versiones anteriores.
        const nombres = await caches.keys()
        await Promise.all(nombres.filter((n) => n.startsWith("gtb-") && n !== CACHE).map((n) => caches.delete(n)))
      } catch {}
      await self.clients.claim()
    })(),
  )
})

// Permite que la página pida activar la versión nueva sin esperar.
self.addEventListener("message", (event) => {
  if (event.data === "activar-ahora") self.skipWaiting()
})

/**
 * Estrategia:
 * - Paginas: primero la red (asi siempre se ve lo ultimo) y, si no hay, la
 *   copia guardada. Si tampoco hay copia, la pantalla de "sin conexion".
 * - /_next/static: primero la cache (llevan hash en el nombre, no cambian).
 * - Imagenes y fuentes: la cache y, mientras, se actualizan en segundo plano.
 * - API, admin y login: siempre la red, nunca se guardan.
 */
self.addEventListener("fetch", (event) => {
  const req = event.request
  if (!esGet(req)) return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  if (!mismoOrigen(url) || prohibido(url)) return

  // Navegaciones (abrir o recargar una pagina).
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const respuesta = await fetch(req)
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone()
            caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {})
          }
          return respuesta
        } catch {
          const guardada = (await caches.match(req)) || (await caches.match(url.pathname))
          if (guardada) return guardada
          const offline = await caches.match("/offline.html")
          if (offline) return offline
          return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain" } })
        }
      })(),
    )
    return
  }

  // Archivos con hash en el nombre: la cache alcanza y es instantanea.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const guardado = await caches.match(req)
        if (guardado) return guardado
        try {
          const respuesta = await fetch(req)
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone()
            caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {})
          }
          return respuesta
        } catch (error) {
          // Que falle como falla normalmente: el ChunkLoadError lo maneja
          // components/ErrorPantalla.tsx, que sabe recuperarse.
          throw error
        }
      })(),
    )
    return
  }

  // Imagenes, fuentes y demas estaticos del sitio.
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|css|js)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const guardado = await caches.match(req)
        const buscarEnRed = fetch(req)
          .then((respuesta) => {
            if (respuesta && respuesta.ok) {
              const copia = respuesta.clone()
              caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {})
            }
            return respuesta
          })
          .catch(() => null)

        if (guardado) return guardado
        const deRed = await buscarEnRed
        if (deRed) return deRed
        return new Response("", { status: 504 })
      })(),
    )
  }
})

// ──────────────────────────────────────────────────────────────
// Notificaciones push (sin cambios)
// ──────────────────────────────────────────────────────────────

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
