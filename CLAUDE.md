# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Guia para Claude Code en el repositorio **Grand Team Bike 2026**.

## IDIOMA - REGLA CRITICA

SIEMPRE responder en ESPANOL. Sin excepciones.
- Comentarios en codigo: espanol
- Mensajes de herramientas: espanol
- Confirmaciones: espanol
- TODO en espanol. Nunca en ingles.

## Permisos de Autonomia

Claude tiene **permisos ABSOLUTOS** para modificar cualquier archivo del proyecto sin preguntar. No pedir confirmacion para ningun cambio. Ejecutar todas las tareas hasta completarlas o agotar creditos. Actuar con total autonomia.

## Commands

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de produccion
npm run lint     # Ejecutar ESLint
npm run start    # Servidor de produccion
npm run gmail:auth  # Genera el GOOGLE_REFRESH_TOKEN de Gmail (ver docs/gmail-setup.md)

# Iconos de la app instalada (PWA). Salen de public/logo.png, que tiene las
# letras BLANCAS: los favicon las tienen negras y desaparecian sobre el fondo
# negro de la pantalla de arranque.
node scripts/generar-iconos-app.mjs

# Imagenes de vista previa (lo que se ve al compartir un link por WhatsApp).
# Una por pagina, en public/og/. La de /pedir-remera muestra la remera.
node scripts/generar-og.mjs

npm run test        # Unitarios + E2E
npm run test:unit   # Unitarios (Playwright sin navegador, ~3 s)
npm run test:e2e    # E2E: levanta el dev server en el puerto 3100
npm run test:e2e:ui # E2E en modo interactivo
```

Hay tests con Playwright: 120 unitarios (`e2e/unit/**`, logica pura) y 235 E2E
(`e2e/**`), que incluyen el recorrido completo de la inscripcion en un Pixel 5 y
en un iPhone 13 (WebKit), y un barrido de 8 paginas publicas en 5 anchos de
pantalla. **Correr `npm run test` antes de tocar la inscripcion o el formulario
de remera.** Detalle en `docs/inscripcion-sin-errores.md`.

## Reglas del Proyecto

### Antes de hacer cambios
- Analizar el codigo existente antes de modificar.
- Mantener la arquitectura actual (App Router, client-side Supabase).
- No romper estilos ni componentes existentes.
- Respetar el tema Negro (#000) + Amarillo Dorado (#ffd700) + Blanco (#fff).

### Antes de hacer commit
- Ejecutar `npm run build` y verificar que compile sin errores.
- Verificar que no haya errores de TypeScript criticos.

### Prohibido
- Hacer commit si el proyecto no compila.
- Introducir codigo sin probar el build.
- Modificar variables de entorno o credenciales.
- Eliminar tablas o registros de Supabase sin confirmacion.
- Reintroducir Firebase o cualquier dependencia de Firebase/Firestore en el proyecto.
- Usar `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente o codigo frontend (solo en `app/api/**`).
- Usar `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` fuera de `lib/google/**` (que solo se importa desde `app/api/email/**`).
- Renderizar HTML de emails recibidos con `dangerouslySetInnerHTML`: va siempre en el `<iframe sandbox>` de `VisorMensaje.tsx`.
- Exponer claves secretas en el cliente bajo ningun concepto.

### Reglas de commits
- Usar Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `perf:`, `chore:`
- El mensaje debe ser claro y especifico.
- Ejemplo: `feat: agregar validacion al formulario de registro`

## Architecture Overview

**Grand Team Bike 2026** es un sitio Next.js 15 (App Router) para inscripcion a un evento de cicloturismo en Concepcion del Uruguay, Argentina. Combina landing page publica con panel admin protegido, respaldado 100% por Supabase (Auth, Postgres y Storage).

### Tech Stack

| Tecnologia | Uso |
|---|---|
| Next.js 15 + React 19 | Framework principal (App Router) |
| Tailwind CSS v4 | Estilos con tema negro/dorado |
| shadcn/ui (new-york) | Componentes UI en `components/ui/` |
| Supabase | Base de datos principal (inscripciones, participantes, sponsors, remera, gastos, administradores) |
| Gmail API (Google OAuth2) | Envio y recepcion de emails. Reemplazo de EmailJS, sin dependencias nuevas (REST + `fetch`) |
| react-hook-form + zod | Formularios con validacion |
| framer-motion | Animaciones |
| recharts | Graficos del dashboard admin |
| Vercel Analytics | Metricas de uso |
| TypeScript strict | `ignoreBuildErrors: false` en next.config.mjs |

### Arquitectura clave

- **Todo es client-side**: Supabase se inicializa en el cliente. `"use client"` es obligatorio en componentes que usen Supabase, hooks, o estado.
- **SupabaseProvider** (`components/providers/SupabaseProvider.tsx`): contexto global que provee `user`, `session`, `userRole`, `loading`, `eventSettings`, `isSupabaseAvailable` via `useSupabaseContext()`. Incluye cache de `eventSettings` en sessionStorage (TTL 5 min). 
- **Autenticacion**: Supabase Auth (Google OAuth con implicit flow). Post-login se busca el email en tabla `administradores` de Supabase para determinar rol. Funcion RPC `link_auth_user` (SECURITY DEFINER) vincula auth_user_id automaticamente.
- **Roles**: `admin` (acceso total), `grandteam` (acceso parcial), `usuario` (sin acceso admin). Usuarios no autenticados redirigen a `/login?returnUrl=<ruta>`.
- **Admin layout**: sidebar colapsable con `AdminLayoutContext`. El sidebar es fixed en desktop (con margin en main) y overlay en movil.
- **Fuentes**: Geist (body) y Geist Mono, cargadas via `next/font/google`.
- **API Routes**: Las rutas en `app/api/` usan el cliente admin de Supabase (service_role). Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al frontend.
- **Storage**: Supabase Storage bucket `comprobantes` (publico). Subcarpetas: `remera/{dni}/{ts}`, `inscripciones/{dni}/{ts}`, `sponsors/{nombre_sanitizado}`.
- **Avatar de usuario**: Se muestra en Navbar (landing) y AdminSidebar. Usa `user.user_metadata.avatar_url` (Google OAuth) con fallback a iniciales.
- **Cache headers**: Granulares en `next.config.mjs` — API sin cache, assets estaticos 1 ano, sponsors 1 dia, paginas s-maxage=60.
- **Optimizaciones**: Dynamic import de librerias pesadas (html5-qrcode, recharts), memoizacion de navLinks/callbacks, sessionStorage cache para event_settings.

### Tablas Supabase (Principal)

```
public.administradores       -> id, auth_user_id, email, role, login_method
public.inscripciones         -> datos personales, pago, estado (tabla nueva)
public.participantes         -> nombre, apellido, dni, email, categoria, checked_in
  comprobante_nota: por que la inscripcion llego sin comprobante (vacio = todo bien).
    Lo escribe /api/inscripcion/submit y se ve en /admin/registro-inscripciones.
public.remera                -> dni, nombre, telefono, items (JSONB), estado, envio_tipo
  items = [{talle: "M", cantidad: 1}, ...]
  estado: "pendiente" | "entregado"
  envio_tipo: "retiro" | "envio"
public.content_settings      -> id (PK texto), data (JSONB)
  id puede ser: "remera" | "sponsors" | "fotos" | "contacto" | "confirmacion"
public.gastos                -> descripcion, monto, categoria, estado, aprobado_por
public.ingresos              -> descripcion, monto, categoria, estado, fecha, items (JSONB)
  items = acreditaciones que componen el ingreso ([{id, fecha, monto, nota}]), y `monto`
    es su suma. Lo usa el acumulador "Comisiones de Naranja X" (categoria 'comision');
    en un ingreso normal queda en [].
public.event_settings        -> cupo_maximo, precio, inscripciones_abiertas
public.counters              -> id, count
public.sponsors              -> nombre, nombre_comercial, descripcion, logo_url, tier (oro/plata/bronce)
  contacto: telefono, whatsapp, email, direccion, horario
  redes: instagram, facebook, website
  servicios TEXT[], activo, orden
  RLS: SELECT publico, ALL solo admin
public.emails_enviados       -> destinatarios TEXT[], asunto, plantilla, enviado_por, exito, detalle, creado_en
  Log de cada envio por Gmail API. Lo escribe lib/email/registro.ts (service_role, best-effort)
  RLS: SELECT solo admin/grandteam
public.notas_caja            -> texto, resuelta, creada_por, creada_en
  Observaciones de plata que no son gasto ni ingreso ("pagaron $700 uruguayos",
  "falta la transferencia de Lore"). Se cargan en /admin/registro-inscripciones y se
  leen en /admin/gastos y en el PDF/Excel de finanzas. Helpers en lib/notasCaja.ts.
  RLS: solo admin/grandteam (sin lectura publica: dice quien no pago)
public.sorteos               -> nombre, descripcion, total_sorteos, estado, publico, orden,
                                excluir_grupos TEXT[], excluir_participantes UUID[],
                                incluir_participantes UUID[], solo_confirmados, solo_acreditados
  Una tanda de sorteo ("Sorteo de premios", "La bici"). RLS: SELECT publico solo si publico=true,
  ALL solo admin/grandteam. El rol anon no tiene permiso sobre las columnas de exclusiones.
public.sorteo_premios        -> sorteo_id, nombre, descripcion, imagen_url, cantidad, visible, orden,
                                nivel ("principal" | "segundo" | "otro")
  nivel = jerarquia en la web (mejor premio / segundo / otros). Solo cambia como se
    MUESTRA en /sorteos; el orden en que se sortea lo sigue dando `orden`.
public.sorteo_resultados     -> sorteo_id, premio_id, premio_nombre, orden, slot, ronda, vuelta,
                                participante_id, nombre, localidad, grupo, estado, resuelto_en
  estado: "pendiente" (esperando reclamo) | "reclamado" | "no_reclamo"
  NUNCA se guarda el DNI: la persona va por participante_id y se copia nombre/localidad,
  que es lo que se anuncia en el escenario y lo que se publica en /sorteos.
public.alojamientos          -> nombre, descripcion, logo_url, website, telefono, whatsapp,
                                direccion, instagram, imagenes TEXT[], activo, orden
  imagenes = galeria de fotos extra (URLs del bucket `sponsors`, carpeta alojamientos/)
  RLS: SELECT publico, ALL solo admin/grandteam
```

### Vista previa al compartir un link (Open Graph)

Cada pagina publica tiene **su propia imagen y su propio texto**: estos links se
comparten por WhatsApp y, cuando todas mostraban la misma pieza del evento, el
de "Mi QR" se veia igual que el de la inscripcion y no se entendia cual era cual.

- Los metadatos se arman con `metadatosPagina()` (`lib/metadatosPagina.ts`) desde
  el `layout.tsx` de cada ruta: las paginas son client components y no pueden
  exportar `metadata`.
- Las imagenes viven en `public/og/` y se generan con
  `node scripts/generar-og.mjs` (negro + dorado + logo). **No se editan a
  mano**: se cambia el texto en el script.
- La de la remera es la excepcion: la pieza viene del diseño
  (`public/remera-og.png`, con la remera definitiva y el logo del sponsor) y el
  script solo la lleva a 1200x630 (`pieza:` en vez de `imagen:`). Para
  cambiarla se reemplaza ese archivo y se vuelve a correr el script.
- La home sigue con `METADATOS.png`, que es la pieza de diseño del evento.
- `e2e/vista-previa.spec.ts` verifica que cada pagina tenga texto e imagen
  propios, que la imagen exista (una vista previa rota se ve peor que ninguna) y
  que no haya dos paginas compartiendo la misma.

### Rutas Publicas

```
/                            -> Landing page (home)
/inscripcion                 -> Formulario de inscripcion (4 pasos)
/inscripcion/exito           -> Pagina de confirmacion post-inscripcion
/pedir-remera                -> Formulario publico para pedir remera del evento
/contacto                    -> Pagina de contacto
/login                       -> Login admin (Supabase Auth / Google OAuth)
/grand-team                  -> Pagina Grand Team (dashboard publico)
/sorteos                     -> Pagina unica de los sorteos: premios por jerarquia y ganadores (en vivo)
/grand-team/dashboard        -> Stats Grand Team
```

### Rutas Admin (Protegidas)

```
/admin/dashboard             -> Dashboard principal con stats y graficos
/admin/registro-inscripciones -> Listado y gestion de inscripciones
/admin/remera                -> Panel de pedidos de remeras
/admin/galeria               -> Publicacion de fotos de la seccion #galeria del sitio
/admin/settings              -> Configuracion avanzada del evento y ciclos
/admin/configuraciones       -> Configuracion legacy (puede redirigir a /admin/settings)
/admin/gastos                -> Gestion de gastos del evento
/admin/check-in              -> Check-in de participantes por QR o DNI
/admin/emails                -> Bandeja de correos (Gmail API): leer, responder y redactar
/admin/ciclos                -> Gestion de ciclos/categorias
/admin/grandteam             -> Panel especifico para rol Grand Team
/admin/sorteos               -> Sorteos: bolillero del evento + configuracion (premios, exclusiones)
/admin/sponsors              -> CRUD completo de sponsors (oro/plata/bronce) con upload de logo
/admin/alojamientos          -> CRUD de alojamientos bike friendly (logo + galeria de fotos)
```

### API Routes

```
GET  /api/remera/lookup?dni=X    -> Busca participante y pedido de remera por DNI
POST /api/remera/submit          -> Guarda/actualiza pedido de remera (UPSERT por DNI)
GET  /api/remera/settings        -> Retorna alias/datos de pago para el formulario publico
POST /api/inscripcion/submit     -> Guarda inscripcion (si se crean rutas API)
POST /api/sponsors/upload-logo   -> Sube logo de sponsor al bucket `sponsors` (cualquier imagen, max 10MB)
POST /api/galeria/upload         -> Sube foto de galeria al bucket publico `galeria` (max 6MB, jpg/png/webp/avif)
POST /api/sorteos/upload-imagen  -> Sube la foto de un premio al bucket `sponsors` (carpeta sorteos/, max 10MB)
POST /api/alojamientos/upload-imagen -> Sube foto de alojamiento al bucket `sponsors` (carpeta alojamientos/, max 10MB)

Las tres rutas del bucket `sponsors` comparten `lib/api/subirImagen.ts`.
POST /api/admin/reset-estados    -> Reset masivo: todas las inscripciones y participantes a "pendiente"

GET  /api/email/estado           -> Diagnostico de la conexion con Gmail (que variables faltan, casilla)
GET  /api/email/inbox            -> Lista hilos por carpeta (recibidos/no-leidos/enviados/archivados/papelera/todos)
GET  /api/email/thread?id=X      -> Hilo completo con cuerpos parseados y saneados (marca leido)
POST /api/email/send             -> Envia con plantilla del repo o HTML/texto propio (max 50 destinatarios)
POST /api/email/reply            -> Responde un hilo manteniendo el enhebrado
POST /api/email/acciones         -> leido / no-leido / archivar / a-recibidos / destacar / papelera
GET  /api/email/adjunto          -> Descarga un adjunto de un correo recibido

POST /api/push/subscribe         -> Registra el dispositivo del admin para notificaciones push
DELETE /api/push/subscribe       -> Da de baja el dispositivo (?endpoint=...)
POST /api/push/probar            -> Manda una notificacion de prueba a todos los dispositivos

POST /api/mi-inscripcion/reenviar-confirmacion -> Reenvio del mail de confirmacion desde /mi-qr.
  PUBLICA: solo envia si el email del body coincide con el de la inscripcion (el QR es la
  credencial de acreditacion). Exige estado confirmada y limita a 3 intentos por DNI+IP cada 10 min.
```

Las rutas `/api/email/**` exigen sesion de Supabase con rol `admin` o `grandteam`
(helper `lib/api/autorizar.ts`).

### Flujo "Pedir Remera"

1. Usuario va a `/pedir-remera` -> `RemeraSection` component
2. Click "Pedir mi remera" -> abre `RemeroFormModal`
3. Ingresa DNI (7-8 digitos) -> auto-busca via `GET /api/remera/lookup`
4. Precarga nombre/telefono del participante si esta inscripto
5. Usuario selecciona talles (XS a 5XL) + cantidades + metodo entrega + comprobante
6. Submit -> `POST /api/remera/submit` -> Supabase Storage + tabla remera
7. Admin ve el pedido en `/admin/remera` y puede cambiar estado a "entregado"

### Flujo de Inscripcion (4 pasos)

1. **PersonalInfoStep** -> datos personales, DNI, contacto emergencia. La fecha
   de nacimiento es `CampoFecha.tsx` (dia / mes / año), **no** un
   `<input type="date">`: el selector nativo no abre en el navegador de
   Instagram ni en varios Android y dejaba la inscripcion trabada en este paso.
2. **CategoryStep** -> experiencia, talla remera, datos medicos
3. **PaymentStep** -> metodo pago, referencia, comprobante. Se acepta cualquier
   archivo de cualquier tamaño y se comprime **al elegirlo** con
   `lib/inscripcion/comprobante.ts` (no al enviar, que era donde fallaba).
4. **ReviewStep** -> resumen y envio
5. -> Supabase insert + Crea registro en `participantes` con `token_qr` (UUID) + Email confirmacion con QR (EmailJS + api.qrserver.com) -> `/inscripcion/exito`

### Flujo de Check-in (dia del evento)

1. Admin va a `/admin/check-in` -> escaner QR o busqueda manual por DNI
2. Participante muestra QR recibido por email (contiene `token_qr` UUID)
3. Escaner lee el QR -> busca en `participantes` por `token_qr`
4. Si encuentra y no esta checked_in -> marca `checked_in = true`, `checked_in_at = now()`
5. Si ya esta checked_in -> muestra advertencia de duplicado
6. Busqueda manual: ingresa DNI -> busca en `participantes` por `dni`

### Flujo de Sponsors

1. Admin va a `/admin/sponsors` -> CRUD completo con filtro por tier
2. Puede crear/editar sponsor con: nombre, logo (upload), tier, contacto, redes, servicios
3. Logo se sube via `POST /api/sponsors/upload-logo` al bucket publico `sponsors`
4. Landing publica (`components/home/Sponsors.tsx`) carga sponsors activos desde Supabase con fallback a hardcoded
5. Sponsors se muestran clasificados por tier: oro, plata, bronce

### Cargar un sponsor (o una foto) no puede fallar en silencio

Misma filosofia que la inscripcion, aplicada al panel. Tres cosas que fallaban
a la vez y ninguna decia por que:

- **El bucket mandaba mas que el codigo.** `storage.buckets.sponsors` estaba en
  2 MB y solo JPG/PNG, mientras las rutas declaraban 6 MB y WEBP/AVIF: toda foto
  de celular la rechazaba el Storage y la pantalla decia "Error al subir el
  archivo". Ahora el bucket acepta 10 MB y cualquier imagen
  (`20261016_sponsors_sin_fallos.sql`). **Si se cambia un limite en una ruta,
  revisar el bucket**: manda el bucket, no el codigo.
- **Las imagenes se reducen en el dispositivo** antes de subir, con
  `lib/imagenes/prepararImagen.ts` (nunca lanza: si no puede, sube el original).
  Lo usan sponsors, alojamientos y sorteos. Los inputs son `accept="image/*"`.
- **El error siempre dice algo.** `lib/errores.ts` (`explicarError`) traduce el
  error de Supabase a una frase con el detalle real; las rutas devuelven el
  mensaje del Storage en vez de un generico. **Prohibido** un `alert` que pueda
  quedar vacio o un error que se trague el motivo.
- **Nada obligatorio bloquea el guardado**: sin nombre se guarda como "Sponsor
  sin nombre" y se corrige despues. El boton nunca esta gris por falta de datos.
  Si el guardado falla, el borrador se guarda solo (no se pierde lo cargado).
- El `insert`/`update` va con `.select()`: sin eso, una fila filtrada por RLS
  parece un guardado exitoso.

**La UI autoriza por email y la base por `auth_user_id`.** Un admin con
`administradores.auth_user_id` en NULL veia todo el panel y cada guardado le
fallaba por RLS. `SupabaseProvider` ahora llama a `link_auth_user` apenas
detecta esa diferencia, y la RPC compara emails sin distinguir mayusculas ni
espacios. Tests: `e2e/unit/cargar-sponsor.spec.ts`.

### Flujo de Alojamientos (Bike Friendly)

1. Admin va a `/admin/alojamientos` -> alta/edicion con logo + galeria de hasta 12 fotos
2. Las fotos se suben via `POST /api/alojamientos/upload-imagen` y se guardan como URLs en `alojamientos.imagenes` (TEXT[]), reordenables con flechas
3. Landing (`components/home/Alojamientos.tsx`) lista los activos en grilla; la tarjeta **no** linkea al sitio web
4. Al tocar una tarjeta se abre `components/home/AlojamientoModal.tsx` (dynamic import) con galeria, descripcion, direccion (link a Google Maps), telefono, WhatsApp, Instagram y boton "Ver sitio web"
5. Tipos y helpers compartidos en `lib/alojamientos.ts`

### Sorteos (regla importante: tiene que funcionar sin wifi)

Detalle completo en **`docs/sorteos.md`**. Dos partes: `/admin/sorteos` (pestañas
"Sortear" y "Configuracion") y `/sorteos` (premios y ganadores, publico y en vivo).

**Los sorteos viven en una sola pagina** (`/sorteos`, en el menu "Detalles"): la home ya no
tiene seccion de sorteos, porque la misma cosa se contaba dos veces y a medias.

Cada premio tiene una **jerarquia** (`sorteo_premios.nivel`: mejor premio / segundo / otros) que
el panel elige con los botones "Lugar en la web". La pagina muestra el mejor grande arriba, el
segundo abajo y el resto en grilla (`premiosPorNivel()` en `lib/sorteos.ts`). **La jerarquia no
cambia el orden en que se sortea** (eso es `orden`, las flechas del editor): asi se puede mostrar
la bici primera y sortearla al final. Hay test que lo fija.

Reglas del bolillero, todas en `lib/sorteos.ts` (puro, cubierto por `e2e/unit/sorteos.spec.ts`):

- **Nadie sale dos veces hasta que salieron todos.** Si hay mas sorteos que inscriptos, se
  reparte a todo el mundo y recien ahi arranca la ronda 2 con el bolillero lleno otra vez.
- **El que no reclama no pierde el premio**: queda en la lista de "no reclamaron" y el premio
  sin dueño. "Rehacer el sorteo de los que no reclamaron" sortea solo esos nombres, por esos
  premios; los que ya ganaron no vuelven a entrar. Se puede repescar cuantas veces haga falta.
- Cada tanda arranca de cero: salir en el sorteo de premios no saca a nadie del de la bici.
- Cada tirada resuelve un **slot** (puesto 1..total_sorteos) y vale el ultimo resultado de ese
  slot. Es lo que garantiza que ningun premio se pierda al repescar en cualquier orden.

**Sin internet** (`lib/sorteosLocal.ts`): el dia del evento no hay wifi. Al abrir el panel con
conexion se precarga todo (sorteos, premios, resultados e inscriptos) en el dispositivo; despues
el azar se tira en el telefono y cada tirada se guarda local con su UUID y se sube sola al volver
la señal (upsert: reintentar no duplica). `/admin/sorteos` es la **unica** ruta de /admin que el
Service Worker cachea (`IGUAL_SE_GUARDA` en `public/sw.js`), para que la pantalla abra sin red.
**Prohibido** agregar al bolillero algo que necesite servidor en el momento (una RPC para sortear,
validaciones online): el sorteo se hace en el escenario, sin señal.

### Flujo de Correos (Gmail API)

Setup completo en **`docs/gmail-setup.md`** (Cloud Console, scopes, refresh token, Vercel).

1. **Auth**: `lib/google/oauth.ts` canjea `GOOGLE_REFRESH_TOKEN` por access tokens (cache en memoria del proceso, renovacion 2 min antes de expirar, reintento unico ante 401).
2. **Cliente**: `lib/google/gmail.ts` habla con la REST API de Gmail via `fetch` (sin SDK). `lib/google/mime.ts` arma los mensajes RFC 5322 (UTF-8 con encoded-word, multipart/alternative, adjuntos).
3. **Plantillas**: `lib/email/templates.ts` — `confirmacion` (con QR), `rechazo`, `generico`. Antes vivian en EmailJS; ahora el HTML esta versionado en el repo. Layout con tablas y estilos inline, imagenes con URL absoluta (`/email/logo.png`, `/email/grandteam.png`).
4. **Envio desde el panel**: `lib/emailService.ts` mantiene la firma vieja (`sendConfirmationEmail`, `sendRejectionEmail`, ...) pero ahora hace POST a `/api/email/send` con el token de la sesion.
5. **Bandeja**: `/admin/emails` lista hilos, abre conversaciones, responde enhebrado, archiva/manda a papelera y permite redactar (uno o varios destinatarios, con envio individual).
6. **Seguridad del HTML entrante**: doble capa — `sanearHtmlEmail()` en el servidor + `<iframe sandbox="">` con CSP propia en `components/admin/emails/VisorMensaje.tsx`.
7. **Scopes**: `gmail.modify` + `gmail.send`. La app OAuth debe estar **publicada** (no en modo Testing) o el refresh token caduca cada 7 dias.

Limite practico: Gmail gratuito permite ~500 destinatarios por dia; `/api/email/send` corta en 50 por request.

### Quien ya esta inscripto no vuelve a llenar el formulario

Si alguien escribe en `/inscripcion` un DNI que ya tiene inscripcion **vigente**
de esta edicion (pendiente o confirmada), `GET /api/lookup-participant`
devuelve `yaInscripto: true` con el estado y el nombre, **y `data: null`**:

- No se precarga nada y se abre `ModalYaInscripto`, que dice como esta la
  inscripcion y lleva a `/mi-qr?dni=...` (con cuenta regresiva de 6 segundos, o
  tocando el boton). Ahi se ve el estado y se descarga el QR.
- Volver a llenar el formulario **pisaria** la inscripcion que el equipo ya
  reviso: el alta es un UPSERT por DNI.
- Los datos personales no viajan al navegador: antes, con solo saber un DNI
  cualquiera veia nombre, email, telefono y datos medicos de esa persona.
- Queda el boton "Inscribir a otra persona", que limpia el DNI y sigue.

Si la inscripcion de esta edicion esta **rechazada**, o si la persona solo
existe de ediciones anteriores, los datos **si** vuelven y el formulario se
autocompleta como siempre.

`/mi-qr` acepta `?dni=` y busca sola al abrir, asi la persona no tiene que
volver a escribirlo. Sus metadatos propios estan en `app/mi-qr/layout.tsx`
(la pagina es client component y no puede exportar `metadata`).

**Reenvio de la confirmacion** (dos caminos):
- **Admin** (`/admin/registro-inscripciones`, modal de detalle): el email es editable y el boton
  "Reenviar confirmacion" pasa a "Corregir y reenviar" cuando se modifica. Guarda el email nuevo en
  `participantes` y recien despues envia, para que base y mail no digan cosas distintas. Solo
  habilitado si la inscripcion esta confirmada.
- **Participante** (`/mi-qr`): formulario bajo el QR. Solo se envia a la direccion que ya figura en
  la inscripcion — nunca a una cualquiera — porque el QR es la credencial de acreditacion.
  El bloque de remera se recalcula en cada reenvio, asi que refleja el estado actual del pedido.

### Notificaciones de inscripcion nueva

Detalle completo en **`docs/notificaciones.md`**. Tres vias, todas implementadas:

1. **En el panel**: el canal realtime de `/admin/registro-inscripciones` detecta el INSERT, muestra un aviso flotante y hace sonar un pitido (`lib/sonidoAviso.ts`, WebAudio, sin assets).
2. **Notificacion del navegador**: si hay permiso y la pestaña no esta visible.
3. **Push al celular** (funciona con el sitio cerrado): Service Worker en `public/sw.js`, claves VAPID, suscripciones en `public.push_subscriptions` y envio con `web-push` desde `lib/push/enviar.ts`. Lo dispara `POST /api/inscripcion/submit` via `lib/push/inscripcion.ts`.

El mensaje incluye **cuanta plata deberia haber en Naranja X** contando esa transferencia (`lib/finanzas/saldoEsperado.ts`): (confirmadas cobradas + ingresos cobrados − gastos pagados) + el precio de esa inscripcion. Las pendientes viejas **no** se suman: son transferencias sin verificar y harian crecer el numero con plata que quiza nunca entro. El `verificado` coincide con la calculadora de caja de `/admin/gastos` en sus valores por defecto.

Se activa por dispositivo desde el boton del panel. En iPhone requiere instalar el sitio como app (iOS 16.4+). Las claves VAPID **no se regeneran**: si cambian, hay que reactivar en cada dispositivo.

### Borradores de formularios (no perder lo cargado)

Cerrar una pestaña o un modal sin querer no borra lo que se estaba cargando. El hook
`hooks/useBorradorFormulario.ts` autoguarda el formulario en localStorage (claves
`gtb-borrador:<entidad>:<id|nuevo>`, vencen a los 7 dias), avisa con `beforeunload` si
hay cambios sin guardar y expone el borrador encontrado al abrir. La UI compartida son
`components/admin/BannerBorrador.tsx` (Retomar / Empezar de cero, igual que la
inscripcion publica) y `components/admin/DialogoSalirSinGuardar.tsx` (Guardar borrador y
salir / Seguir editando / Descartar).

Lo usan: `/admin/sponsors` (los tres tiers comparten el mismo modal),
`/admin/alojamientos`, el modal de redactar de `/admin/emails` y los modales de gasto e
ingreso de `/admin/gastos`. Las listas de sponsors y alojamientos marcan con un badge las
fichas que tienen borrador pendiente, y ofrecen "Retomar carga" si quedo uno nuevo a
medio cargar. `/inscripcion` y `/pedir-remera` ya tenian su propio borrador (anterior al
hook) y siguen con el suyo.

No se guardan los `File` (comprobantes, imagenes sin subir): no son serializables. Las
imagenes ya subidas si vuelven, porque en el borrador viaja la URL.

### La inscripcion no puede fallar (regla importante)

Detalle completo en **`docs/inscripcion-sin-errores.md`**. Nadie puede quedarse
sin inscribirse por un problema tecnico, despues de haber cargado cuatro pasos
de datos:

- **Comprobante**: cualquier formato y cualquier peso. Las fotos se reducen en el
  telefono (`lib/inscripcion/comprobante.ts`, que **nunca lanza**). Lo que no se
  puede subir (un PDF enorme, un HEIC que no decodifica) no frena nada: la
  inscripcion entra y el motivo queda en `participantes.comprobante_nota`, que el
  panel muestra como "Falta comprobante".
- **Sin internet / servidor caido**: `lib/inscripcion/envio.ts` guarda la
  inscripcion en IndexedDB y la reintenta sola (al volver la conexion, al abrir
  el sitio y cada 30 s). El alta es un UPSERT por DNI: reintentar no duplica. La
  confirmacion se muestra **en la misma pantalla**, porque sin red no se puede
  cargar otra pagina.
- **Servidor tolerante**: solo el DNI y el nombre son obligatorios. Un email con
  typo, un pais fuera de la lista o un grupo sanguineo raro se normalizan en vez
  de devolver "Datos invalidos".
- **Prohibido** agregar validaciones que rechacen el envio (limites de tamaño,
  formatos, campos "obligatorios" nuevos) sin dejar un camino por el que la
  inscripcion igual se guarde.
- **Falta un dato**: nunca un cartel que se va solo ni un boton gris. Se abre
  `ModalFaltantes` con que falta (nombre de pantalla + ayuda) y al tocarlo la
  pantalla lleva al campo y lo marca (`lib/foco.ts`, clase `.gt-resaltado`).
  Un campo nuevo obligatorio se agrega a `camposFaltantes()` en
  `app/inscripcion/page.tsx`, con su `id` y su linea de ayuda.
- **Version del sitio** (`NEXT_PUBLIC_BUILD_ID`): sale del commit, nunca de la
  fecha. Con la fecha, un build que cruzaba un cambio de minuto dejaba al
  navegador y al servidor con versiones distintas y el cartel "Hicimos
  actualizaciones" aparecia sin motivo.

### Errores del cliente

Detalle en **`docs/errores-cliente.md`**. Hay error boundaries propios
(`app/error.tsx`, `app/global-error.tsx`, UI en `components/ErrorPantalla.tsx`): muestran
el mensaje real del error en pantalla (se puede leer desde un celular) en vez del cartel
generico de Vercel. Ante un `ChunkLoadError` se recuperan solos: vuelven a bajar los
archivos JS que fallaron con `fetch(url, { cache: "reload" })` — unica forma de
sobrescribir la cache HTTP, que para `/_next/static` es `immutable` — y recargan una vez
por pestaña.

### La cuenta del evento: Naranja X (antes BNA)

El nombre de la cuenta **no se escribe suelto en ningun archivo**: sale de
`lib/finanzas/cuenta.ts` (`CUENTA = "Naranja X"`, `ETIQUETA_PLATA = "Plata en Naranja X"`).
Lo usan la tarjeta de `/admin/gastos`, la calculadora de caja, el dashboard
(`SeccionPlata`), el PDF/Excel de finanzas y los push de inscripcion nueva
(`lib/push/inscripcion.ts`, `/api/push/probar`). Si la cuenta vuelve a cambiar se toca
**solo esa constante**, y todas las pantallas dicen lo mismo.

### Comisiones de Naranja X (un ingreso con muchos dias adentro)

Naranja X acredita comision cada tanto y de a montos chicos. Un ingreso por acreditacion
dejaba la lista de finanzas llena de filas de $300 que tapaban los sponsors, asi que es
**un solo ingreso acumulador**: `ingresos.categoria = 'comision'` y cada acreditacion es
un item de `ingresos.items` (JSONB: `[{id, fecha, monto, nota}]`,
`20261018_comisiones_naranja_x.sql`).

- `ingresos.monto` se guarda **siempre igual a la suma de los items** (lo hace la tarjeta
  al agregar o borrar uno), asi que la calculadora de caja, el saldo esperado del push y
  los totales no necesitan saber nada de esto. `mapIngreso` igual deriva el total de los
  items, para que un monto desincronizado no pueda mentir.
- Se carga en `/admin/gastos`, en la tarjeta "Comisiones de Naranja X"
  (`ComisionesNaranja.tsx`) que esta **siempre a la vista**, abajo de la lista de
  movimientos: fecha + monto + nota opcional, con el historial debajo. Estuvo un rato
  dentro de la vista "Ingresos" y ahi no se encontraba: quedaba detras de Filtros -> Vista.
- El campo de monto **arranca con el de la ultima comision** (`ultimaComision()` +
  `montoParaInput()`): casi siempre acreditan lo mismo, asi que se guarda sin escribir
  nada, y si cambio se edita. El estado del input es `string | null`, donde null significa
  "todavia no lo toco" (y por eso vuelve a null despues de guardar).
- La **calculadora de caja** (`CalculadoraCaja.tsx`) esta **comentada** en
  `app/admin/gastos/page.tsx` desde el 18/10/2026, a pedido. El componente y sus criterios
  siguen intactos (son los que replica `lib/finanzas/saldoEsperado.ts`): para volver a
  mostrarla se descomenta el bloque y su import.
- En la grilla de ingresos ese acumulador **no se edita ni se borra** (un clic se llevaria
  todas las comisiones): se tocan item por item desde la tarjeta.
- **En el PDF va una sola fila**: el total y desde cuando ("desde el 12/10/2026,
  8 acreditaciones"). El dia por dia esta en el panel y en la hoja "Comisiones" del Excel.
- Logica pura en `lib/finanzas/comisiones.ts` (test: `e2e/unit/comisiones.spec.ts`). Las
  fechas se formatean sin `new Date`: el Date de `"2026-10-18"` es medianoche UTC y en
  Argentina mostraba el 17.

### PDF de finanzas y PDF de la estimacion

Son dos informes con la misma estetica (fondo oscuro + tarjetas de color, calcada de la
web): `exportFinanzas.ts` (lo que paso de verdad) y `exportEstimacion.ts` (la proyeccion
del estimador de inscriptos). El estilo compartido vive en `pdfEstilo.ts` — paleta,
cabecera, tarjetas, estilo de tabla, titulos de seccion —; **ningun informe nuevo redefine
colores ni vuelve a dibujar tarjetas**.

- La cuenta de la estimacion es `lib/finanzas/estimacion.ts` (pura, con test). **La misma
  funcion la usan la tarjeta en pantalla y el PDF**: antes de separarla, el PDF podia
  decir otro numero que la pantalla desde la que se descargo.
- El boton "PDF de esta cantidad" pregunta si hay que **tener en cuenta las inscripciones
  gratis**: no pagan (salen de lo que entra) pero igual comen y llevan remera (siguen en
  los gastos por participante). Si no hay ninguna gratis cargada, no pregunta nada. El
  criterio elegido **queda escrito en el PDF**, para que un mes despues se entienda de
  donde salio el numero.
- Los dos informes separan `armar...PDF` (devuelve el `doc`) de `exportar...PDF` (lo
  guarda), para poder generarlos en un test: `e2e/unit/pdf-finanzas.spec.ts` los arma con
  datos de ejemplo y verifica que no exploten (incluido el caso "evento recien arrancado",
  sin gastos ni ingresos).
- `jspdf` se importa **nombrado** (`const { jsPDF } = await import("jspdf")`), no por
  `default`: con el default, el mismo codigo que anda en el navegador tira "jsPDF is not a
  constructor" en Node y no se puede testear.

### Un gasto dice "Pagado" o "Por pagar" (no "Aprobado")

En la lista de gastos **estan aprobados todos**: la columna que decia "Aprobado" no
informaba nada, y al lado habia un segundo badge "Aún no se pagó" diciendo lo mismo al
revés. Ahora el estado de un gasto se lee como el de un ingreso ("Cobrado" / "Por
cobrar"): **Pagado** (verde) o **Por pagar** (naranja); los que todavia no se aprobaron
siguen como "Pendiente" y los rechazados como "Rechazado".

- Sale de `estadoGastoVisible()` en `app/admin/gastos/tipos.ts` (texto + tono + clave de
  filtro) y los colores de `CLASE_BADGE`. Lo usan la grilla de gastos, el modal de
  detalle, la vista de Movimientos (via `estadoMovimiento()`) y el PDF/Excel.
- El filtro de Movimientos filtra por "Pagado" / "Por pagar" en vez de por "Aprobado".
- En el PDF y el Excel hay **una sola** columna de estado: la de "Pago" se fue, porque
  repetia la misma informacion.

### Plata de las inscripciones (regla importante)

**Nunca calcular los ingresos como `confirmados * precio`.** Confirmar no es cobrar:
hay confirmados marcados "falta pagar" y otros que pagaron un monto distinto. La plata
sale siempre de `participantes.pago_estado` + `participantes.monto_pagado`:

- `pago_estado = 'pagado'` -> suma `monto_pagado` (o el precio de lista si es NULL, que es
  como quedaron las inscripciones viejas).
- `pago_estado = 'pendiente'` -> suma 0 (y se cuenta aparte como "falta cobrar").
- `pago_estado = 'gratis'` -> suma 0 y no se espera que pague.
- `pago_estado = 'otro'` -> **pago que no entro a la caja**: pago en otra moneda, o le
  transfirio a alguien del equipo. Suma 0 hasta que se lo pase a 'pagado'. La aclaracion
  va en `pago_nota` ("Pago 700 uruguayos, Lore nos transfiere esa plata") y se ve en el
  badge de la grilla, en el modal, en finanzas y en los exports.

Las listas de nombres (quienes no pagaron, quienes pagaron otro monto) **no se escriben
en la fila**: la fila dice la cantidad y los nombres se abren con el boton "ver"
(`app/admin/gastos/ListaModal.tsx`, y el modal de lista en el registro de inscripciones).

Helpers: `montoCobrado()` (lo que entro) y `montoEsperado()` (lo que deberia entrar) en
`app/admin/gastos/tipos.ts`. El desglose (`DesglosePagos`: precio de lista / otro monto /
sin pagar / gratis) lo calcula `useFinanzas` y lo muestran la tarjeta de Ingresos, la
calculadora de caja, la vista de Movimientos y el PDF/Excel. En
`/admin/registro-inscripciones` el mismo desglose son las 4 tarjetas de pagos, y en el
push de inscripcion nueva lo usa `lib/finanzas/saldoEsperado.ts`.

**Las tarjetas del registro hablan de plata, no de estados.** Son **4 y entran en una
sola fila**: Total, **Pagadas**, **Faltan pagar** y **Gratis**. Eran 9 en tres paginas de
carrusel (4 de estado + 5 de pago) y las de estado no decian nada: "Confirmadas" era casi
el total, "Rechazadas" casi siempre 0, y lo que se mira es quien pago. Las dos de pagos
raros ("Pagaron otro monto", "Pago de otra forma") **aparecen solo si hay alguno**, y
recien ahi se arma una segunda pagina con sus puntos y flechas. El estado de la
inscripcion sigue estando en el badge de cada fila y en el filtro.

### Dashboard Admin

`/admin/dashboard` tiene tres secciones, y todas se calculan sobre **todas** las filas de la
edicion (la version vieja pedia conteos sueltos y las ultimas 5 inscripciones, y dibujaba los
graficos de "todo el evento" con esas 5 filas: los grupos, las localidades y el acumulado nunca
coincidian con el registro).

1. **Plata** (`SeccionPlata.tsx`): usa el mismo `useFinanzas` de `/admin/gastos`, asi que los dos
   paneles dicen siempre lo mismo. Lo cobrado, gastos aprobados/pagados/sin pagar, plata en banco,
   balance, como pagaron los confirmados (desglose con nombres en modal), gastos por categoria,
   costo por confirmado y notas de caja sin resolver.
2. **Inscripciones y gente** (`SeccionGente.tsx`): estado y ocupacion del cupo, acreditados, salud
   (celiacos, problemas de salud, alergias, menores de edad, sin grupo sanguineo, sin experiencia),
   grupos ciclistas con sus integrantes, procedencia (paises y localidades), edades y grupos
   sanguineos. Selector de alcance: todos los que van al evento, o solo los confirmados.
3. **Ritmo, remeras y ultimas altas** (`SeccionExtra.tsx`): inscripciones de los ultimos 7 dias,
   promedio por dia, dia record, dias sin inscripciones, y los pedidos de remera desglosados por
   talle (lo que hay que encargar), retiro vs envio y comprobantes.

El calculo vive en `panorama.ts` (puro, sin Supabase) y la carga en `usePanorama.ts` (realtime
sobre `participantes` y `remera`). Los graficos (`GraficosPlata.tsx`, `GraficosGente.tsx`) van por
dynamic import porque recharts es la libreria mas pesada del panel.

Reglas del dashboard:
- Localidades y grupos se agrupan ignorando acentos y mayusculas: los datos se cargan a mano y
  "CONCORDIA"/"Concordia" o "Paysandu"/"Paysandú" son lo mismo. Sin eso, 32 localidades crudas se
  mostraban como 32 cuando son 19.
- Las listas de nombres van siempre en `ListaModal`, nunca escritas en la fila.
- Un grafico, una unidad: no mezclar pesos con cantidad de personas en el mismo eje.
- Fecha de nacimiento que no da una edad creible (3 a 100 anios) no se cuenta en edades ni en
  menores: se avisa aparte para corregirla en el registro.
- Precio de entrada editable inline en la cabecera (se guarda en `event_settings.precio` e invalida
  el cache de sessionStorage del provider).

### Acceso a Supabase Management API (SQL directo)

- El usuario provee un Personal Access Token de Supabase (`sbp_...`) para que Claude pueda ejecutar SQL directo contra la base cuando haga falta (fixes de datos puntuales, diagnosticos).
- **El token NUNCA se guarda en este archivo ni en ningun archivo trackeado por git.** Vive solo en `.env.local` (gitignorado) como `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`.
- Los PAT de Supabase vencen a los 90 dias: si `SUPABASE_ACCESS_TOKEN` no esta en `.env.local` o esta vencido, pedirle uno nuevo al usuario en vez de asumir que sigue vigente. La fecha de vencimiento del token actual queda como comentario al lado de la variable en `.env.local`.
- Para ejecutar SQL: `POST https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query` con header `Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}` y body `{"query": "..."}`.
- Cualquier cambio de datos en produccion vía este canal debe reflejarse despues en una migracion dentro de `supabase/migrations/` (sin el token) para que el repo documente el estado real de la base.

### Numeracion de Inscripciones (numero_inscripcion)

- Solo las inscripciones **confirmadas** tienen numero (se asigna con la RPC `assign_inscription_number` al confirmar, se libera con `release_inscription_number` al revertir).
- Desde `20260921_compactar_numero_inscripcion.sql`, `release_inscription_number` **compacta automáticamente**: al liberar un numero, corre un lugar hacia abajo a todos los confirmados con numero mayor. Esto garantiza que la secuencia de confirmados de cada edicion sea siempre `1..N` sin huecos, sin importar cuantas altas/bajas haya.
- En el panel admin (`/admin/registro-inscripciones`, modal de detalle) hay un campo para editar el numero a mano por si hace falta una correccion puntual — no reenvia el mail de confirmacion.

### Talles de Remera Disponibles

`["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]`

### Convenciones Clave

- Path alias `@/` -> raiz del proyecto
- shadcn/ui: agregar con `npx shadcn@latest add <componente>`
- Iconos: lucide-react
- Dominio: **`https://grand-team.vercel.app`** (en layout.tsx metadata). El
  dominio propio `grandteambike.com.ar` **no existe en el DNS** (`nslookup` da
  "Non-existent domain"): no usarlo en links, emails ni metadatos.
- Busqueda por DNI: auto-trigger al detectar 7-8 digitos (sin guiones ni espacios)
- UPSERT por DNI: pedidos de remera se actualizan si ya existe el DNI
- Comprobantes: se convierten a base64 en el cliente, luego se suben como archivo en la API route

### Variables de Entorno (.env.local)

```
GOOGLE_CLIENT_ID                       # Cliente OAuth de Google Cloud Console
GOOGLE_CLIENT_SECRET                   # SECRETO. Solo servidor (lib/google/**)
GOOGLE_REFRESH_TOKEN                   # SECRETO. Se genera con `npm run gmail:auth`
GMAIL_SENDER                           # Casilla que envia y cuya bandeja se lee
GMAIL_SENDER_NAME                      # Nombre visible del remitente (default "Grand Team Bike")
NEXT_PUBLIC_VAPID_PUBLIC_KEY           # Clave publica de Web Push (la usa el navegador)
VAPID_PRIVATE_KEY                      # SECRETA. Solo servidor. No regenerar (ver docs/notificaciones.md)
VAPID_SUBJECT                          # mailto: de contacto para los push services
NEXT_PUBLIC_EMAILJS_SERVICE_ID         # LEGACY: ya no se usa (migrado a Gmail API)
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID        # LEGACY
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY         # LEGACY
NEXT_PUBLIC_SITE_URL                   # opcional, default https://grand-team.vercel.app
NEXT_PUBLIC_SUPABASE_URL               # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY          # Clave publica (anon) de Supabase
SUPABASE_SERVICE_ROLE_KEY              # Solo en servidor (API routes). NUNCA exponer al cliente
```

## Reglas de Workflow

- **Push en cada cambio**: Hacer commit y push despues de cada cambio completado.
- **Build antes de commit**: Siempre ejecutar `npm run build` antes de commitear.
- **Actualizar CLAUDE.md**: Mantener este archivo actualizado con cambios significativos.

## Datos Migrados desde Firestore (historico)

- 271 inscripciones migradas desde Firestore. Los campos `nombres` y `apellidos` fueron reparados (estaban vacios, se extrajeron del campo `id`).
- Participantes migrados con sus datos de check-in.
- Administradores, gastos, event_settings y counters migrados.
- El proyecto **ya no contiene codigo ni dependencias de Firebase**. Los datos originales siguen existiendo en Firebase pero el sitio no los consulta.
- Sponsors hardcodeados migrados a tabla Supabase via SQL seed.

## Recordatorio Final
Responder SIEMPRE en espanol. Esta es la regla mas importante del archivo.
