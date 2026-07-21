# Cambios aplicados al módulo de participantes

## Base de datos

Ejecutar la migración:

`supabase/migrations/20260721_participantes_localidad_grupo_celiaco.sql`

La migración:

- reemplaza `provincia` por `localidad`;
- garantiza `pais`;
- agrega `grupo_ciclistas` y `es_celiaco`;
- normaliza `grupo_sanguineo` en mayúsculas;
- elimina `talla_camiseta` de `participantes`.

Después de aplicarla, regenerar los tipos de Supabase si el repositorio los utiliza.

## Formulario

- DNI primero y búsqueda automática con debounce.
- País y ciudad/localidad separados.
- Grupo ciclista y celiaquía.
- Remera eliminada del formulario de inscripción.
- Aviso para solicitarla en `/pedir-remera`.
- Advertencia de que no se reintegra el dinero.

## Administración

- País, localidad, grupo ciclista, celiaquía y salud visibles.
- Acceso al comprobante desde el listado y el detalle.
- Exportación CSV actualizada sin talle.

## Comprobantes

- El bucket `comprobantes` puede permanecer privado.
- Las inscripciones nuevas guardan la ruta estable del archivo, no una URL pública.
- El endpoint autenticado `POST /api/admin/comprobante` genera una URL firmada
  válida por 365 días para usuarios con rol `admin` o `grandteam`.
- Las URLs públicas antiguas también son compatibles: el endpoint extrae la ruta
  del objeto y genera una nueva URL firmada.

## Pantalla final

- Tras enviar, se navega obligatoriamente a `/inscripcion/exito`.
- Se muestran acciones claras para inscribir a otra persona o volver al inicio.
- La pantalla recupera el nombre, número y QR desde `sessionStorage`.

## Validación pendiente en el repositorio completo

El ZIP recibido no incluía `package.json`, lockfile, `tsconfig.json` ni tipos
generados de Supabase. Se validó la sintaxis de todos los archivos TypeScript/TSX,
pero deben ejecutarse en el repositorio completo:

```bash
npm install
npm run lint
npm run build
```
