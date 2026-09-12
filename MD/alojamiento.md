# Alojamientos BikeFriendly

Sección pública que lista logos/fotos de alojamientos recomendados para ciclistas, con link al sitio web de cada uno, administrable desde el panel admin (alta, edición, borrado y reordenamiento por drag & drop).

Título: "Alojamientos BikeFriendly"
Subtítulo: "Alojamientos recomendados para ciclistas en Federación"

## Archivos

| Archivo | Rol |
|---|---|
| `components/bike-friendly-section.tsx` | Sección pública (grilla de tarjetas) |
| `components/admin/bike-friendly-editor.tsx` | ABM + reordenamiento |
| `app/page.tsx` | Monta la sección (`<section id="bikefriendly">`, dynamic import, `ssr: false`) |
| `app/admin/content/page.tsx` | Tab "BikeFriendly" que monta el editor |
| `app/api/admin/delete/route.ts` | Borrado server-side con service role |
| `supabase/migrations.sql` | Tabla `bike_friendly` + RLS |

## Base de datos

```sql
CREATE TABLE IF NOT EXISTS bike_friendly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text DEFAULT '',
  image_base64 text DEFAULT '',
  "order" int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE bike_friendly ENABLE ROW LEVEL SECURITY;

-- lectura pública
CREATE POLICY "public_read" ON bike_friendly FOR SELECT USING (true);
```

Escritura: en `rls-hardening.sql` la tabla está en la lista de "contenido del sitio" → lectura pública, escritura solo admin autenticado.

Notas:
- `order` es palabra reservada en Postgres → siempre entre comillas dobles en SQL y como string en `.order("order", ...)`.
- La imagen se guarda como **data URL base64 en la propia fila** (no hay Storage). Simple de portar, pero cada fila puede pesar cientos de KB: por eso el editor comprime antes de guardar.

## Sección pública

```tsx
"use client"

interface BikeFriendly {
  id: string
  name: string
  website: string
  image_base64: string
  order: number
}

export default function BikeFriendlySection() {
  const [alojamientos, setAlojamientos] = useState<BikeFriendly[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("bike_friendly")
      .select("*")
      .order("order", { ascending: true })
      .then(({ data }) => {
        setAlojamientos((data || []) as BikeFriendly[])
        setLoading(false)
      })
  }, [])
  ...
}
```

Tres estados: `loading` (spinner), vacío (cartel "No hay alojamientos disponibles"), y la grilla.

Grilla responsive:

```
grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6
```

Cada ítem es un `<Link>`:
- `href={a.website || "#"}`, `target="_blank"` + `rel="noopener noreferrer"` solo si hay website.
- Contenedor `aspect-square` blanco, `rounded-lg`, `shadow-md`, hover → `scale-105` + `shadow-lg`.
- `<img className="object-contain p-4">` (object-contain, no cover: son logos, no fotos recortables).
- `onError` → fallback a `/placeholder.svg`.
- Nombre debajo, `line-clamp-2`, hover cambia a color de marca.

Montaje en el home:

```tsx
const BikeFriendlySection = dynamic(() => import("@/components/bike-friendly-section"), {
  loading: sectionFallback,
  ssr: false,
})

<section id="bikefriendly" className="py-16 bg-gray-50">
  <BikeFriendlySection />
</section>
```

## Editor admin

Estado del componente: `items`, `loading`, `editingId`, `formData` (`name`, `website`, `image`, `imagePreview`), `alert`.

### Compresión de imagen (cliente)

Clave para que el base64 no reviente la fila:

```ts
const compressImage = (file: File, maxWidth = 400, quality = 0.8): Promise<string> => {
  // canvas + ratio = min(maxWidth/w, maxWidth/h)
  // PNG/WebP → mantiene transparencia (toDataURL("image/png"))
  // resto → JPEG con quality 0.8
  // si el resultado supera 800.000 chars y no tiene transparencia → recomprime a JPEG 0.6
}
```

Validaciones previas: `file.size <= 10MB` y `file.type.startsWith("image/")`.

### Alta / edición

- `name` requerido; `image` requerida solo al crear (al editar, si no se sube nueva, se conserva la existente: `image_base64` solo se agrega al payload si hay `imagePreview` nuevo).
- Al crear, el `order` se calcula como `max(order) + 1`.
- Update/insert directo con el cliente browser de Supabase (`supabase.from("bike_friendly")`).

```ts
const maxOrder = items.length > 0 ? Math.max(...items.map((s) => s.order)) : -1
await supabase.from("bike_friendly").insert({ ...payload, order: maxOrder + 1, created_at: new Date().toISOString() })
```

### Borrado

No va directo a Supabase: pasa por un API route con service role y whitelist de tablas.

```ts
// app/api/admin/delete/route.ts
const ALLOWED_TABLES = ["sponsors", "bike_friendly"]
// requireAdmin(request) valida la sesión antes de borrar
```

```ts
await fetch("/api/admin/delete", {
  method: "DELETE",
  headers: await authHeaders(),
  body: JSON.stringify({ table: "bike_friendly", id }),
})
```

### Reordenamiento

Dos mecanismos sobre el mismo modelo (índice del array = `order`):

1. Drag & drop con `@hello-pangea/dnd` (`DragDropContext` / `Droppable` / `Draggable`).
2. Botones ↑ / ↓ por tarjeta (fallback táctil / accesible).

Ambos reescriben el orden completo:

```ts
await Promise.all(
  newItems.map((item, i) => supabase.from("bike_friendly").update({ order: i }).eq("id", item.id))
)
```

Optimista: primero se actualiza el estado local, después se persiste.

### UI del editor

- Card de formulario arriba (título cambia entre "Agregar Alojamiento BikeFriendly" y "Editar Alojamiento").
- Dropzone con `<label>` + `<Input type="file" className="hidden">`.
- Vista previa con fondo de damero (`repeating-conic-gradient`) para ver transparencias.
- Card de listado abajo con contador `Alojamientos Registrados (n)` y hint "Arrastra para reordenar".
- Alerts inline autodescartables a los 5s (`showAlert(msg, type)`).

## Para replicar en otro proyecto

1. Crear la tabla (cambiar el nombre si el dominio es otro) + RLS: lectura pública, escritura admin.
2. Copiar `bike-friendly-section.tsx` y `bike-friendly-editor.tsx`, renombrar tabla y textos.
3. Instalar `@hello-pangea/dnd` si querés el drag & drop.
4. Montar la sección en el home con `dynamic(..., { ssr: false })` y agregar el tab en el panel admin.
5. Agregar la tabla al `ALLOWED_TABLES` del endpoint de borrado.
6. Si esperás muchos ítems o imágenes grandes, reemplazar `image_base64` por Supabase Storage + `image_url`.
