# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Reglas del Proyecto

## Antes de hacer cambios
- Analizar el código existente.
- Mantener la arquitectura actual.
- No romper estilos ni componentes existentes.

## Antes de hacer commit
- Ejecutar el build del proyecto.
- Verificar que no haya errores de compilación.
- Verificar que no haya errores de TypeScript (si aplica).

## Prohibido
- Hacer commit si el proyecto no compila.
- Introducir código sin probar el build.

## Reglas de commits
- Usar Conventional Commits:
  - feat: para nuevas funcionalidades
  - fix: para correcciones
  - refactor: para mejoras internas sin cambiar funcionalidad
  - style: cambios visuales
  - docs: documentación

- El mensaje debe ser claro y específico.
- Ejemplo correcto:
  feat: agregar validación al formulario de registro
  
  ## Language Rule

All responses must be in Spanish.
Do not answer in English.
Use clear and simple explanations.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run start    # Start production server
```

There are no tests configured in this project.

## Architecture Overview

**Grand Team Bike 2026** is a Next.js 15 (App Router) event registration site for a cycling event in Concepción del Uruguay, Argentina. It combines a public-facing landing page with a protected admin dashboard, backed by Firebase.

### Tech Stack

- **Framework**: Next.js 15 with App Router, React 19
- **Styling**: Tailwind CSS v4 with shadcn/ui components (`new-york` style, neutral base)
- **Backend**: Firebase (Firestore for data, Auth for admin login)
- **Email**: EmailJS (`@emailjs/browser`) for transactional emails
- **Forms**: react-hook-form + zod
- **Animations**: framer-motion
- **Charts**: recharts (used in admin dashboard)
- **TypeScript**: Enabled but `ignoreBuildErrors: true` in `next.config.mjs` — type errors won't block builds

### Route Structure

| Route | Description |
|---|---|
| `/` | Public landing page (Hero, AboutTeam, RouteMap, Gallery, Sponsors, CTA) |
| `/inscripcion` | Multi-step public registration form |
| `/inscripcion/exito` | Post-registration success page |
| `/login` | Admin login (Google OAuth or email/password) |
| `/admin/dashboard` | Protected stats dashboard with recharts |
| `/admin/registro-inscripciones` | Protected registrations table |
| `/admin/configuraciones` | Admin settings |
| `/admin/gastos` | Expense tracking |
| `/admin/grandteam` | Team management |
| `/grand-team` | Public team info page |
| `/contacto` | Contact page |
| `/firebase-setup` | Firebase setup guide page |

### Authentication & Authorization

- Admin access is Firebase Auth (Google + email/password)
- After login, the app queries the `administrador` Firestore collection to verify if the user's email is an authorized admin
- Unauthenticated users are redirected to `/login?returnUrl=<intended-path>`
- Admin layout (`app/admin/layout.tsx`) wraps all admin routes with `AdminSidebar` + `Navbar`

### Firebase & Environment

Firebase is initialized in `lib/firebase.js`, exporting `db`, `auth`, `app`, and `analytics`. Configuration is pulled from environment variables.

Required `.env.local` variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_EMAILJS_SERVICE_ID
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
```

Firebase project ID: `cicloturismo-35fd8`. See `FIREBASE_SETUP.md` for Firestore security rules and authorized domains setup.

### Registration Flow

The `/inscripcion` page is a 4-step wizard:
1. **PersonalInfoStep** — personal data + photo upload (compressed via `lib/imageUtils.ts`, stored as base64 in Firestore)
2. **CategoryStep** — race category selection
3. **PaymentStep** — payment proof upload
4. **ReviewStep** — summary before submission

On submit, data is written to Firestore with `serverTimestamp`. Confirmation emails are sent via `lib/emailService.ts` (EmailJS).

### Key Conventions

- `"use client"` is required on nearly all interactive components; Firebase Auth/Firestore calls are always client-side
- Path alias `@/` maps to the project root (configured in `tsconfig.json`)
- shadcn/ui components live in `components/ui/` and should be added via `npx shadcn@latest add <component>`
- `lib/utils.ts` exports the `cn()` helper (clsx + tailwind-merge)
- Fonts: Inter (body) and Poppins (headings), loaded via `next/font/google` with CSS variables `--font-inter` and `--font-poppins`
- Images: `unoptimized: true` in Next config — no Next.js image optimization is used
