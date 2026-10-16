# Sorteos

Sorteos del día del evento: el bolillero del panel (`/admin/sorteos`) y la
página pública con los premios y los ganadores (`/sorteos`).

Pensado para el escenario: **funciona sin internet**, nadie puede salir dos
veces hasta que salieron todos, y un premio que no se reclama nunca se pierde.

## Las dos partes del panel

`/admin/sorteos` tiene dos pestañas:

| Pestaña | Para qué |
|---|---|
| **Sortear** | El bolillero: botón grande, el ganador en pantalla, "Reclamó" / "No está", la lista de los que no reclamaron y los ganadores. |
| **Configuración** | Las tandas de sorteo: cuántos sorteos hacer, los premios con foto y quién entra. |

Se pueden tener varias **tandas**: "Sorteo de premios" (muchas cosas) y "Sorteo
de la bici" aparte. Cada tanda arranca de cero: haber salido en una no saca a
nadie de la otra.

## Reglas del bolillero

1. **Nadie sale dos veces en la misma ronda.** Si hay más sorteos que gente
   (300 premios, 100 inscriptos), primero sale **todo el mundo** y recién ahí
   arranca la ronda 2 con el bolillero lleno otra vez. La pantalla avisa la
   ronda en la que está.
2. **El que no reclama queda afuera de lo que resta** y pasa a la lista de "no
   reclamaron", con su premio marcado como sin dueño.
3. **Repesca**: "Rehacer el sorteo de los que no reclamaron" sortea *solo* esos
   nombres, por los premios que quedaron sin dueño. Los que ya ganaron no
   vuelven a entrar. Se puede repescar en cualquier momento y tantas veces como
   haga falta; si el repescado tampoco aparece, su premio vuelve a la lista.
4. Si la persona aparece más tarde, el botón "Apareció, reclamó" de la lista la
   arregla sin tener que sortear de nuevo.

Todo esto vive en `lib/sorteos.ts`, que es **puro** (no toca Supabase ni el
DOM) y está cubierto por `e2e/unit/sorteos.spec.ts`.

### Por qué hay "slots"

Cada tirada resuelve un **puesto** (`slot` 1..total_sorteos) y vale el último
resultado de ese puesto. Trabajar por puesto —y no "lo que quedó de la vuelta
anterior"— es lo que garantiza que ningún premio se pierda: se puede repescar
en cualquier orden sin llevar la cuenta a mano.

`vuelta` es 0 (sorteo original) o 1 (repesca). Las repeticiones dentro de la
repesca las maneja `ronda`, igual que en el sorteo original.

## Quién entra al sorteo

`participantesElegibles()` arma el bolillero desde `participantes` (edición
2026). En este orden:

- Las **rechazadas** nunca entran.
- **Lista cerrada** (`incluir_participantes`): si tiene gente, el sorteo es solo
  entre ellos y se ignoran los filtros.
- `solo_confirmados` (por defecto sí) y `solo_acreditados` (check-in del día).
- **Grupos excluidos** (`excluir_grupos`), ej. "Grand Team Bike", que organiza.
  Se comparan sin acentos ni mayúsculas: los grupos se cargan a mano y
  "Paysandú" / "Paysandu" son el mismo grupo.
- **Personas excluidas a mano** (`excluir_participantes`).

El editor muestra en vivo cuánta gente queda adentro.

## Premios

No hace falta cargarlos todos: con los importantes alcanza. Cada premio tiene
nombre, foto, cantidad (3 gorras = 3 tiradas) y si se muestra en la web. Las
tiradas sin premio cargado se anuncian como "Premio N".

Las fotos se suben con `POST /api/sorteos/upload-imagen` al bucket `sponsors`,
carpeta `sorteos/`.

## Sin internet (importante)

El día del evento no hay wifi. La configuración se hace antes, con conexión; el
sorteo funciona entero en el dispositivo:

- **Precarga**: al abrir `/admin/sorteos` con conexión se guarda en el
  dispositivo todo lo necesario (sorteos, premios, resultados y los inscriptos)
  — `lib/sorteosLocal.ts`. El cartel de arriba dice de cuándo es la copia.
- **Sin conexión**: se usa esa copia. El azar se tira en el teléfono, y cada
  tirada se guarda local con su UUID.
- **Cola de subida**: lo que se sorteó sin señal se sube solo al volver la
  conexión (o con el botón "Subir N cambios"). Como cada tirada ya tiene su id,
  subirla dos veces no duplica nada (es un `upsert`).
- **La página abre sin red**: el Service Worker guarda `/admin/sorteos` y sus
  archivos JS. Es la única ruta de `/admin` que se cachea (`IGUAL_SE_GUARDA` en
  `public/sw.js`); el resto del panel sigue pidiendo todo a la red.

> Para que esto funcione hay que **abrir `/admin/sorteos` con wifi al menos una
> vez** desde el dispositivo que se va a usar en el escenario, y dejarlo abierto
> o volver a abrirlo cuando ya no haya señal.

La barra espaciadora también sortea: en el escenario se usa con una mano.

## Página pública

`/sorteos` muestra, de las tandas marcadas **públicas**: la descripción, los
premios visibles y los ganadores que reclamaron. Se actualiza en vivo (canal
realtime de `sorteo_resultados`), así la gente lo sigue desde el celular.

La home tiene además una sección corta (`components/home/Sorteos.tsx`,
`#sorteos`) con un adelanto de los premios y los últimos ganadores, que no se
renderiza si no hay nada publicado.

### Qué se publica y qué no

En estas tablas **no se guarda el DNI**: la persona se referencia por
`participante_id` y se copian nombre y localidad, que es lo que se anuncia. La
RLS deja leer públicamente solo lo de las tandas con `publico = true`, y el rol
`anon` ni siquiera tiene permiso sobre las columnas de exclusiones (dicen a
quién se dejó afuera).

## Tablas

```
public.sorteos            -> nombre, descripcion, total_sorteos, estado, publico, orden,
                             excluir_grupos TEXT[], excluir_participantes UUID[],
                             incluir_participantes UUID[], solo_confirmados, solo_acreditados
public.sorteo_premios     -> sorteo_id, nombre, descripcion, imagen_url, cantidad, visible, orden
public.sorteo_resultados  -> sorteo_id, premio_id, premio_nombre, orden, slot, ronda, vuelta,
                             participante_id, nombre, localidad, grupo, estado, resuelto_en
  estado: "pendiente" (esperando respuesta) | "reclamado" | "no_reclamo"
```

Migración: `supabase/migrations/20261015_sorteos.sql`.

## Archivos

| Archivo | Qué hace |
|---|---|
| `lib/sorteos.ts` | Tipos y toda la lógica del bolillero (pura, testeada). |
| `lib/sorteosLocal.ts` | Precarga y cola de subida para trabajar sin internet. |
| `app/admin/sorteos/page.tsx` | Panel con las dos pestañas. |
| `app/admin/sorteos/useSorteos.ts` | Carga, precarga, sincronización y mutaciones. |
| `app/admin/sorteos/Bolillero.tsx` | La pantalla del escenario. |
| `app/admin/sorteos/EditorSorteo.tsx` | Configuración de la tanda y sus premios. |
| `app/admin/sorteos/SelectorPersonas.tsx` | Buscador de inscriptos para las listas. |
| `app/sorteos/page.tsx` | Página pública (premios + ganadores, en vivo). |
| `components/home/Sorteos.tsx` | Sección de la landing. |
| `app/api/sorteos/upload-imagen/route.ts` | Subida de fotos de premios. |
| `e2e/unit/sorteos.spec.ts` | 23 tests de las reglas del bolillero. |
