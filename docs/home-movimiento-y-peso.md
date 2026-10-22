# La home: movimiento, y por qué pesa 15 veces menos

Rama `diseño`, octubre de 2026. Dos cosas a la vez: que la página se mueva como
lo que es (una salida en bici, no una carrera) y que entre rápido en un celular
con 4G lento, que es con lo que la va a abrir casi todo el mundo.

## 1. El problema de peso

PageSpeed, 19/10/2026, móvil:

| Medición | Antes |
|---|---|
| Rendimiento (móvil) | **68** |
| LCP del laboratorio | **37,7 s** |
| Peso total de la página | **19.888 KiB** |
| "Mejorar la entrega de imágenes" | 11.812 KiB |
| "Tiempos de vida de caché" | 7.350 KiB |

Casi todo eran imágenes. Tres causas, las tres arregladas:

### a) Archivos del repo enormes

`remera.png`, `remerab.png` y `remeran.png` pesaban 1,4 MB **cada uno** (4096 px
de ancho para una tarjeta de 400), y había logos de sponsors de hasta 2 MB.

`node scripts/optimizar-imagenes.mjs` los reescribe **en su lugar**, con el
mismo nombre y el mismo formato: 12,3 MB → 3,3 MB. Mismo nombre a propósito:
hay URLs guardadas en `content_settings` y links que ya circulan por WhatsApp.
Es idempotente (si no ahorra al menos un 5%, descarta el resultado) y no toca
las piezas de diseño de las que salen otras cosas (`remera-og.png`,
`METADATOS.png`, los favicon, `public/og/`, `public/app/`).

**Al agregar una imagen a `public/`, correr el script.**

### b) 52 logos de sponsors sin comprimir y sin caché

Los logos viven en Supabase Storage, que los sirve en el tamaño original y con
`Cache-Control: no-cache`. Además se pedían con `loading="eager"`, así que los
52 se bajaban enteros en la carga inicial.

`lib/imagenes/optimizarUrl.ts` (`urlOptimizada` / `srcSetOptimizado`) arma la
URL del optimizador de Next, que los devuelve en AVIF/WebP, al ancho real de la
tarjeta y con caché. Un logo típico pasó de **51 KB a 2,9 KB**.

Regla: **si la URL no se puede optimizar, se devuelve tal cual**. Y en pantalla
hay tres pasos ante un fallo — optimizada → original → placeholder — así que un
problema del optimizador nunca deja una tarjeta vacía. Lo usan `Sponsors.tsx`,
`Alojamientos.tsx` y `RemeraSection.tsx`.

Los hosts permitidos están en dos lados que tienen que coincidir:
`images.remotePatterns` en `next.config.mjs` y `hostOptimizable()` en el helper.
Una URL que no matchee da 400 y no se ve.

### c) Las imágenes de `public/` no se cacheaban

Caían en la regla genérica de páginas de `next.config.mjs`
(`max-age=0, s-maxage=60`), así que el navegador volvía a bajar las remeras y
los logos **en cada visita**.

Ahora hay una regla propia para `png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|otf`:
30 días. Va **después** de la de páginas a propósito: cuando dos reglas
coinciden, la última define el valor. Son 30 días y no un año (ni `immutable`)
porque estas imágenes se reemplazan a veces sin cambiarles el nombre.

### Resultado

Medido sobre el build de producción, recorriendo la página entera con los 52
sponsors cargados (`scripts/_medir-home.mjs`, no versionado):

| | Antes | Ahora |
|---|---|---|
| Peso total | 19.888 KiB | **~1.300 KiB** |
| Imágenes | ~12 MB | 140 KB (AVIF) |
| JS de la home (First Load) | 272 kB | 238 kB |

El JS bajó porque `RemeroFormModal` (2.400 líneas que solo hacen falta al tocar
"Pedir mi remera") pasó a `dynamic import` y se monta recién al abrirlo.

## 2. El movimiento

Referencias que pidió el usuario: tim-car.vercel.app y elmangrullo.ar —
reveals al scrollear, cintas de texto, contadores, parallax suave.

### Las tres reglas

1. **Solo se anima `transform` y `opacity`.** Son las dos propiedades que el
   navegador resuelve en la GPU. Animar `width`, `left`, `background-position` o
   `box-shadow` lo obliga a rehacer el layout en cada cuadro: eso era lo que
   PageSpeed marcaba como "animaciones no compuestas" (5 en móvil, 6 en
   escritorio). Por eso cambiaron `glowPulse` (ahora opacidad de una capa),
   `dynamic-line` (ahora `translate3d`) y `gradient-text-intense` (gradiente
   fijo), y por eso se fue el `<style jsx>` de `Sponsors.tsx`.
2. **Nada se mueve por scroll con JavaScript** salvo el parallax del hero y la
   barra de progreso, y los dos escriben una sola propiedad desde
   `requestAnimationFrame`, sin un render de React por cuadro.
3. **Con "reducir movimiento" se suaviza, no se apaga** (bloque al final de
   `globals.css`): muchos celulares lo prenden solos con el ahorro de batería y
   la home quedaba quieta. Quedan el aparecer (12 px, lento), la cinta a media
   velocidad, las manchas flotando y la bici cruzando más despacio; se apaga
   solo el parallax. En el hero de celular, si el navegador no soporta
   `animation-timeline` (Safari de iPhone), el parallax lo hace el mismo
   listener con `requestAnimationFrame` de la compu.

### Las piezas

| Dónde | Qué hace |
|---|---|
| `components/ui/Revelar.tsx` | Aparecer al llegar con el scroll. **Un solo** IntersectionObserver para toda la página (son más de 50 bloques). |
| `components/ui/CintaPalabras.tsx` | La cinta del pie del hero. La lista va duplicada y la animación corre media vuelta: el empalme no se ve. |
| `components/ui/NumeroAnimado.tsx` | Los cupos que suben desde cero. Escribe con `textContent`, no re-renderiza. |
| `components/ui/BarraProgresoLectura.tsx` | El hilo dorado de arriba (`scaleX`). |
| `.gt-parallax` en `globals.css` | El fondo del hero. El hero escribe `--gt-scroll` (0 a 1) y el CSS hace el resto. |
| `.gt-linea` | La línea del recorrido, que se dibuja sola. |
| `.gt-ciclista`, `.gt-aura`, `.gt-brillo`, `.gt-escalonar` | Silueta que cruza, resplandor que late, brillo al pasar el mouse, entrada escalonada de una grilla. |

### Sin JavaScript no desaparece nada

Los bloques se renderizan ya con `gt-revelar` (igual en el servidor y en el
cliente: no hay parpadeo al hidratar) y el observador les agrega `gt-visible`.
Si el JS no corre, el `<noscript>` de `app/layout.tsx` los muestra igual.

Hay un test que lo cuida (`e2e/smoke.spec.ts`): después de recorrer la home, no
puede quedar **ningún** `.gt-revelar` sin `.gt-visible`. Si el observador se
rompiera, media home quedaría en blanco y el test lo caza.

### Que no se trabe en el celular (22/10/2026)

En el celular el scroll "pegaba tirones". No era una animación en particular:
era trabajo de pintado que el teléfono tenía que rehacer en cada cuadro.

| Qué | Por qué trababa | Ahora |
|---|---|---|
| Menú fijo con `backdrop-blur-lg` | Rehacer el desenfoque de la página en cada cuadro del scroll | En celular es opaco (`bg-black` debajo del gradiente); el blur queda desde `md` |
| `.glass` (datos del hero, cuenta regresiva, cierre) | Lo mismo, en varias tarjetas | Sin `backdrop-filter` en celular / pantalla táctil |
| Manchas `blur-3xl` de fondo (Quiénes somos, Recorrido, Galería, Footer) | Capas enormes con blur | `hidden sm:block`, igual que ya hacía el hero |
| `will-change` en los 50+ `.gt-revelar` | Una capa de GPU por bloque desde la carga | Sin `will-change`: la transición sube el bloque a la GPU solo mientras se mueve |
| `will-change` del fondo del hero | Capa de pantalla completa reservada aunque en celular no se mueve | Solo en `(min-width: 768px) and (pointer: fine)` |
| Cinta de palabras | El `gap` hacía que el -50% no cayera en el empalme: saltito en cada vuelta | El espacio va como margen de cada pieza |
| Cuenta regresiva | Re-renderizaba la sección entera cada segundo, siempre | Componente propio, y el reloj corre solo si está en pantalla y la pestaña visible |
| 52 tarjetas de sponsors con `backdrop-blur-sm` y `transition-all` | Blur por tarjeta | Sin blur (el fondo ya es opaco) y transición solo de transform/borde/sombra |

**Regla:** nada con `backdrop-filter` ni `blur-*` grande que quede en pantalla
mientras se scrollea en celular. En un modal (contenido quieto) no molesta.

## 3. Lo que dice la página

Es **cicloturismo**, no una carrera. Los textos decían "la aventura más
desafiante", "50 km de pura adrenalina", "el desafío de tu vida" y "competencia".
Ahora: "no es una carrera", "a tu ritmo", "se sale juntos y se vuelve juntos",
"se para a sacar fotos". Y en voseo, como el resto del sitio.

Además se sacaron datos que no eran ciertos:

- Las estadísticas "5+ años / 1000+ ciclistas / 300 km / 100% satisfacción"
  estaban escritas en `AboutTeam.tsx` (no se mostraban, pero estaban).
- Los sellos "Pago protegido" y "Soporte 24/7" del cierre: el pago es por
  transferencia y contesta gente del equipo. Ahora dice lo que de verdad pasa
  después de inscribirse.
- El precio del hero estaba escrito a mano (`$25.000`). Ahora sale de
  `event_settings.precio`, el mismo que cobra la inscripción; mientras no cargó
  no muestra un número inventado.
- El `startDate` del JSON-LD decía 15 de noviembre y todo el resto del sitio, 8.
  Ahora sale de `lib/constants.ts`.

## 4. Accesibilidad

- Encabezados en orden (`h1 → h2 → h3`, sin saltos): el `h4` de los puntos del
  recorrido pasó a `h3`.
- `<main>` en `/inscripcion`, que no tenía landmark principal.
- La barra de progreso de la inscripción tiene `aria-label` ("Paso 2 de 4").
- `id="contacto"` estaba repetido en el footer y en la sección de contacto, así
  que el link del menú caía siempre en el primero. Quedó solo en la sección.
