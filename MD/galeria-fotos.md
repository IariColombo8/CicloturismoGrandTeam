# Galería de fotos (destacadas + fotógrafos)

Sistema de galería con dos tipos de contenido en una sola tabla, filtrados por año:

1. **Fotos destacadas**: imágenes subidas directo (se guardan como base64 comprimido), con descripción opcional. Se muestran en grid.
2. **Fotógrafos**: no son imágenes propias, son **tarjetas con link externo** (nombre + descripción + botón "Ver Galería Completa" que abre, por ejemplo, un álbum de Google Drive/Photos del fotógrafo).

Archivos:
- `components/photos-section.tsx` — preview en la home (solo fotos destacadas, paginado de a 4, botón "Ver todas las fotos")
- `app/fotos/page.tsx` — página completa `/fotos` (fotógrafos + destacadas, filtro por año vía `?year=`)
- `components/admin/photos-editor.tsx` — CRUD admin de ambos tipos
- Tabla `galeria_fotos` (Supabase)

---

## 1. Esquema de datos

Una sola tabla para los dos tipos, discriminada por columna `type`:

```sql
CREATE TABLE IF NOT EXISTS galeria_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,        -- "featured" | "photographer"
  year int,
  "order" int DEFAULT 0,
  image_url text,            -- solo type="featured" (foto en base64 o URL)
  description text,          -- ambos tipos
  name text,                 -- solo type="photographer"
  link text,                 -- solo type="photographer" (URL a la galería externa)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_galeria_year_type ON galeria_fotos (year, type);

ALTER TABLE galeria_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON galeria_fotos FOR SELECT USING (true);
-- Escrituras: solo desde el admin, vía cliente autenticado o service_role
```

Todas las queries filtran por `year` + `type`, y ordenan por `order` (posición manual, no por fecha).

---

## 2. Página pública completa (`/fotos`)

```tsx
interface PhotoItem {
  id: string
  imageUrl: string
  description: string
  order: number
  year: number
}

interface PhotographerItem {
  id: string
  name: string
  link: string
  description: string
  order: number
  year: number
}

// selectedYear se toma de ?year= en la URL, o de eventSettings.currentYear como default
useEffect(() => {
  const yearParam = searchParams.get("year")
  if (yearParam) setSelectedYear(Number.parseInt(yearParam))
  else if (eventSettings?.currentYear) setSelectedYear(eventSettings.currentYear)
}, [searchParams, eventSettings])

useEffect(() => {
  const fetchGalleryData = async () => {
    setLoading(true)
    try {
      const { data: featuredRows } = await supabase
        .from("galeria_fotos")
        .select("*")
        .eq("year", selectedYear)
        .eq("type", "featured")
        .order("order", { ascending: true })
      setFeaturedPhotos((featuredRows ?? []).map((r) => ({
        id: r.id, imageUrl: r.image_url, description: r.description, order: r.order, year: r.year,
      })))

      const { data: photographerRows } = await supabase
        .from("galeria_fotos")
        .select("*")
        .eq("year", selectedYear)
        .eq("type", "photographer")
        .order("order", { ascending: true })
      setPhotographers((photographerRows ?? []).map((r) => ({
        id: r.id, name: r.name, link: r.link, description: r.description, order: r.order, year: r.year,
      })))
    } catch (error) {
      // fallback a datos default o vacío
    } finally {
      setLoading(false)
    }
  }
  fetchGalleryData()
}, [selectedYear, isFirebaseAvailable])
```

**Orden de la página**: primero fotógrafos, después fotos destacadas (a propósito — se prioriza mandar tráfico a los álbumes completos de los fotógrafos antes que a las miniaturas).

### Sección fotógrafos — tarjetas con link externo

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {photographers.map((photographer) => (
    <div key={photographer.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <h3 className="text-xl font-semibold mb-3">{photographer.name}</h3>
      {photographer.description && <p className="text-gray-600 mb-4 text-sm">{photographer.description}</p>}
      <a
        href={photographer.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 font-medium"
      >
        <ExternalLink className="h-4 w-4" />
        Ver Galería Completa
      </a>
    </div>
  ))}
</div>
```

Es literalmente una lista de nombre + link. No hay galería embebida ni scraping del álbum externo — el fotógrafo sube sus fotos a su propio Drive/Photos/lo que sea y acá solo se linkea.

### Sección fotos destacadas — grid con modal

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {featuredPhotos.map((photo) => (
    <div
      key={photo.id}
      className="relative group overflow-hidden rounded-lg cursor-pointer bg-white shadow-lg"
      onClick={() => openImageModal(photo.imageUrl, photo.description || "Foto del evento")}
    >
      <div className="aspect-square relative">
        <Image src={photo.imageUrl || "/placeholder.svg"} alt={photo.description || "Foto del evento"} fill
          className="object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      {photo.description && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm">{photo.description}</p>
        </div>
      )}
    </div>
  ))}
</div>
```

Click en una foto abre un **modal simple** (no librería de lightbox) fijo con overlay negro, `Image` a tamaño grande y botón `✕`:

```tsx
{imageModal.show && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 px-4">
    <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
      <button className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 rounded-full p-2"
        onClick={() => setImageModal({ show: false, src: "", alt: "" })}>✕</button>
      <Image src={imageModal.src || "/placeholder.svg"} alt={imageModal.alt} width={1000} height={800}
        className="object-contain max-w-full max-h-full rounded-lg" priority />
    </div>
  </div>
)}
```

### Selector de año

Combo simple con años hardcodeados (ajustar a los años reales del evento):

```tsx
<Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value))}>
  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="2024">2024</SelectItem>
    <SelectItem value="2025">2025</SelectItem>
  </SelectContent>
</Select>
```

---

## 3. Preview en la home (`components/photos-section.tsx`)

Solo muestra **fotos destacadas** (no fotógrafos), paginadas de a 4, con botón al final que linkea a `/fotos`. Usa un hook de cache genérico (`useCachedCollection`) en vez de query directa — para portarlo a otro proyecto alcanza con un `useEffect` + `supabase.from(...)` normal si no existe ese hook.

Puntos clave:

```tsx
const { data: rawPhotos, loading } = useCachedCollection(
  "ct_galeria_featured", "galeria_fotos", (q) => q.eq("type", "featured"), isFirebaseAvailable,
)

const allFeaturedPhotos = useMemo(() =>
  ([...rawPhotos]).sort((a, b) => a.year !== b.year ? b.year - a.year : a.order - b.order),
[rawPhotos])

const photosPerPage = 4
const totalPages = Math.ceil(allFeaturedPhotos.length / photosPerPage)
const currentPhotos = allFeaturedPhotos.slice(currentPage * photosPerPage, (currentPage + 1) * photosPerPage)
```

Ordena por año descendente y luego por `order` — es decir, en la home siempre aparecen primero las fotos del año más reciente, sin necesidad de selector de año (a diferencia de `/fotos` que sí permite elegir año).

Paginación con puntos numerados (no infinite scroll ni carousel):

```tsx
{Array.from({ length: totalPages }, (_, i) => (
  <Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm"
    onClick={() => setCurrentPage(i)} className="w-8 h-8 p-0">
    {i + 1}
  </Button>
))}
```

Mismo modal de imagen que en `/fotos` (duplicado — si se porta, conviene extraerlo a un componente compartido `ImageModal`).

---

## 4. Admin — CRUD de ambos tipos (`components/admin/photos-editor.tsx`)

Dos tabs (`Tabs` de shadcn): "Fotos Destacadas" y "Fotógrafos {año}", cada uno con su propio form + lista + reordenamiento manual.

### Compresión de imagen antes de subir

Las fotos destacadas **no se suben a Storage**: se comprimen client-side y se guardan como **base64 directo en la columna `image_url`**. Función reutilizable:

```ts
const compressImage = (file: File, maxWidth = 600, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new window.Image()

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      const hasTransparency = file.type === "image/png" || file.type === "image/webp"
      if (hasTransparency) {
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      } else if (ctx) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

      let compressedBase64: string
      if (hasTransparency) {
        compressedBase64 = canvas.toDataURL("image/png")
        if (compressedBase64.length > 800000) {
          // reintenta a 400px si sigue pesando mucho
          const smallerRatio = Math.min(400 / img.width, 400 / img.height)
          canvas.width = img.width * smallerRatio
          canvas.height = img.height * smallerRatio
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
          compressedBase64 = canvas.toDataURL("image/png")
        }
      } else {
        compressedBase64 = canvas.toDataURL("image/jpeg", quality)
        if (compressedBase64.length > 800000) compressedBase64 = canvas.toDataURL("image/jpeg", 0.6)
        if (compressedBase64.length > 800000) {
          const smallerRatio = Math.min(400 / img.width, 400 / img.height)
          canvas.width = img.width * smallerRatio
          canvas.height = img.height * smallerRatio
          if (ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height) }
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
          compressedBase64 = canvas.toDataURL("image/jpeg", 0.7)
        }
      }
      resolve(compressedBase64)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
```

Reintenta con calidad/tamaño menor en cascada hasta bajar de ~800KB en base64. Preserva transparencia en PNG/WebP, rellena fondo blanco para JPEG. Validación previa: máx 10MB de archivo original, debe ser `image/*`.

> Nota de diseño: guardar base64 directo en la fila en vez de subir a Storage es simple pero no escala bien más allá de unas pocas decenas de fotos por año (cada fila pesa cientos de KB). Si el otro proyecto va a tener muchas fotos, conviene subir a Supabase Storage y guardar solo la URL pública (mismo patrón que usa `comprobantes` en el módulo de inscripción).

### Alta / edición de foto destacada

```ts
const photoDataSnake = {
  description: photoFormData.description.trim(),
  image_url: imageUrl, // el base64 comprimido
  year: selectedYear,
  type: "featured",
  updated_at: new Date().toISOString(),
}

if (editingPhotoId) {
  await supabase.from("galeria_fotos").update(photoDataSnake).eq("id", editingPhotoId)
} else {
  const maxOrder = featuredPhotos.length > 0 ? Math.max(...featuredPhotos.map((p) => p.order)) : -1
  await supabase.from("galeria_fotos").insert({ ...photoDataSnake, order: maxOrder + 1, created_at: new Date().toISOString() })
}
```

### Alta / edición de fotógrafo

```ts
const photographerDataSnake = {
  name: photographerFormData.name.trim(),
  link: photographerFormData.link.trim(),
  description: photographerFormData.description.trim(),
  year: selectedYear,
  type: "photographer",
  updated_at: new Date().toISOString(),
}
// mismo patrón: update si editingPhotographerId, insert con order = max+1 si no
```

Validación mínima antes de guardar: `name` y `link` son obligatorios (`required` + chequeo manual), `description` opcional.

### Reordenamiento manual (subir/bajar)

No hay drag & drop — son botones ↑/↓ que intercambian posición en el array local y persisten el nuevo `order` de **todos** los items afectados:

```ts
const movePhotoItem = async (itemId: string, direction: "up" | "down") => {
  const currentIndex = featuredPhotos.findIndex((p) => p.id === itemId)
  if (currentIndex === -1) return
  const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
  if (newIndex < 0 || newIndex >= featuredPhotos.length) return

  const newItems = [...featuredPhotos]
  const [movedItem] = newItems.splice(currentIndex, 1)
  newItems.splice(newIndex, 0, movedItem)

  await Promise.all(newItems.map((item, i) => supabase.from("galeria_fotos").update({ order: i }).eq("id", item.id)))
  setFeaturedPhotos(newItems.map((item, index) => ({ ...item, order: index })))
}
```

Mismo patrón para `movePhotographerItem`. Es O(n) updates por movimiento — aceptable para listas chicas (decenas de items), no para cientos.

### Baja

```ts
const handleDeletePhoto = async (id: string) => {
  if (!confirm("¿Estás seguro de que quieres eliminar esta foto destacada?")) return
  await supabase.from("galeria_fotos").delete().eq("id", id)
}
```

`confirm()` nativo del browser — simple, sin modal custom.

---

## 5. Checklist para clonar

- [ ] Tabla `galeria_fotos` con columnas `type` (`"featured"|"photographer"`), `year`, `order`, `image_url`, `description`, `name`, `link`.
- [ ] RLS: lectura pública (`public_read`), escritura solo desde admin autenticado o service_role.
- [ ] Función `compressImage` para comprimir + convertir a base64 antes de guardar (o adaptarla para subir a Storage si va a haber muchas fotos).
- [ ] Página pública con: selector de año, sección fotógrafos (tarjeta nombre+descripción+botón link externo), sección fotos destacadas (grid + modal de imagen ampliada).
- [ ] Preview en home: solo destacadas, ordenadas por año desc + `order` asc, paginado de a N con puntos numerados, botón "ver todas" a la página completa.
- [ ] Admin con dos tabs (destacadas / fotógrafos), cada uno con form de alta+edición, lista con reordenar (↑/↓ que reescriben `order` de todo el array afectado), editar y eliminar (`confirm()` nativo).
- [ ] Modal de imagen ampliada: sin librería, overlay fijo + botón ✕ + `next/image` con `object-contain`.
