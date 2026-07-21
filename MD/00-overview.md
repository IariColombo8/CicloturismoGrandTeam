# 00 · Overview / Arquitectura para clonar

Documento base para replicar la app en otro proyecto. Los demás `.md` (inscripciones, contenido, remeras, admin/config/contador) dependen de lo que está acá.

> Objetivo del clon: copiar **funcionalidad**, no colores ni estilos. Todo lo que sigue es lógica de negocio, esquema de datos y flujos. La capa visual (Tailwind, gradientes, paleta) se reemplaza libremente.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Supabase**: Postgres (datos) + Auth + Storage (comprobantes). Reemplazó a Firebase (quedan nombres tipo `firebase-provider`, pero por dentro es Supabase).
- **Tailwind + shadcn/ui** (Radix). Solo estética → reemplazable.
- Libs: React Hook Form + Zod (no imprescindible), Leaflet (mapa contacto), Recharts (dashboard), Google Drive API (subida de fotos de galería).

## Dos clientes de Supabase (clave para entender permisos)

`lib/supabase/client.ts` → cliente **anon** (browser). Sujeto a RLS.

`lib/supabase/admin.ts` → cliente **service_role** (solo server / API routes). **Bypasea RLS**. Init lazy para no romper el build sin env vars:

```ts
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabaseAdmin() as any)[prop] }
})
```

**Regla de oro del proyecto:**
- Lecturas públicas del sitio (sponsors, jersey, fotos, settings…) → cliente **anon** con políticas RLS `public_read`.
- Cualquier cosa sensible o de escritura (buscar participante por DNI, insertar inscripción, subir a Storage) → **API route** con `supabaseAdmin`. Nunca se expone la service_role al browser.

## Cadena de providers

`app/layout.tsx` → `ClientProviders` → `ThemeProvider` → `FirebaseProvider`

- `ClientProviders` carga `FirebaseProvider` con `dynamic(..., { ssr: false })` (evita errores de prerender).
- `FirebaseProvider` (`lib/firebase/firebase-provider.tsx`) expone por contexto: `user`, `eventSettings`, `ciclosConfig`, `isFirebaseAvailable`. Cachea settings en localStorage 30 min (`ciclotermal_settings_v2`). Si falla, usa `defaultSettings` hardcodeados.
- `AdminDataProvider` (`lib/admin-data-context.tsx`) envuelve **solo** `/admin/*` (menos el login). Cachea `registrations` y `expenses` (localStorage, 30 min, con patrón stale-while-revalidate).

## Estrategia de caché (importante — causa bugs de "no se actualiza")

`lib/use-cached-firestore.ts` expone `useCachedCollection` y `useCachedDoc`:

- Cache en **memoria** (Map) + **localStorage**, TTL 1h.
- Normaliza filas `snake_case` → `camelCase` (`normalizeRow`).
- Patrón **stale-while-revalidate**: muestra cache al instante y **siempre revalida** contra el server en cada carga (así un cambio en admin se ve al recargar sin esperar el TTL).
- `invalidateCache(prefix)`: borra de memoria + localStorage todas las keys que empiezan con `prefix`. Los editores de admin lo llaman tras escribir (ej: `invalidateCache("ct_sponsors_")`).

Keys de cache usadas: `ct_sponsors_<año>`, `ciclotermal_settings_v2`, `ciclotermal_registrations_v4_<año>`, `admin_role_v1` (sessionStorage).

> **Lección aprendida:** si en admin subís algo y en la home no aparece pero sí en incógnito, es cache viejo. Solución doble: (1) `invalidateCache` al escribir, (2) revalidar siempre en background al leer.

## Esquema Supabase (tablas)

Ver `supabase/schema.sql` completo. Resumen de las que importan para los flujos documentados:

| Tabla | PK | Rol |
|---|---|---|
| `admins` | uuid | usuarios del panel; columna `role` = `admin` \| `remera` \| `pending` |
| `participantes` | `dni` (text) | inscriptos; `años int[]` marca en qué ediciones se inscribió; `numero_inscripcion` |
| `settings` | `id` (text) | docs únicos: `eventSettings`, `confirmacion`, `remera` (cada uno con columna `data jsonb`) |
| `configuracion` | `id` (text) | docs únicos: `inscripciones` (ciclos por año), `grupos` (lista de grupos ciclistas) |
| `sponsors` | uuid | logos (imagen en base64 en `image_base64`), `order` |
| `jersey` | `'info'` (fila única) | info de la remera oficial que se muestra en el sitio |
| `remera` | uuid | pedidos de remera (`dni`, `items jsonb`, `estado`, `envio_tipo`…) |
| `remera_comprobantes` | text | comprobantes viejos en base64 (legacy) |
| `galeria_fotos`, `carousel`, `benefits`, `historia`, `contacto`, `itinerario`, `gastos` | — | contenido varios |
| `keepalive` | int (=1) | contador anti-pausa de Supabase (ver `04-...md`) |

Casi todas tienen columna `year`/`año` para filtrar por edición y `order` para ordenar.

### RLS

Todas con RLS activado. Política `public_read` (SELECT `USING (true)`) en las tablas de contenido público. Escrituras: sin política → solo `service_role` (API routes) puede escribir. Excepción: algunas tablas tienen policies de escritura para `anon` (ver migraciones); en un clon nuevo, preferí que **toda escritura pase por API route con service_role**.

## Storage

Bucket público `comprobantes`. Se **crea on-demand** desde las API routes si no existe (`createBucket(BUCKET, { public: true })`). Rutas dentro del bucket:
- Inscripción: `<dni>/<timestamp>.<ext>`
- Remera: `remera/<dni>/<timestamp>.<ext>`

## Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # solo server
# Google Drive (solo si se clona la galería de fotos)
GOOGLE_... (service account / keys)
```

## Convenciones

- `@/*` mapea a la raíz. Imports siempre con `@/`.
- `components/ui/` = shadcn, no editar a mano.
- Páginas admin acceden a Supabase directo (sin capa API intermedia) salvo lo sensible.
- `next.config.mjs` tiene ESLint y TS **deshabilitados en build**. No hay test runner.

## Mapa de archivos por flujo

- **Inscripciones** → `01-inscripciones.md`
  `app/inscripcion/page.tsx`, `app/inscripcion/[año]/page.tsx`, `app/api/lookup-participant/route.ts`, `app/api/inscripcion/submit/route.ts`, `app/api/admin/comprobante/route.ts`
- **Contenido** (sponsors/remera-info/fotos) → `02-contenido.md`
  `app/admin/content/page.tsx`, `components/admin/*-editor.tsx`, `components/*-section.tsx`
- **Remeras** (pedido + admin + rol) → `03-remeras.md`
  `app/pedir-remera/page.tsx`, `components/jersey-section.tsx`, `app/admin/remera/page.tsx`, `app/api/remera/*`
- **Admin / Config / Contador** → `04-admin-config-contador.md`
  `app/admin/page.tsx` (login), `app/admin/layout.tsx` (roles), `components/admin/admin-sidebar.tsx`, `app/admin/settings/page.tsx`, `supabase/keepalive.sql`, `app/api/keepalive/route.ts`, `vercel.json`
