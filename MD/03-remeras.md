# 03 · Remeras (pedido público + gestión admin + rol "remera")

Sistema de pedidos de remera, separado del contenido informativo (`jersey`, ver `02`). Tiene tres piezas:
1. **Pedido público** (formulario que autocompleta por DNI).
2. **Panel admin** de pedidos (`/admin/remera`) con filtros, conteo por talle y comprobantes.
3. Un **rol de usuario `"remera"`** que **solo** puede entrar a ese panel.

Archivos:
- `app/pedir-remera/page.tsx` — página pública (monta `JerseySection`)
- `components/jersey-section.tsx` — incluye `RemeroFormModal` (el formulario de pedido)
- `app/admin/remera/page.tsx` — panel admin de pedidos
- `app/api/remera/lookup/route.ts` — busca participante + pedido existente por DNI
- `app/api/remera/submit/route.ts` — crea/edita el pedido + comprobante
- `app/api/remera/settings/route.ts` — devuelve el alias de pago

Tabla `remera`: `id uuid`, `dni`, `nombre`, `telefono`, `items jsonb` (`[{talle, cantidad}]`), `talle` (legacy), `tiene_comprobante`, `esta_registrado`, `estado` (`pendiente`|`entregado`), `fecha_solicitud`, `envio_tipo` (`retiro`|`envio`), `direccion`, `comprobante_url`. Alias de pago en `settings/remera.data.alias`.

---

## 1. Pedido público (`RemeroFormModal` en `jersey-section.tsx`)

Modal con pasos `form` → `success`.

**Autocompletado por DNI (igual filosofía que inscripción):**
- `useEffect` observa `dni`; cuando matchea `^\d{7,8}$` y cambió, llama `buscarPorDniAuto`.
- `GET /api/remera/lookup?dni=...` (service_role) devuelve en paralelo:
  - `participante` de `participantes` (`dni, nombre, apellido, telefono`) → si existe, precarga nombre+teléfono y marca `esta_registrado = true`.
  - `remera` existente (pedido previo) → si existe, precarga `items` (o `talle` legacy) y pasa a modo **edición**.
- Así, quien ya está inscripto tipea el DNI y aparece su nombre/teléfono; quien ya pidió, edita su pedido.

**Campos del pedido:**
- `items`: lista dinámica de `{ talle, cantidad }` (agregar/quitar filas). Talles `XS…5XL`. Hay tabla de talles opcional (`showTablaTalles`).
- `envioTipo`: `retiro` o `envio`; si `envio`, pide `direccion`.
- Comprobante (imagen/PDF) opcional; alias de pago se muestra desde `/api/remera/settings`.

**Envío** → `POST /api/remera/submit` (service_role):
- Si viene comprobante → sube a Storage `remera/<dni>/<timestamp>.<ext>` → `comprobante_url`.
- `upsert` en `remera` con `onConflict: "dni"` (un pedido por DNI). Setea `items`, `envio_tipo`, `direccion` (null si retiro), `tiene_comprobante`, `esta_registrado`.
- Si es alta nueva (`!isEditing`): `estado = "pendiente"` y `fecha_solicitud = now()`.
- Devuelve `{ id }`. El modal pasa a paso `success`.

`app/pedir-remera/page.tsx` es simple: Navbar + `JerseySection` + Footer. El botón "Pedí tu remera" abre el modal.

---

## 2. Panel admin de pedidos (`/admin/remera`)

`app/admin/remera/page.tsx`:
- `fetchRemeras`: lee toda la tabla `remera` (anon), mapea snake→camel, ordena por `fecha_solicitud` desc.
- **Alias de pago editable** arriba: textarea que guarda en `settings/remera.data.alias` (`upsert`). Es el mismo alias que ve el formulario público.
- **Resumen por talle**: cuenta unidades sumando `items[].cantidad` (o `talle` legacy) → tarjetas XS…5XL con totales.
- **Filtros**: búsqueda (nombre/DNI/teléfono), estado (todos/pendiente/entregado), talle, tipo de envío.
- **Cambiar estado**: `pendiente` ↔ `entregado` (`update` en `remera`), refresco optimista en memoria.
- **Ver comprobante**: si hay `comprobante_url` (Storage) lo abre; si no, fallback a `remera_comprobantes.comprobante_base64` (sistema viejo), con cache en memoria.
- `formatItems` muestra `M×2, L×1`.

---

## 3. Rol "remera" (usuario restringido)

Este es el detalle pedido: **un usuario que solo ve remeras**.

En `admins.role` puede valer `admin`, `remera` o `pending`.

**Login** (`app/admin/page.tsx` → `redirectByRole`):
- `admin` → `/admin/dashboard`
- `remera` → `/admin/remera`
- `pending` → signOut + "pendiente de aprobación"
- desconocido → se inserta como `pending` y signOut

**Guard del layout** (`app/admin/layout.tsx`):
- Al entrar a cualquier `/admin/*`, resuelve el rol (cacheado en `sessionStorage` bajo `admin_role_v1` para no pegarle a la DB en cada navegación).
- Si `role === "remera"` y la ruta no es `/admin/remera` ni `/admin` → `router.push("/admin/remera")`. Queda **encerrado** en su panel.

**Sidebar** (`components/admin/admin-sidebar.tsx`):
- `filteredNavItems = userRole === "remera" ? navItems.filter(i => i.href === "/admin/remera") : navItems`.
- El rol remera solo ve el ítem "Remera"; el admin ve todo (Dashboard, Inscripciones, Remera, Contenido, Configuración).

> Resultado: creás un admin de Supabase Auth, en la tabla `admins` le ponés `role='remera'`, y esa persona al loguearse solo puede gestionar pedidos de remera. No ve inscriptos, gastos ni configuración.

---

## Checklist para clonar

- [ ] Tabla `remera` (`items jsonb`, `estado`, `envio_tipo`, `direccion`, `comprobante_url`, `dni` único).
- [ ] `settings/remera.data.alias` para datos de pago compartidos entre público y admin.
- [ ] API `remera/lookup` (participante + pedido en paralelo, service_role) para autocompletar.
- [ ] API `remera/submit` (upsert onConflict dni + comprobante a Storage).
- [ ] Panel admin con conteo por talle, filtros, cambio de estado, ver comprobante.
- [ ] Columna `role` en `admins` con valor `remera` + guard en layout + filtro de sidebar + redirect en login.
