# Plan de Mejoras — Grand Team Bike 2026

Plan dividido en 3 ejes (**Estilos**, **UX**, **Funcionamiento**), aterrizado al código actual.
Cada ítem indica impacto (Alto/Medio/Bajo) y esfuerzo aproximado.

---

## EJE 1 — ESTILOS / VISUAL

### 1.1 Sistema de diseño con tokens (Alto impacto · Medio esfuerzo)
**Problema:** Los tamaños de tipografía, espaciados y radios están hardcodeados en cada
componente (`text-2xl sm:text-4xl md:text-5xl lg:text-7xl`, `mb-3 sm:mb-6`, etc.). No hay
una escala consistente — cada sección reinventa sus breakpoints.

**Acción:**
- Definir tokens en `globals.css` con `clamp()` fluido: `--text-hero`, `--text-h2`, `--text-body`, `--space-section`.
- Reemplazar las cadenas repetidas de tamaños responsive por clases utilitarias o variables.
- Resultado: tipografía que escala suave sin saltos por breakpoint y menos clases por elemento.

### 1.2 Eliminar duplicación/conflicto de animaciones (Medio · Bajo)
**Problema real detectado:** `HeroSection.tsx` define `@keyframes float` y `.animate-float`
en un `<style jsx global>` (float 6s, `-20px`) **que choca** con la misma clase ya definida
en `globals.css` (float 3s, `-10px`). Gana una u otra según orden de carga → comportamiento impredecible.

**Acción:**
- Borrar el bloque `<style jsx global>` del Hero (líneas 173–191).
- Unificar en `globals.css`: usar `--float-distance` y `--float-duration` como variables, o
  crear `.animate-float-hero` distinta si se quiere otra amplitud.

### 1.3 Jerarquía y profundidad (Alto · Medio)
**Problema:** Un único acento (dorado `#ffd700`) usado de forma decorativa en todo. Las
secciones son planas: glass cards uniformes, mismo radio, misma sombra. Riesgo de "template".

**Acción:**
- Introducir capas: secciones con fondos alternados (negro puro / `zinc-950` / radial gold sutil).
- Variar radios y sombras por jerarquía (CTA principal vs. cards informativas).
- Usar el dorado **semánticamente** (acción / dato clave) y no en todo borde.
- Considerar una composición tipo bento en "Detalles del evento" en vez de grid uniforme.

### 1.4 Tipografía con carácter (Medio · Bajo)
**Problema:** Solo Geist (body + mono). Un evento deportivo de ciclismo pide un display
con más personalidad para títulos.

**Acción:**
- Añadir una fuente display condensada/atlética para H1/H2 (ej. Archivo, Anton, Bebas) vía
  `next/font/google`, `font-display: swap`, precargando solo el peso usado.
- Mantener Geist para cuerpo. Máximo 2 familias.

### 1.5 Contraste y legibilidad (Medio · Bajo · Accesibilidad)
**Problema:** Texto `gray-300`/`gray-400` sobre gradientes oscuros con imagen de fondo al
20% de opacidad — riesgo de contraste < 4.5:1 en el Hero.

**Acción:**
- Verificar contraste de subtítulos del Hero; añadir overlay oscuro adicional o subir el peso del texto.
- Revisar `text-[10px]` en quick-info cards móvil (muy chico para legibilidad).

---

## EJE 2 — UX

### 2.1 Estados de carga y feedback (Alto · Medio)
**Acción:**
- Skeletons consistentes en formularios y dashboard mientras cargan datos de Supabase.
- Estados de éxito/error con `sonner` (ya instalado) en vez de alerts silenciosos.
- Feedback optimista en check-in y cambios de estado de inscripciones.

### 2.2 Flujo de inscripción de 4 pasos (Alto · Medio)
**Acción:**
- Barra de progreso visible con pasos numerados + posibilidad de volver atrás sin perder datos.
- Validación inline por campo (zod ya está) con mensajes claros en español.
- Autoguardado en `sessionStorage` para no perder el progreso si se recarga.
- Resumen final (ReviewStep) con edición rápida por sección.

### 2.3 Navegación (Medio · Bajo)
**Problema:** El Navbar tiene 3 ramas casi idénticas de renderizado de links (usuario /
admin / admin-en-admin) — difícil de mantener y propenso a inconsistencias.

**Acción:**
- Extraer un componente `NavLinks` y un array de configuración por rol → una sola fuente de verdad.
- Indicador de sección activa (scroll spy) al navegar la landing.
- Añadir "Pedir Remera" también en la vista admin si aplica.

### 2.4 Mobile-first real (Medio · Medio)
**Acción:**
- Revisar áreas táctiles mínimas (44px) en botones compactos del Hero.
- El menú móvil ocupa `max-w-sm` a la derecha; evaluar full-width para fácil alcance con el pulgar.
- Probar 320 / 375 / 768 sin overflow horizontal.

### 2.5 Microcopy y confianza (Bajo · Bajo)
**Acción:**
- Reforzar trust indicators (seguro, apoyo mecánico, hidratación) con más contexto.
- Mostrar cupos restantes en tiempo real desde `event_settings` para crear urgencia honesta.

---

## EJE 3 — FUNCIONAMIENTO

### 3.1 Calidad de tipos y código (Alto · Medio)
**Problema:** `DropdownMenu`/`MobileDropdown` en Navbar usan `any` en todas las props
(viola la guía de estilo TS del proyecto).

**Acción:**
- Tipar props con interfaces reales (`label: string`, `isOpen: boolean`, `onToggle: () => void`, `children: ReactNode`).
- Barrido de `any` en componentes y handlers.

### 3.2 Tests (Alto · Alto)
**Problema:** No hay tests configurados (confirmado en CLAUDE.md).

**Acción:**
- Playwright para flujos críticos: inscripción completa, pedir remera, login admin, check-in QR.
- Tests de regresión visual en breakpoints 320/768/1024/1440 (Hero + landing).
- Empezar por los 2 flujos que mueven dinero/datos: inscripción y check-in.

### 3.3 Robustez de datos y errores (Alto · Medio)
**Acción:**
- Manejo explícito de errores de red en llamadas a Supabase (hoy varios `console.error` sueltos).
- Validación de entrada en API routes (`/api/remera/*`, `/api/sponsors/upload-logo`) con zod.
- Mensajes de error orientados al usuario, logging detallado en servidor.

### 3.4 Performance (Medio · Medio)
**Acción:**
- Medir Core Web Vitals reales (Lighthouse) en landing y `/inscripcion`.
- La imagen del Hero usa `priority` + opacity 20% — confirmar tamaño servido vs. renderizado (AVIF/WebP).
- Verificar presupuesto JS de la landing (objetivo < 150kb gzip).
- Revisar que los `dynamic import` (recharts, html5-qrcode) no bloqueen el render inicial.

### 3.5 Accesibilidad funcional (Medio · Bajo)
**Acción:**
- Navegación por teclado en dropdowns del Navbar (hoy solo click/mousedown).
- `aria-current` en sección activa, focus visible en CTAs.
- Ya hay `prefers-reduced-motion` ✓ — mantener al añadir animaciones nuevas.

---

## PRIORIZACIÓN SUGERIDA (orden de ejecución)

**Fase 1 — Quick wins (1–2 días)**
- 1.2 Conflicto de animaciones del Hero (bug)
- 3.1 Tipado `any` del Navbar
- 1.5 Contraste del Hero
- 2.3 Indicador de sección activa

**Fase 2 — Sistema visual (3–5 días)**
- 1.1 Tokens de diseño
- 1.4 Tipografía display
- 1.3 Jerarquía y profundidad

**Fase 3 — UX de conversión (3–5 días)**
- 2.2 Flujo de inscripción + autoguardado
- 2.1 Estados de carga/feedback
- 2.5 Cupos en tiempo real

**Fase 4 — Robustez (continuo)**
- 3.2 Tests Playwright (flujos críticos primero)
- 3.3 Validación y errores
- 3.4 Performance + CWV

---

## NOTAS
- Respetar tema Negro (#000) + Dorado (#ffd700) + Blanco — todas las mejoras visuales dentro de esa identidad.
- Build verde obligatorio antes de cada commit (`npm run build`).
- Sin romper la arquitectura actual (App Router, client-side Supabase/Firebase).
