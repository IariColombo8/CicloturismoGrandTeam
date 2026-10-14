# Errores del lado del cliente

## Que ve el usuario

No hay mas "Application error: a client-side exception has occurred" (el cartel
generico de Vercel, que no dice nada y obliga a abrir la consola). Cualquier
excepcion del cliente cae en un error boundary propio:

| Archivo | Que cubre |
|---|---|
| `app/error.tsx` | Errores de cualquier pagina |
| `app/global-error.tsx` | Errores del layout raiz (providers, fuentes) |
| `components/ErrorPantalla.tsx` | La pantalla en si, compartida por los dos |

La pantalla muestra el mensaje real del error (desplegable, legible desde un
celular), y tres acciones: **Recargar de cero**, **Reintentar** e **Ir al inicio**.

## ChunkLoadError: "Loading chunk X failed"

Es el error mas comun del sitio y no significa que haya un bug en la pagina: el
navegador no pudo bajar uno de los archivos JS.

Pasa por dos motivos:

1. **Deploy nuevo.** Cada deploy cambia los nombres de los archivos JS. Las
   paginas se sirven con `s-maxage=60, stale-while-revalidate=300`
   (`next.config.mjs`), asi que durante unos minutos el CDN puede entregar un
   HTML viejo que pide archivos que ya no existen.
2. **Copia rota en la cache del telefono.** Los archivos se sirven con
   `max-age=31536000, immutable`. Si una descarga quedo cortada (señal
   intermitente, cambio de red), el navegador reusa esa copia rota **sin volver
   a pedirla**, y el error se repite para siempre: recargar no alcanza, porque
   recargar no vuelve a bajar un archivo `immutable`.

### Como se recupera

`ErrorPantalla` detecta el caso, saca las URLs de los archivos que fallaron del
mensaje del error y les hace `fetch(url, { cache: "reload" })`, que es la unica
forma de sobrescribir una entrada de la cache HTTP desde JavaScript (no existe
una API para vaciarla). Despues desregistra service workers, borra la Cache API
y recarga con un parametro distinto para no reusar el HTML.

Eso se hace **solo, una vez por pestaña**, con un flag en `sessionStorage` para
no entrar en loop de recargas. Si despues del reintento el error vuelve, ya se
muestra la pantalla con el detalle y los botones manuales.

### Si igual sigue fallando

Quiere decir que el archivo no se puede bajar (red, proxy del ISP, extension que
bloquea). Para confirmar que el servidor esta bien, pedir el archivo que nombra
el error:

```bash
curl -sI https://grand-team.vercel.app/_next/static/chunks/app/admin/gastos/page-XXXX.js
```

Tiene que dar `200`, `Content-Type: application/javascript` y un
`Content-Length` que coincida con lo que se descarga. Si eso esta bien, el
problema es del dispositivo: borrar los datos del sitio (candado de la barra de
direcciones > Configuracion del sitio > Borrar datos) o probar en una ventana de
incognito.
