# 04 · Admin (auth/roles), Configuración y Contador anti-pausa

Tres cosas: cómo funciona el **acceso al panel** (auth + roles), la **configuración del evento** (años, apertura de inscripciones, precio, textos), y el **contador diario** que mantiene vivo Supabase.

---

## A. Autenticación y roles

Auth con **Supabase Auth**: email/password y Google OAuth. Tabla `admins` (`email`, `role`, `display_name`, `photo_url`, `login_method`, `last_login`).

### Login — `app/admin/page.tsx`
- Sección email/password colapsable + botón Google (`signInWithOAuth`, `redirectTo = origin + "/admin"`).
- `onAuthStateChange` escucha `SIGNED_IN`/`INITIAL_SESSION` y llama `redirectByRole(email)`.
- `redirectByRole` consulta `admins.role`:
  - `admin` → `/admin/dashboard`
  - `remera` → `/admin/remera`
  - `pending` → signOut + mensaje "pendiente de aprobación"
  - **no existe** en `admins` → lo inserta como `pending` (con datos del provider) + signOut + "solicitud pendiente".

> Alta de nuevos admins es **auto-registro con aprobación**: cualquiera que loguee queda `pending`; un admin le cambia el `role` a mano en Supabase.

### Guard de rutas — `app/admin/layout.tsx`
- Al entrar a `/admin/*`: `getSession()`; sin sesión → redirige a `/admin` (login).
- Resuelve rol y lo cachea en `sessionStorage['admin_role_v1']` (evita query por navegación).
- Si `role === "remera"` → fuerza `/admin/remera` (ver `03-remeras.md`).
- Monta `AdminDataProvider` + `AdminSidebar` + el contenido. La ruta `/admin` (login) se renderiza sin sidebar.
- `onAuthStateChange`: si se pierde la sesión, limpia el cache de rol y vuelve al login.

### Sidebar — `components/admin/admin-sidebar.tsx`
Ítems: Dashboard, Inscripciones, Remera, Contenido, Configuración. Filtra a solo "Remera" si el rol es `remera`. Botón cerrar sesión (`supabase.auth.signOut()`).

---

## B. Configuración del evento — `app/admin/settings/page.tsx`

Escribe dos docs jsonb:

### `settings/eventSettings` (`data`)
```jsonc
{
  "cupoMaximo": 300, "precio": 35000, "metodoPago": "Transferencia bancaria",
  "datosPago1": "...", "datosPago2": "...",
  "currentYear": 2026, "fechaEvento": "2026-10-12", "edicion": ""
}
```
`currentYear` es el año activo que usan las secciones para filtrar contenido. `datosPago1/2` se muestran en el paso de pago de la inscripción. Se guarda con `upsert({ id: "eventSettings", data })`.

### `configuracion/inscripciones` (`data.ciclos[]`) — apertura por año
```jsonc
{ "ciclos": [ { "año": 2026, "habilitado": true, "fechaDesde": "2026-01-01", "fechaHasta": "2026-09-30" } ] }
```
UI: por cada año un `Switch` habilitado/deshabilitado (`toggleCiclo`), inputs de fecha desde/hasta (`saveCicloFechas`), y botón "agregar año" (`addNewYear` = `max(año)+1`). Esto es lo que consume el redirect de `/inscripcion` (ver `01-inscripciones.md`).

### `settings/confirmacion` (`data`) — textos del popup post-inscripción
`titulo`, `descripcion`, `mensaje`, `infoExtra`. Editable acá, leído por el diálogo de éxito de la inscripción.

> El contexto `FirebaseProvider` cachea `eventSettings` + `ciclosConfig` en localStorage 30 min (`ciclotermal_settings_v2`). Tras cambiar configuración, puede tardar en reflejarse por ese cache; para el clon conviene invalidarlo al guardar (mismo patrón `invalidateCache`).

---

## C. Contador anti-pausa de Supabase

**Problema:** Supabase (plan free) **pausa** el proyecto tras ~7 días sin actividad. **Solución:** un contador que escribe en la DB todos los días (basta con una escritura diaria; el número no se muestra en ningún lado).

### 1. SQL — `supabase/keepalive.sql` (correr una vez en el SQL Editor)
```sql
create table if not exists keepalive (
  id int primary key default 1,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into keepalive (id, count) values (1, 0) on conflict (id) do nothing;

create or replace function increment_keepalive()
returns bigint language sql as $$
  update keepalive set count = count + 1, updated_at = now()
  where id = 1 returning count;
$$;
```
Ejecutar como **"Run without RLS"**: la tabla solo la toca la API con service_role (que ignora RLS igual) y nadie la lee desde el cliente.

### 2. API route — `app/api/keepalive/route.ts`
```ts
export const dynamic = "force-dynamic"
export async function GET() {
  const { data, error } = await supabaseAdmin.rpc("increment_keepalive")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: data })
}
```
Suma 1 (atómico) por cada llamada. Probar manualmente: `https://<dominio>/api/keepalive`.

### 3. Cron de Vercel — `vercel.json`
```json
{ "crons": [ { "path": "/api/keepalive", "schedule": "0 6 * * *" } ] }
```
Corre todos los días 06:00 UTC (03:00 ART). Vercel llama la ruta → escritura diaria → Supabase no se pausa. El cron diario está incluido en el plan Hobby.

> Para el clon: copiar los 3 archivos, correr el SQL una vez en el nuevo proyecto Supabase, y verificar que `vercel.json` esté en la raíz. Nada que mostrar en la UI.

---

## Checklist para clonar

- [ ] Supabase Auth (email + Google) y tabla `admins` con `role`.
- [ ] Login con auto-registro `pending` + aprobación manual.
- [ ] Guard en `admin/layout` con cache de rol en sessionStorage + redirect por rol.
- [ ] `settings/eventSettings`, `configuracion/inscripciones` (ciclos), `settings/confirmacion`.
- [ ] `keepalive.sql` + `api/keepalive` + cron en `vercel.json`.
