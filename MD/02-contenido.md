# 02 · Contenido (Sponsors, Remera-info, Fotos y demás)

Editor de contenido del sitio en `/admin/content`. Cada sección del sitio público tiene un **editor** en `components/admin/*-editor.tsx` y una **sección** de render en `components/*-section.tsx`. Cada editor lee/escribe su tabla directo en Supabase.

Archivos:
- `app/admin/content/page.tsx` — tabs que montan cada editor
- `components/admin/sponsors-editor.tsx`, `jersey-editor.tsx`, `photos-editor.tsx`, `benefits-editor.tsx`, `history-editor.tsx`, `contact-editor.tsx`, `itinerary-editor.tsx`, `bike-friendly-editor.tsx`, `carousel-editor.tsx`
- `components/sponsors-section.tsx`, `jersey-section.tsx`, `photos-section.tsx`, etc.

---

## Estructura del editor de contenido

`app/admin/content/page.tsx` define un array `tabs` (value, label, icon, description) y renderiza `<Tabs>` (shadcn). En desktop muestra la grilla de tabs; en mobile un selector con flechas prev/next. Cada `TabsContent` monta el editor correspondiente. Tab por defecto: `sponsors`.

Para agregar una sección nueva: crear `components/admin/xxx-editor.tsx`, agregar entrada al array `tabs` y un `<TabsContent value="xxx"><XxxEditor/></TabsContent>`.

---

## Patrón común de todos los editores

1. `useEffect` inicial → `load()` lee la tabla con el cliente **anon** (`supabase.from(tabla).select("*")`).
2. Formulario con estado local. Imágenes: se **comprimen a base64 en el browser** con canvas (`compressImage`) y se guardan como texto en la columna (`image_base64` en sponsors, `image_url` en jersey). PNG/WebP conserva transparencia; JPG usa quality 0.8 y baja a 0.6 si supera ~800KB.
3. Guardar → `supabase.from(tabla).upsert(...)` con columnas en **snake_case** y `updated_at`.
4. **Invalidar cache** tras escribir para que el sitio público se actualice (ver abajo).
5. Alert local de éxito/error (auto-cierra a los 5s).

> Nota: casi todo el contenido usa **base64 embebido** en Postgres (no Storage) para imágenes de logos/remera. Simple pero pesa; para logos chicos va bien. Las **fotos de galería** son la excepción: usan Google Drive (ver más abajo).

---

## Sponsors (caso de referencia — incluye el bug de cache resuelto)

**Editor** `components/admin/sponsors-editor.tsx`:
- Campos: `name`, `website`, `image` (comprimida a base64 → `image_base64`), `order`.
- CRUD completo: crear/editar (`upsert` con `updated_at`), borrar (via `DELETE /api/admin/delete` con service_role), reordenar por drag&drop (`@hello-pangea/dnd`) y flechas ↑/↓ (actualiza `order` de cada fila).
- Nuevo sponsor: `order = max(order)+1`.
- **Tras cada escritura llama `invalidateCache("ct_sponsors_")`** (crear, editar, borrar, reordenar).

**Sección pública** `components/sponsors-section.tsx`:
- Usa `useCachedCollection("ct_sponsors_<año>", "sponsors", q => q.order("order"))`.
- `processImageData` acepta URL http, data-url o base64 crudo (detecta PNG/JPG/GIF por magic bytes) y cae a `/placeholder.svg`.
- Filtra por año (`!data.year || data.year === currentYear`) y ordena por `order`.

**Bug clásico y su fix (aplica a todo el contenido cacheado):**
Subís un sponsor en admin y en la home no aparece, pero en incógnito sí → es **cache viejo** (localStorage 1h). Solución doble:
1. `invalidateCache("ct_sponsors_")` en el editor al escribir.
2. `useCachedCollection` en modo **stale-while-revalidate**: muestra cache al instante pero **siempre** revalida contra Supabase en cada carga, así al recargar se ve el cambio aunque el TTL no haya vencido.

Ver `lib/use-cached-firestore.ts` (`invalidateCache`, y el fetch que corre siempre aunque haya cache).

---

## Remera-info (jersey) — lo que se muestra en el sitio

Esta es la **info/publicidad** de la remera (imagen, features, textos). El **pedido** de remera es otro flujo → `03-remeras.md`.

**Editor** `components/admin/jersey-editor.tsx` ↔ tabla `jersey` (fila única `id = 'info'`):
- Campos: `title`, `description`, `image_url` (base64 comprimido, maxWidth 800), `show_section` (Switch on/off para ocultar la sección), `year`, `call_to_action_title`, `call_to_action_description`, `features jsonb` (lista editable de `{id, title, description}`).
- Al leer, solo aplica los datos guardados si `row.year === currentYear` (si no, usa defaults → fuerza recargar la info por edición).

**Sección pública** `components/jersey-section.tsx`:
- Usa `useCachedDoc` sobre `jersey`. Si `show_section` es false, no muestra nada.
- Incluye el **formulario/modal de pedido de remera** (`RemeroFormModal`) → detallado en `03-remeras.md`.

---

## Fotos (galería con Google Drive)

**Editor** `components/admin/photos-editor.tsx` ↔ tabla `galeria_fotos` (`type`, `year`, `order`, `image_url`, `description`, `name`, `link`).

Diferencia clave: las imágenes **no** van a base64/Postgres sino a **Google Drive** vía `POST /api/upload-drive`:
- La API valida el token del usuario (`Authorization: Bearer <access_token>` de Supabase Auth) con `supabaseAdmin.auth.getUser`. Solo usuarios logueados suben.
- Valida tipo imagen y tamaño ≤ 5MB, sube con `uploadToGoogleDrive` (`lib/google-drive.js`, service account) y devuelve la URL pública del archivo.
- Esa URL se guarda en `galeria_fotos.image_url`.

**Sección pública** `components/photos-section.tsx` lee `galeria_fotos` filtrando por `year`/`type` y ordena por `order`.

> Para el clon: si no querés depender de Google Drive, cambiá `upload-drive` por subida al bucket de Supabase Storage (mismo patrón que comprobantes) y guardá esa URL en `image_url`.

---

## Borrado genérico

`app/api/admin/delete/route.ts` (service_role) borra por `{ table, id }` restringido a una allowlist (`ALLOWED_TABLES = ["sponsors", "bike_friendly"]`). Ampliá la allowlist para otras tablas que necesiten borrado seguro desde el browser.

---

## Checklist para clonar

- [ ] `/admin/content` con tabs; un editor por sección de contenido.
- [ ] Patrón editor: load anon → form → compress-to-base64 → upsert snake_case + `updated_at` → `invalidateCache(prefix)`.
- [ ] Secciones públicas con `useCachedCollection`/`useCachedDoc` en modo stale-while-revalidate.
- [ ] `jersey` como fila única `id='info'` con `show_section` y `features jsonb`.
- [ ] Galería: subir a Storage/Drive y guardar URL (no base64).
- [ ] `api/admin/delete` con allowlist de tablas.
