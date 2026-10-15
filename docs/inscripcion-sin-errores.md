# La inscripcion no puede fallar

Regla del formulario publico de inscripcion (`/inscripcion`): **nadie puede
quedarse sin inscribirse por un problema tecnico.** Ni por el comprobante, ni
por la conexion, ni porque el servidor se cayo justo en ese momento. La persona
cargo cuatro pasos de datos: si algo falla, el problema es nuestro y se resuelve
sin molestarla.

Esto nacio de dos errores reales en el celular:

1. **"El comprobante supera los 5 MB".** El formulario rechazaba cualquier
   archivo de mas de 5 MB, y una foto de un celular medianamente nuevo pasa de
   5 MB sin esfuerzo. La persona completaba todo y se quedaba sin poder enviar.
2. **La fecha de nacimiento no se podia cargar.** Era un `<input type="date">`,
   que depende del selector nativo del sistema. En el navegador que trae
   Instagram y Facebook (por donde entra buena parte de la gente) y en varios
   Android ese selector no abre, y como el campo tampoco deja escribir, no habia
   forma de pasar del paso 1.

## Fecha de nacimiento: tres campos, nada de calendarios

`components/inscripcion/CampoFecha.tsx` son tres campos comunes: dia (numerico),
mes (`<select>` con los nombres) y año (numerico), con salto automatico entre
ellos. Es HTML que funciona igual en cualquier telefono, navegador o WebView.

- El mes va con nombre, asi nadie duda si primero va el dia o el mes.
- Hacia afuera sigue hablando en ISO (`aaaa-mm-dd`), que es lo que guarda la
  base: el resto del formulario no cambio.
- Muestra la edad calculada, y avisa (sin bloquear ni asustar) si la fecha no
  existe ("31 de febrero") o si el año no da una edad creible.
- Hay un `<input type="hidden" id="fechaNacimiento">` con el valor ISO: es lo
  que leen los tests.

## Comprobante: cualquier archivo, cualquier tamaño

`lib/inscripcion/comprobante.ts` prepara el archivo y **nunca lanza una
excepcion**. Devuelve el base64 listo, o vacio con el motivo escrito.

| Caso | Que pasa |
|---|---|
| Foto de cualquier peso (20 MB, 40 MB) | Se reduce en el telefono a ~450 KB: ancho maximo 1600 px y, si no alcanza, se baja ancho y calidad por pasos |
| Foto que el navegador no puede decodificar (HEIC en Android, archivo dañado) | Si es chica y de un tipo que el servidor acepta, va cruda; si no, la inscripcion viaja con la nota |
| PDF de hasta 3 MB | Va tal cual |
| PDF mas grande | La inscripcion entra con la nota "pedirselo por WhatsApp" |
| Otro formato (un `.docx`) | Igual: entra con la nota |

Dos detalles importantes:

- **Se prepara al elegir el archivo, no al enviar.** Antes la compresion corria
  en el submit, con el cartel "Procesando comprobante...", que en un celular con
  una foto grande tardaba un monton y era justo donde fallaba. Ahora se procesa
  mientras la persona sigue llenando el formulario y el envio es inmediato.
- **No hay limite de tamaño de entrada.** El `accept` incluye HEIC/HEIF, porque
  es lo que sacan los iPhone por defecto.

## Sin internet: la inscripcion queda guardada y se envia sola

`lib/inscripcion/envio.ts`:

1. POST con timeout de 25 s y hasta 3 intentos (0 s, 1,5 s, 4 s). Si el
   navegador ya sabe que esta sin internet, no gasta los intentos.
2. Si no sale, la inscripcion completa queda en **IndexedDB** (con fallback a
   `localStorage` para Safari en modo privado).
3. Se reintenta sola: cuando vuelve la conexion (evento `online`), al abrir
   `/inscripcion` o `/inscripcion/exito`, y cada 30 segundos mientras quede algo
   pendiente.
4. El alta del servidor es un UPSERT por DNI, asi que reintentar de mas **no
   duplica a nadie**.

La persona ve una confirmacion **en la misma pantalla**, no en
`/inscripcion/exito`: sin internet el navegador no puede cargar ninguna pagina y
mostraria su propio cartel de error. Cuando la inscripcion sale, el cartel cambia
solo a "¡Inscripcion enviada!" sin recargar nada.

Cuando si hay conexion, la pantalla de exito se precarga (`router.prefetch`) al
llegar al paso 4 y se navega del lado del cliente: asi entra incluso si la red se
corta justo despues de enviar.

## El servidor tampoco rechaza

`lib/inscripcion-schema.ts` y `app/api/inscripcion/submit/route.ts`:

- Lo unico imprescindible es el **DNI** (es la clave de la fila) y el **nombre**.
  Todo lo demas se normaliza a algo guardable: un email con un typo entra, un
  pais fuera de la lista se guarda tal cual, un grupo sanguineo raro queda
  `DESCONOCIDO`, los si/no toleran acentos y booleanos.
- Si el comprobante no se puede subir (formato, peso, Storage caido), la
  inscripcion **se guarda igual** y el motivo va a `participantes.comprobante_nota`.
- El aviso push a los organizadores y el alta del grupo nuevo van en `try/catch`:
  la inscripcion ya esta guardada y nada de eso puede devolver un error.

Antes, cualquiera de esos casos devolvia `400 Datos invalidos` o `500` despues de
los cuatro pasos. Una fila con un dato para revisar es muchisimo mejor que una
inscripcion que no existe.

## Donde lo ve el equipo

En `/admin/registro-inscripciones`:

- En la grilla, un cartelito ambar **"Falta comprobante"** (con el motivo en el
  tooltip) en las inscripciones que llegaron sin archivo.
- En el detalle, un bloque ambar con el motivo completo.

El pedido de remera (`components/remera/RemeroFormModal.tsx`) usa el mismo
preparador de comprobante, asi que tampoco rechaza archivos grandes.

## Tests

| Archivo | Que cubre |
|---|---|
| `e2e/inscripcion-celular.spec.ts` | Los 4 pasos en un Pixel 5, con el test fallando si aparece **cualquier** excepcion de JS. Comprobante de 25 MB, PDF de 30 MB, sin internet, servidor caido (500) y conexion que nunca responde |
| `e2e/responsive.spec.ts` | Las 7 paginas publicas en 320, 360, 390, 768 y 1280 px: nada puede salirse de la pantalla. Si algo se desborda, el error dice el elemento y su clase |
| `e2e/unit/comprobante.spec.ts` | `prepararComprobante` nunca lanza, ni con archivos rotos o sin canvas |
| `e2e/unit/inscripcion-schema.spec.ts` | Que el schema normalice en vez de rechazar |

`e2e/helpers.ts` tiene `abrirInscripcion()`, que espera a que React tome el
control antes de escribir: sin eso los tests escriben antes de la hidratacion,
el texto aparece en pantalla y el formulario no se entera de nada.

```bash
npm run test:unit    # rapido, sin navegador
npm run test:e2e     # levanta el dev server en 3100
```
