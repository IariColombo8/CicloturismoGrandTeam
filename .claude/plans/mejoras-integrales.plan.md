# Plan: Mejoras Integrales — Seguridad, UX/Estilos y SEO

**Fecha**: 2026-06-12
**Estado**: PENDIENTE (no ejecutar hasta confirmación)
**Complejidad total**: Grande (dividido en 4 fases independientes)

## Resumen

Plan de mejoras para Grand Team Bike 2026 en tres frentes: cerrar agujeros de
seguridad reales encontrados en auditoría del código (dos críticos), elevar la
calidad de UX del panel admin y la landing, y completar el SEO técnico.
Cada fase es commiteable y deployable por separado.

---

## FASE 1 — Seguridad CRÍTICA (hacer primero, ~2-3 hs)

### 1.1 `/api/admin/reset-estados` SIN autenticación — CRÍTICO
- **Problema**: `app/api/admin/reset-estados/route.ts` no valida nada: cualquier
  persona en internet puede hacer POST y resetear TODAS las inscripciones y
  participantes a "pendiente" (verificado: el handler usa service_role directo).
- **Fix**: extraer `autorizarAdmin()` de `app/api/admin/usuarios/route.ts:12-40`
  a `lib/api-auth.ts` y aplicarla en este endpoint. El cliente
  (`/admin/configuraciones` o donde se invoque) debe mandar el `access_token`
  en el header `Authorization` como ya hace `app/admin/usuarios/page.tsx:63-65`.

### 1.2 `/api/sponsors/upload-logo` SIN autenticación — CRÍTICO
- **Problema**: cualquiera puede subir archivos al bucket `comprobantes`
  (sin sesión). Solo valida tipo MIME declarado y 2MB.
- **Fix**: misma `autorizarAdmin()` compartida (aceptar admin y grandteam).
  Opcional: validar magic bytes del archivo, no solo `file.type`.

### 1.3 RLS de `inscripciones`: SELECT público — ALTO
- **Problema**: `supabase/rls.sql:57-60` permite a `anon` leer TODA la tabla:
  DNI, emails, teléfonos, contactos de emergencia y datos médicos de 271+
  personas, accesible con la anon key pública.
- **Fix**: restringir SELECT a team (`admin`/`grandteam`). Donde el formulario
  público necesite chequear duplicados, crear RPC `SECURITY DEFINER`
  `existe_inscripcion(p_dni)` que devuelva solo un boolean.

### 1.4 RLS de `participantes`: SELECT público expone `token_qr` — ALTO
- **Problema**: `supabase/rls.sql:96-99`. Cualquiera puede descargar todos los
  `token_qr` y falsificar check-ins, además de los datos personales.
- **Fix**: SELECT solo team + RPC `SECURITY DEFINER` para los lookups públicos
  (`/api/remera/lookup` ya usa service_role en servidor, así que el impacto en
  código público es mínimo; revisar el form de inscripción que chequea DNI).

### Validación Fase 1
- `npm run build` sin errores.
- POST a `/api/admin/reset-estados` sin token → 401.
- POST a `/api/sponsors/upload-logo` sin token → 401.
- `scripts/diagnostico-rls.mjs` adaptado: anon NO puede leer inscripciones ni
  participantes; el flujo público de inscripción sigue funcionando end-to-end.

---

## FASE 2 — Seguridad media (~2-3 hs)

### 2.1 Headers de seguridad en `next.config.mjs`
- Faltan por completo (verificado en `next.config.mjs:29-60`, solo hay Cache-Control).
- Agregar: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera solo para /admin/check-in que usa el escáner QR).
- CSP: empezar en modo `Content-Security-Policy-Report-Only` para no romper
  EmailJS, Google OAuth, Supabase y api.qrserver.com; ajustar y luego enforzar.

### 2.2 Rate limiting en endpoints públicos
- `/api/remera/submit`, `/api/remera/lookup` y el submit de inscripción no
  tienen límite. Implementar rate limit simple por IP (Upstash Ratelimit si se
  agrega Redis, o un limitador en memoria por instancia como mínimo viable).

### 2.3 Validación de entrada con zod en API routes
- El proyecto ya usa zod en formularios; replicar esquemas en
  `app/api/remera/submit` y `app/api/admin/usuarios` (hoy validan a mano).

### 2.4 `administradores` legible por cualquier autenticado
- `supabase/rls.sql:12-15`: cualquier usuario logueado ve emails y roles de
  todos los admins. Restringir SELECT a la propia fila; el rol propio ya se
  obtiene por email propio (sin cambios en el provider).

---

## FASE 3 — UX y Estilos (~4-6 hs)

### 3.1 Reemplazar `alert()`/`confirm()` por UI propia
- 7 usos encontrados: `app/admin/sponsors/page.tsx` (4),
  `app/admin/usuarios/page.tsx` (2), `app/admin/registro-inscripciones/page.tsx` (1).
- El proyecto ya tiene `@radix-ui/react-toast` y dialogs de shadcn: usar
  `useToast` para resultados y `AlertDialog` para confirmaciones destructivas.

### 3.2 Skeletons consistentes en el admin
- Dashboard ya tiene skeletons (`app/admin/dashboard/page.tsx:157`); replicar el
  patrón en sponsors, usuarios, remera y gastos (hoy: spinner genérico o nada).

### 3.3 Warnings de imágenes de Next 16
- El dev server avisa: `images.qualities` no configurado (calidades 60 y 85 en
  uso). Agregar `images: { qualities: [60, 75, 85] }` en `next.config.mjs`.

### 3.4 Admin móvil
- Tablas de registro-inscripciones y remera desbordan en móvil: vista de cards
  apiladas bajo `md:` (patrón ya usado parcialmente en sponsors).

### 3.5 Accesibilidad
- Focus visible en botones del tema negro/dorado (hoy se pierde el outline).
- `aria-label` en botones de ícono (varios sin label en admin).
- `prefers-reduced-motion` para las animaciones de framer-motion de la landing.
- Verificar contraste del dorado #ffd700 sobre fondos claros.

### 3.6 Página 404 personalizada
- No existe `app/not-found.tsx`; crear una con el branding negro/dorado.

### 3.7 Pulido de landing (opcional, usar skill `graphic-designer`)
- Jerarquía del hero, micro-interacciones en cards de sponsors, estados hover
  consistentes. Mantener tema Negro #000 + Dorado #ffd700 + Blanco.

---

## FASE 4 — SEO (~2-3 hs)

### 4.1 Metadata por página
- `app/layout.tsx` ya tiene metadata global + OG + JSON-LD (verificado).
- Falta `export const metadata` específica en: `/inscripcion`, `/contacto`,
  `/pedir-remera`, `/grand-team` (títulos y descriptions propios con keywords
  locales: "cicloturismo Concepción del Uruguay", "Entre Ríos", etc.).

### 4.2 JSON-LD de evento deportivo
- Ampliar el JSON-LD existente a `SportsEvent` completo: `startDate`,
  `location` (GeoCoordinates de Ruinas del Viejo Molino), `offers` (precio de
  inscripción dinámico), `organizer`. Sumar `FAQPage` si la landing tiene FAQ.

### 4.3 Indexación
- Verificar que `sitemap.xml` cubra todas las rutas públicas y NO incluya
  `/admin/*` ni `/login`.
- Agregar `robots: { index: false }` en el layout de `/admin` y en `/login`.

### 4.4 Open Graph dedicada
- Crear imagen OG 1200x630 con marca del evento (hoy usa una foto genérica).

### 4.5 Core Web Vitals
- Preload de la imagen hero (`fetchpriority="high"` ya que es el LCP).
- Verificar `font-display: swap` en Geist (next/font lo hace por defecto — solo
  confirmar que no haya fonts extra cargadas por CSS).
- Correr Lighthouse en `/` e `/inscripcion` y documentar el antes/después.

---

## Orden recomendado y dependencias

```
Fase 1 (crítica, independiente)  →  deploy inmediato
Fase 2 (depende de 1.1 por lib/api-auth.ts compartida)
Fase 3 (independiente)
Fase 4 (independiente)
```

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Endurecer RLS rompe el form público de inscripción | Media | RPCs SECURITY DEFINER + probar flujo completo con scripts de diagnóstico antes de aplicar en prod |
| CSP rompe EmailJS / OAuth / QR server | Alta | Arrancar con Report-Only y ajustar dominios antes de enforzar |
| Cambios de RLS deben ejecutarse en el SQL Editor de Supabase (no hay migraciones automáticas) | Media | Escribir cada cambio como archivo en `supabase/migrations/` y aplicarlo manualmente con checklist |
| Rate limit en memoria no funciona multi-instancia en Vercel | Baja | Aceptable como primer paso; documentar upgrade a Upstash |

## Criterios de aceptación

- [ ] Ningún endpoint de mutación accesible sin token válido
- [ ] anon key no puede leer datos personales ni token_qr
- [ ] Cero `alert()`/`confirm()` en el admin
- [ ] Lighthouse SEO ≥ 95 en `/`, accesibilidad ≥ 90
- [ ] `npm run build` limpio en cada fase
