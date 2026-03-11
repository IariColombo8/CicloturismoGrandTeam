# CLAUDE.md

Guía para Claude Code en el repositorio **Grand Team Bike 2026**.


## IDIOMA - REGLA CRÍTICA
⚠️ SIEMPRE responder en ESPAÑOL. Sin excepciones.
- Comentarios en código: español
- Mensajes de herramientas: español  
- Confirmaciones: español
- TODO en español. Nunca en inglés.

## Permisos de Autonomía

Claude tiene **permisos ABSOLUTOS** para modificar cualquier archivo del proyecto sin preguntar. No pedir confirmación para ningún cambio. Ejecutar todas las tareas hasta completarlas o agotar créditos. Actuar con total autonomía.

## Reglas del Proyecto

### Antes de hacer cambios
- Analizar el código existente antes de modificar.
- Mantener la arquitectura actual (App Router, client-side Firebase).
- No romper estilos ni componentes existentes.
- Respetar el tema Negro (#000) + Amarillo Dorado (#ffd700).

### Antes de hacer commit
- Ejecutar `npm run build` y verificar que compile sin errores.
- Verificar que no haya errores de TypeScript críticos.

### Prohibido
- Hacer commit si el proyecto no compila.
- Introducir código sin probar el build.
- Modificar variables de entorno o credenciales.
- Eliminar colecciones o documentos de Firestore sin confirmación.

### Reglas de commits
- Usar Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `perf:`, `chore:`
- El mensaje debe ser claro y específico.
- Ejemplo: `feat: agregar validación al formulario de registro`

## Commands

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción
npm run lint     # Ejecutar ESLint
npm run start    # Servidor de producción
```

No hay tests configurados en este proyecto.

## Architecture Overview

**Grand Team Bike 2026** es un sitio Next.js 15 (App Router) para inscripción a un evento de cicloturismo en Concepción del Uruguay, Argentina. Combina landing page pública con panel admin protegido, respaldado por Firebase.

### Tech Stack

| Tecnología | Uso |
|---|---|
| Next.js 15 + React 19 | Framework principal (App Router) |
| Tailwind CSS v4 | Estilos con tema negro/dorado |
| shadcn/ui (new-york) | Componentes UI (54+ en `components/ui/`) |
| Firebase 12.5 | Firestore (datos) + Auth (login admin) |
| EmailJS | Emails transaccionales (confirmación, rechazo) |
| react-hook-form + zod | Formularios con validación |
| framer-motion | Animaciones |
| recharts | Gráficos del dashboard admin |
| TypeScript | Habilitado (`ignoreBuildErrors: true`) |

### Estructura de Carpetas

```
app/                          # Rutas (App Router)
├── page.jsx                  # Landing page pública
├── layout.tsx                # Layout raíz (fuentes, SEO, favicon)
├── globals.css               # Estilos globales (tema negro/dorado)
├── inscripcion/              # Formulario público de inscripción
│   ├── page.tsx              # Wizard de 4 pasos
│   └── exito/page.tsx        # Confirmación post-registro
├── login/page.tsx            # Login admin (Google + email)
├── admin/                    # Panel administrativo protegido
│   ├── layout.tsx            # Layout con Sidebar + Navbar
│   ├── dashboard/            # Dashboard con stats y gráficos
│   ├── registro-inscripciones/ # Tabla de inscripciones
│   ├── configuraciones/      # Config del evento
│   ├── gastos/               # Control de gastos
│   └── grandteam/            # Gestión del equipo
├── grand-team/               # Info pública del equipo
├── contacto/                 # Página de contacto
└── firebase-setup/           # Guía de setup Firebase

components/
├── ui/                       # 54+ componentes shadcn/ui
├── home/                     # Landing: Hero, AboutTeam, RouteMap, Gallery, Sponsors, CTA, EventDetails, StatsCounter, Testimonials
├── inscripcion/              # Pasos: PersonalInfoStep, CategoryStep, PaymentStep, ReviewStep, DynamicFormRenderer
├── admin/                    # AdminSidebar, AdminStats, AdminInscripcionesTable, InscripcionDetailModal
├── grand-team/               # CategoryBreakdown, EventSummary, ParticipantsList
├── layout/                   # Navbar, Footer
├── providers/                # FirebaseProvider (auth + context global)
├── theme-provider.tsx        # next-themes
└── ErrorBoundary.tsx

lib/
├── firebase.js               # Init Firebase (db, auth, app, analytics)
├── utils.ts                  # cn() helper (clsx + tailwind-merge)
├── emailService.ts           # Emails: confirmación, rechazo, reminder, bulk
├── imageUtils.ts             # Compresión imágenes → base64 (max 1200px, 500KB)
└── exportUtils.ts            # Exportar a CSV/Excel

hooks/
├── use-toast.ts              # Sistema de notificaciones toast
└── use-mobile.ts             # Detección de dispositivo móvil

types/
└── form-builder.ts           # Tipos para formularios dinámicos
```

### Rutas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Landing (Hero, AboutTeam, RouteMap, Gallery, Sponsors, CTA) |
| `/inscripcion` | Pública | Formulario de inscripción (4 pasos) |
| `/inscripcion/exito` | Pública | Confirmación post-registro |
| `/grand-team` | Pública | Info del equipo + dashboard público |
| `/contacto` | Pública | Contacto |
| `/login` | Pública | Login admin (Google OAuth + email/password) |
| `/admin/dashboard` | Protegida | Stats en tiempo real + 7 gráficos |
| `/admin/registro-inscripciones` | Protegida | Tabla paginada con filtros y modal |
| `/admin/configuraciones` | Protegida | Config evento (precio, cupo, datos pago) |
| `/admin/gastos` | Protegida | CRUD gastos con aprobación por rol |
| `/admin/grandteam` | Protegida | Miembros, cumpleaños, datos de salud |

### Autenticación y Roles

- Firebase Auth: Google OAuth + email/password
- Post-login: se verifica email en colección `administrador` de Firestore
- **Roles**: `admin` (acceso total), `grandteam` (acceso parcial), `usuario` (sin acceso admin)
- Usuarios no autenticados → `/login?returnUrl=<ruta>`
- Context global: `useFirebaseContext()` provee `user`, `userRole`, `loading`, `eventSettings`

### Colecciones Firestore

```
administrador/{emailKey}     → email, displayName, role, lastLogin
inscripciones/{id}           → datos personales, pago, estado, fechaInscripcion
  ID formato: "Inscripciones_2026 - XXX-NombreApellido"
counters/inscripciones_2026  → count (auto-incremental)
eventos/2026                 → configuración del evento (precio, cupo, datos pago)
settings/eventSettings       → cupoMaximo, precio, inscripcionesAbiertas
gastos_2026/{id}             → gastos con aprobación
```

### Flujo de Inscripción

1. **PersonalInfoStep** → nombre, DNI, email, teléfono, fecha nacimiento, país, ciudad, contacto emergencia
2. **CategoryStep** → experiencia, talla remera, tipo sangre, alergias, condiciones médicas
3. **PaymentStep** → método pago, número referencia, comprobante (comprimido a base64)
4. **ReviewStep** → resumen antes de enviar
5. → Firestore (serverTimestamp) + Email confirmación (EmailJS) → `/inscripcion/exito`

### Convenciones Clave

- `"use client"` obligatorio en componentes interactivos (Firebase es client-side)
- Path alias `@/` → raíz del proyecto
- shadcn/ui: agregar con `npx shadcn@latest add <componente>`
- Fuentes: Inter (body, `--font-inter`) y Poppins (headings, `--font-poppins`)
- Imágenes: `unoptimized: true` (sin optimización de Next.js)
- Tema: Negro (#000) + Amarillo Dorado (#ffd700) + Blanco (#fff)
- Componentes desactivados en landing: EventDetails, StatsCounter, Testimonials (comentados en page.jsx)

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
```
## Recordatorio Final
Responder SIEMPRE en español. Esta es la regla más importante del archivo.