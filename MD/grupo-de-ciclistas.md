# Grupo de ciclistas — combo autocompletable con alta automática

Campo del paso 1 del formulario de inscripción (`app/inscripcion/[año]/page.tsx`). Es un input de texto con dropdown propio (no usa Popover/Command de shadcn) que:

1. Muestra una lista combinada de grupos **hardcodeados** + grupos **guardados en base** (Supabase, tabla `configuracion`, fila `id = "grupos"`, columna `data.lista: string[]`).
2. Filtra esa lista a medida que el usuario tipea.
3. Si lo que escribe no coincide con nada, ofrece un ítem "¿Quisiste decir? → X" (fuzzy simple por `includes`).
4. Ofrece siempre la opción "No pertenezco a ninguno".
5. Si el usuario escribe un grupo que no existe en la lista, al enviar el formulario el backend lo agrega automáticamente a `configuracion/grupos.data.lista`, quedando disponible para el próximo que se inscriba.

No usa Firestore a pesar del nombre de la variable (`gruposFirebase`) — es legado de una migración, hoy todo es Supabase.

---

## 1. Estado y carga inicial

```ts
const [grupoCiclistasOpen, setGrupoCiclistasOpen] = useState(false)
const [gruposFirebase, setGruposFirebase] = useState<string[]>([]) // lista dinámica desde DB

// Lista base hardcodeada (semilla / fallback si la DB está vacía)
const gruposCiclistas = [
  "Team Riders", "Pedal Power", "Grand Team Bike Cdelu", "Ciclo Materos", "Los Despacito",
  "Kamikaze MTB", "Rural Bike concepcion", "En Bici Ando", "Desafiando Caminos", "Los Tiernitos",
  "CicloturismoBasso", "Desacatados Bike", "Bikers Alcorta", "Bici Chicas", "Panteras Bike",
]

useEffect(() => {
  const loadGrupos = async () => {
    try {
      const { data: row } = await supabase
        .from("configuracion")
        .select("data")
        .eq("id", "grupos")
        .single()
      if (row?.data?.lista) setGruposFirebase(row.data.lista)
    } catch {}
  }
  loadGrupos()
}, [])
```

Se cargan una sola vez al montar. La lista efectiva que se usa en todo el componente siempre se recalcula como:

```ts
const todosLosGrupos = [...new Set([...gruposCiclistas, ...gruposFirebase])]
```

(unión sin duplicados de la lista hardcodeada + la de la DB).

---

## 2. UI del combo (input + dropdown manual)

```tsx
<Label htmlFor="grupoCiclistas" className="flex justify-between">
  <span>Grupo de ciclistas *</span>
  {fieldErrors.grupoCiclistas && <span className="text-red-500 text-xs">{fieldErrors.grupoCiclistas}</span>}
</Label>
{(() => {
  const todosLosGrupos = [...new Set([...gruposCiclistas, ...gruposFirebase])]
  const q = formData.grupoCiclistas.toLowerCase().trim()

  const opcionesFiltradas = q
    ? todosLosGrupos.filter((g) => g.toLowerCase().includes(q))
    : todosLosGrupos

  const noPertenece = "No pertenezco a ninguno"
  const mostrarNoPertenece = !q || noPertenece.toLowerCase().includes(q)

  const exactMatch = todosLosGrupos.some((g) => g.toLowerCase() === q) || q === noPertenece.toLowerCase()
  const sugerido = !exactMatch && q.length >= 3
    ? todosLosGrupos.find((g) => g.toLowerCase().includes(q))
    : null

  return (
    <div className="relative">
      <Input
        id="grupoCiclistas"
        name="grupoCiclistas"
        value={formData.grupoCiclistas}
        onChange={(e) => { setFormData({ ...formData, grupoCiclistas: e.target.value }); setGrupoCiclistasOpen(true) }}
        onFocus={() => setGrupoCiclistasOpen(true)}
        onBlur={() => setTimeout(() => setGrupoCiclistasOpen(false), 150)} // delay para permitir click en opción
        placeholder="Escriba o seleccione su grupo"
        className={fieldErrors.grupoCiclistas ? "border-red-500" : ""}
        autoComplete="off"
      />
      {grupoCiclistasOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[220px] overflow-y-auto p-1">
          {sugerido && (
            <div className="border-b mb-1 pb-1">
              <p className="text-xs text-gray-400 px-2 pt-1">¿Quisiste decir?</p>
              <button type="button"
                className="w-full text-left px-2 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 rounded"
                onMouseDown={(e) => { e.preventDefault(); handleSelectChange("grupoCiclistas", sugerido); setGrupoCiclistasOpen(false) }}>
                → {sugerido}
              </button>
            </div>
          )}
          {mostrarNoPertenece && (
            <button type="button" className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
              onMouseDown={(e) => { e.preventDefault(); handleSelectChange("grupoCiclistas", noPertenece); setGrupoCiclistasOpen(false) }}>
              {noPertenece}
            </button>
          )}
          {opcionesFiltradas.map((g) => (
            <button key={g} type="button" className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
              onMouseDown={(e) => { e.preventDefault(); handleSelectChange("grupoCiclistas", g); setGrupoCiclistasOpen(false) }}>
              {g}
            </button>
          ))}
          {q && opcionesFiltradas.length === 0 && !mostrarNoPertenece && (
            <p className="text-xs text-gray-400 px-2 py-2">
              No se encontraron grupos. Se guardará &quot;{formData.grupoCiclistas}&quot; al inscribirse.
            </p>
          )}
        </div>
      )}
    </div>
  )
})()}
<p className="text-xs text-gray-500">
  Escriba el nombre de su grupo o seleccione uno de la lista. Si no existe, se guardará automáticamente.
</p>
```

Puntos clave de la implementación:

- **`onMouseDown` con `preventDefault()`**, no `onClick`. Es lo que evita que el `onBlur` del input (que cierra el dropdown) se dispare antes que el click en la opción — mousedown ocurre antes que blur, click ocurre después.
- **`onBlur` con `setTimeout(..., 150)`**: da tiempo a que el `onMouseDown` de la opción se procese antes de cerrar el dropdown.
- No hay debounce ni fetch por tecla: el filtrado es 100% en memoria sobre `todosLosGrupos`, así que no hace falta.
- `handleSelectChange("grupoCiclistas", valor)` es el mismo setter genérico que usan los `<Select>` del formulario (actualiza `formData` y limpia el error de ese campo).

---

## 3. Envío y alta automática de grupo nuevo

Al armar el payload de submit:

```ts
const grupoIngresado = formData.grupoCiclistas.trim()
const todosActuales = [...new Set([...gruposCiclistas, ...gruposFirebase])]
const gruposExistentes = todosActuales

const res = await fetch("/api/inscripcion/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dni: formData.dni,
    añoParam,
    perfilPersonal,   // incluye grupoCiclistas
    datosCiclo,
    grupoIngresado,
    gruposExistentes, // se manda la lista completa para que el backend decida si es "nuevo"
    nombreArchivo: formData.comprobantePago?.name ?? null,
  }),
})

const json = await res.json()
// ...manejo de error...

// Actualiza el estado local para que, sin recargar, el nuevo grupo
// ya aparezca en el dropdown si el usuario vuelve a tocar el campo.
if (grupoIngresado && grupoIngresado !== "No pertenezco a ninguno" &&
    !gruposExistentes.some((g) => g.toLowerCase() === grupoIngresado.toLowerCase())) {
  setGruposFirebase((prev) => [...prev, grupoIngresado])
}
```

En el backend (`app/api/inscripcion/submit/route.ts`), después de hacer el upsert del participante:

```ts
// Guardar grupo nuevo si corresponde
if (grupoIngresado && grupoIngresado !== "No pertenezco a ninguno") {
  const existentes: string[] = gruposExistentes ?? []
  if (!existentes.some((g: string) => g.toLowerCase() === grupoIngresado.toLowerCase())) {
    const { data: currentConfig } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", "grupos")
      .maybeSingle()
    const listaActual: string[] = currentConfig?.data?.lista ?? []
    if (!listaActual.some((g: string) => g.toLowerCase() === grupoIngresado.toLowerCase())) {
      await supabaseAdmin
        .from("configuracion")
        .upsert({ id: "grupos", data: { lista: [...listaActual, grupoIngresado] } })
    }
  }
}
```

Nota: el backend **relee** la lista actual de la DB (`currentConfig`) en vez de confiar ciegamente en `gruposExistentes` que mandó el cliente — evita pisar altas concurrentes de otros usuarios inscribiéndose al mismo tiempo (aunque hay una ventana de carrera mínima entre el `select` y el `upsert`; para este volumen de uso no es un problema real).

---

## 4. Esquema de datos necesario

Tabla `configuracion` (Supabase), fila fija:

```sql
-- id: text (PK), data: jsonb
insert into configuracion (id, data) values ('grupos', '{"lista": []}');
```

`data.lista` es un array de strings simple. No hay tabla dedicada a "grupos" con id propio; es solo una lista de nombres en un blob JSON. Si el otro proyecto usa Firestore en vez de Supabase, el equivalente sería un documento `configuracion/grupos` con campo `lista: string[]`.

---

## 5. Checklist para clonar

- [ ] Fila/documento de config con `lista: string[]` para grupos (puede arrancar vacía o con una semilla).
- [ ] Lista hardcodeada opcional como fallback/semilla en el frontend (`gruposCiclistas`).
- [ ] `useEffect` que carga la lista de la DB una vez al montar.
- [ ] Input controlado + dropdown propio (no requiere librería de combobox), con:
  - filtrado en memoria por `includes`,
  - opción "no pertenezco a ninguno",
  - sugerencia fuzzy simple si no hay match exacto y el texto tiene 3+ caracteres,
  - `onMouseDown` + `preventDefault()` en las opciones, `onBlur` con `setTimeout(150)`.
- [ ] En el submit: mandar el valor tipeado + la lista de grupos "conocidos" por el cliente.
- [ ] En el backend: si el valor no está en la lista, releer la config actual y hacer upsert agregándolo (evita condiciones de carrera groseras).
- [ ] Actualizar el estado local del cliente tras el submit exitoso para reflejar el alta sin recargar.
