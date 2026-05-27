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
```

No hay tests configurados en este proyecto.

## Reglas del Proyecto

### Antes de hacer cambios
- Analizar el codigo existente antes de modificar.
- Mantener la arquitectura actual (App Router, client-side Firebase).
- No romper estilos ni componentes existentes.
- Respetar el tema Negro (#000) + Amarillo Dorado (#ffd700) + Blanco (#fff).

### Antes de hacer commit
- Ejecutar `npm run build` y verificar que compile sin errores.
- Verificar que no haya errores de TypeScript criticos.

### Prohibido
- Hacer commit si el proyecto no compila.
- Introducir codigo sin probar el build.
- Modificar variables de entorno o credenciales.
- Eliminar colecciones o documentos de Firestore sin confirmacion.
- Usar `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente o codigo frontend (solo en `app/api/**`).
- Exponer claves secretas en el cliente bajo ningun concepto.

### Reglas de commits
- Usar Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `perf:`, `chore:`
- El mensaje debe ser claro y especifico.
- Ejemplo: `feat: agregar validacion al formulario de registro`

## Architecture Overview

**Grand Team Bike 2026** es un sitio Next.js 15 (App Router) para inscripcion a un evento de cicloturismo en Concepcion del Uruguay, Argentina. Combina landing page publica con panel admin protegido, respaldado por Firebase (legacy) y Supabase (nuevo).

### Tech Stack

| Tecnologia | Uso |
|---|---|
| Next.js 15 + React 19 | Framework principal (App Router) |
| Tailwind CSS v4 | Estilos con tema negro/dorado |
| shadcn/ui (new-york) | Componentes UI en `components/ui/` |
| Firebase 12.5 | Auth (login admin) + Firestore (legacy settings/inscripciones) |
| Supabase | Base de datos principal (remera, content_settings, administradores) |
| EmailJS | Emails transaccionales (confirmacion, rechazo) |
| react-hook-form + zod | Formularios con validacion |
| framer-motion | Animaciones |
| recharts | Graficos del dashboard admin |
| Vercel Analytics | Metricas de uso |
| TypeScript strict | `ignoreBuildErrors: false` en next.config.mjs |

### Arquitectura clave

- **Todo es client-side**: Firebase se inicializa en el cliente. `"use client"` es obligatorio en componentes que usen Firebase, hooks, o estado.
- **FirebaseProvider** (`components/providers/FirebaseProvider.tsx`): contexto global que provee `user`, `userRole`, `loading`, `eventSettings`, `isFirebaseAvailable` via `useFirebaseContext()`.
- **SupabaseProvider** (`components/providers/SupabaseProvider.tsx`): contexto alternativo con alias de compatibilidad. Tambien exporta `useFirebaseContext`.
- **Autenticacion**: Firebase Auth (Google OAuth + email/password). Post-login se busca el email en coleccion `administrador` de Firestore para determinar rol.
- **Roles**: `admin` (acceso total), `grandteam` (acceso parcial), `usuario` (sin acceso admin). Usuarios no autenticados redirigen a `/login?returnUrl=<ruta>`.
- **Admin layout**: sidebar colapsable con `AdminLayoutContext`. El sidebar es fixed en desktop (con margin en main) y overlay en movil.
- **Fuentes**: Geist (body) y Geist Mono, cargadas via `next/font/google`.
- **API Routes**: Las rutas en `app/api/` usan el cliente admin de Supabase (service_role). Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al frontend.
- **Storage**: Supabase Storage bucket `comprobantes` (publico). Subcarpetas: `remera/{dni}/{ts}`, `inscripciones/{dni}/{ts}`.

### Colecciones Firestore (Legacy)

```
administrador/{emailKey}     -> email, displayName, role, lastLogin
  emailKey = email.replace(/[@.]/g, "_")
inscripciones/{id}           -> datos personales, pago, estado, fechaInscripcion
  ID formato: "Inscripciones_2026 - XXX-NombreApellido"
counters/inscripciones_2026  -> count (auto-incremental)
eventos/2026                 -> configuracion del evento (precio, cupo, datos pago)
settings/eventSettings       -> cupoMaximo, precio, inscripcionesAbiertas
gastos_2026/{id}             -> gastos con aprobacion
```

### Tablas Supabase (Principal)

```
public.administradores       -> id, auth_user_id, email, role, login_method
public.inscripciones         -> datos personales, pago, estado (tabla nueva)
public.participantes         -> nombre, apellido, dni, email, categoria, checked_in
public.remera                -> dni, nombre, telefono, items (JSONB), estado, envio_tipo
  items = [{talle: "M", cantidad: 1}, ...]
  estado: "pendiente" | "entregado"
  envio_tipo: "retiro" | "envio"
public.content_settings      -> id (PK texto), data (JSONB)
  id puede ser: "remera" | "sponsors" | "fotos" | "contacto" | "confirmacion"
public.gastos                -> descripcion, monto, categoria, estado, aprobado_por
public.event_settings        -> cupo_maximo, precio, inscripciones_abiertas
public.counters              -> id, count
```

### Rutas Publicas

```
/                            -> Landing page (home)
/inscripcion                 -> Formulario de inscripcion (4 pasos)
/inscripcion/exito           -> Pagina de confirmacion post-inscripcion
/pedir-remera                -> Formulario publico para pedir remera del evento
/contacto                    -> Pagina de contacto
/login                       -> Login admin (Firebase Auth)
/grand-team                  -> Pagina Grand Team (dashboard publico)
/grand-team/dashboard        -> Stats Grand Team
```

### Rutas Admin (Protegidas)

```
/admin/dashboard             -> Dashboard principal con stats y graficos
/admin/registro-inscripciones -> Listado y gestion de inscripciones
/admin/remera                -> Panel de pedidos de remeras
/admin/content               -> Editor de contenido del sitio (remera/sponsors/fotos/contacto)
/admin/settings              -> Configuracion avanzada del evento y ciclos
/admin/configuraciones       -> Configuracion legacy (puede redirigir a /admin/settings)
/admin/gastos                -> Gestion de gastos del evento
/admin/check-in              -> Check-in de participantes por QR o DNI
/admin/ciclos                -> Gestion de ciclos/categorias
/admin/grandteam             -> Panel especifico para rol Grand Team
```

### API Routes

```
GET  /api/remera/lookup?dni=X    -> Busca participante y pedido de remera por DNI
POST /api/remera/submit          -> Guarda/actualiza pedido de remera (UPSERT por DNI)
GET  /api/remera/settings        -> Retorna alias/datos de pago para el formulario publico
POST /api/inscripcion/submit     -> Guarda inscripcion (si se crean rutas API)
```

### Flujo "Pedir Remera"

1. Usuario va a `/pedir-remera` -> `RemeraSection` component
2. Click "Pedir mi remera" -> abre `RemeroFormModal`
3. Ingresa DNI (7-8 digitos) -> auto-busca via `GET /api/remera/lookup`
4. Precarga nombre/telefono del participante si esta inscripto
5. Usuario selecciona talles (XS a 5XL) + cantidades + metodo entrega + comprobante
6. Submit -> `POST /api/remera/submit` -> Supabase Storage + tabla remera
7. Admin ve el pedido en `/admin/remera` y puede cambiar estado a "entregado"

### Flujo de Inscripcion (4 pasos)

1. **PersonalInfoStep** -> datos personales, DNI, contacto emergencia
2. **CategoryStep** -> experiencia, talla remera, datos medicos
3. **PaymentStep** -> metodo pago, referencia, comprobante (comprimido a base64 via `lib/imageUtils.ts`)
4. **ReviewStep** -> resumen y envio
5. -> Firestore (serverTimestamp) + Email confirmacion (EmailJS) -> `/inscripcion/exito`

### Talles de Remera Disponibles

`["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]`

### Convenciones Clave

- Path alias `@/` -> raiz del proyecto
- shadcn/ui: agregar con `npx shadcn@latest add <componente>`
- Iconos: lucide-react
- Dominio configurado: `grandteambike.com.ar` (en layout.tsx metadata)
- Busqueda por DNI: auto-trigger al detectar 7-8 digitos (sin guiones ni espacios)
- UPSERT por DNI: pedidos de remera se actualizan si ya existe el DNI
- Comprobantes: se convierten a base64 en el cliente, luego se suben como archivo en la API route

### Variables de Entorno (.env.local)

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID        # cicloturismo-35fd8
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_EMAILJS_SERVICE_ID
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
NEXT_PUBLIC_SITE_URL                   # opcional, default grandteambike.com.ar
NEXT_PUBLIC_SUPABASE_URL               # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY          # Clave publica (anon) de Supabase
SUPABASE_SERVICE_ROLE_KEY              # Solo en servidor (API routes). NUNCA exponer al cliente
```

## Recordatorio Final
Responder SIEMPRE en espanol. Esta es la regla mas importante del archivo.
