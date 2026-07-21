# 01 · Inscripciones

Flujo completo de inscripción de participantes. Lo más valioso a clonar: **autocompletado por DNI**, **wizard de 3 pasos**, **número de inscripción por año**, y **apertura/cierre por edición**.

Archivos:
- `app/inscripcion/page.tsx` — redirect al año activo
- `app/inscripcion/[año]/page.tsx` — el formulario (wizard) — archivo grande (~900 líneas)
- `app/api/lookup-participant/route.ts` — busca participante por DNI (service_role)
- `app/api/inscripcion/submit/route.ts` — guarda la inscripción + comprobante
- `app/api/admin/comprobante/route.ts` — resubida de comprobante desde admin

Tabla: `participantes` (PK = `dni`). Doc `configuracion/inscripciones` (ciclos por año) y `configuracion/grupos` (lista de grupos ciclistas). Doc `settings/eventSettings` (datos de pago) y `settings/confirmacion` (textos del popup final).

---

## 1. Apertura / cierre por año

`configuracion.data` para `id = 'inscripciones'`:

```jsonc
{ "ciclos": [
  { "año": 2026, "habilitado": true, "fechaDesde": "2026-01-01", "fechaHasta": "2026-09-30" }
]}
```

`app/inscripcion/page.tsx` (ruta `/inscripcion` sin año) toma `ciclosConfig` del contexto y **redirige** al año correcto:

1. Busca un ciclo `habilitado` cuyo `hoy` esté entre `fechaDesde` y `fechaHasta` → `router.replace('/inscripcion/<año>')`.
2. Si no hay uno en rango pero sí uno `habilitado`, redirige a ese.
3. Si ninguno habilitado → pantalla "Inscripción no disponible".

`app/inscripcion/[año]/page.tsx` lee el año de la URL (`useParams().año`). En este proyecto **no bloquea** por fecha dentro del año (siempre `setCicloStatus("open")`); la gestión de apertura vive en el redirect. En el clon podés endurecerlo validando el ciclo también acá.

Al montar, carga en paralelo `settings/eventSettings` (para `datosPago1`, `datosPago2`) y `settings/confirmacion` (textos del popup de éxito), y `configuracion/grupos` (autocompletado de grupo ciclista).

---

## 2. Wizard de 3 pasos

Estado en un solo `formData` (objeto `emptyForm`). `currentStep` 1→3, barra `Progress`.

- **Paso 1 — Información personal:** nombre, apellido, DNI, fecha nacimiento (DatePicker con selects de mes/año), localidad, email, teléfono + país, teléfono emergencia + país, grupo sanguíneo, género, grupo ciclistas (combo con lista de `configuracion/grupos` + hardcodeados; permite escribir uno nuevo).
- **Paso 2 — Condiciones de salud:** texto libre `condicionesSalud` + `esCeliaco` (radio sí/no).
- **Paso 3 — Pago y términos:** muestra `datosPago1/2`, `nombreTransferencia`, `transferidoA`, subida de comprobante (JPG/PNG/PDF ≤ 5MB), acordeón de términos, **cartel de no-reembolso**, checkbox `aceptaCondiciones` (obligatorio).

`validateStep(step)` valida por paso antes de avanzar. Validadores: nombre/apellido solo letras (incluye acentos/ñ), DNI solo números, email formato, teléfono solo dígitos. `nextStep` solo avanza si valida; hace scroll al top.

---

## 3. Autocompletado por DNI (lo importante)

En el paso 1, un `useEffect` observa `formData.dni` con **debounce 600ms**; si tiene ≥7 dígitos dispara `lookupDni`.

`lookupDni` hace `GET /api/lookup-participant?dni=...`. La API usa **service_role** (bypasea RLS) para leer `participantes` por DNI y devuelve los campos personales + `años`. Nunca se consulta `participantes` desde el browser con anon (RLS lo bloquea).

```ts
// app/api/lookup-participant/route.ts (resumen)
const { data } = await supabaseAdmin
  .from("participantes")
  .select("nombre, apellido, email, telefono, pais_telefono, telefono_emergencia,
           pais_telefono_emergencia, fecha_nacimiento, localidad, grupo_sanguineo,
           genero, grupo_ciclistas, años")
  .eq("dni", dni).maybeSingle()
return json({ found: !!data, data })
```

En el cliente, si `found`:
- Precarga todos los campos en `formData` (normaliza género y grupo sanguíneo a mayúsculas), parsea `fecha_nacimiento` con varios formatos (`parseFecha`).
- Detecta **edición**: si `años` ya incluye el año actual → `isEdicion = true` (toast "Ya estás inscripto este año, tus datos se cargaron para editar"). Si no → "Perfil encontrado, se precargaron tus datos".

Esto permite que un participante recurrente escriba su DNI y tenga todo autocompletado, editando solo lo que cambió.

Validación de entrada en la API: DNI 7+ dígitos y solo números, si no `400`.

---

## 4. Envío (submit)

`handleSubmit` valida los 3 pasos, convierte el comprobante a base64 (`convertToBase64`, límite ~7MB tras leer), arma `perfilPersonal` + `datosCiclo` y hace `POST /api/inscripcion/submit`.

`app/api/inscripcion/submit/route.ts` (service_role):

1. Si viene comprobante → `subirComprobante(dni, base64, nombreArchivo)`: asegura bucket `comprobantes`, decodifica base64 → Buffer, sube a `Storage` en `<dni>/<timestamp>.<ext>`, devuelve `getPublicUrl`.
2. Lee el participante actual (`años`, `numero_inscripcion`).
3. Calcula `años` = unión del set anterior + año nuevo.
4. **Número de inscripción por año:**
   - Si ya estaba inscripto ese año y tiene número → lo conserva.
   - Si no → lee todos los participantes, filtra los que tienen ese año en `años`, toma `MAX(numero_inscripcion)` y suma 1.
5. `upsert` en `participantes` (PK dni) con todos los campos, `estado: "pendiente"`, `acepta_condiciones`, `comprobante_pago_url`, `numero_inscripcion`, `años`.
6. Si el usuario ingresó un **grupo ciclista nuevo** (no en la lista) → lo agrega a `configuracion/grupos.data.lista`.
7. Devuelve `{ ok: true, numeroInscripcion }`.

El cliente muestra un **diálogo de éxito** con los textos de `settings/confirmacion` y resetea el formulario.

> Detalle: el `upsert` con PK = dni hace que **reinscribirse** o **editar** sea la misma operación. La identidad del participante es el DNI, y `años[]` acumula ediciones.

---

## 5. Comprobante desde admin

`app/api/admin/comprobante/route.ts` permite resubir/actualizar el comprobante de un participante ya inscripto: sube a Storage y hace `update` de `comprobante_pago_url` en `participantes` por DNI.

---

## Checklist para clonar

- [ ] Tabla `participantes` con PK `dni`, `años int[]`, `numero_inscripcion int`, `comprobante_pago_url`, campos personales.
- [ ] `configuracion/inscripciones` (ciclos) y `configuracion/grupos`.
- [ ] `settings/eventSettings` (datos de pago) y `settings/confirmacion` (textos).
- [ ] API `lookup-participant` con service_role (autocompletado DNI, debounce 600ms).
- [ ] API `inscripcion/submit`: upsert por dni + número por año + comprobante a Storage + alta de grupo nuevo.
- [ ] Bucket público `comprobantes` (se crea on-demand).
- [ ] Redirect `/inscripcion` → `/inscripcion/<año activo>`.
- [ ] Cartel de no-reembolso + checkbox obligatorio en el paso 3.
