# Notificaciones de inscripcion nueva

Cuando alguien completa el formulario de `/inscripcion`, los organizadores se
enteran por tres vias (las tres ya implementadas):

| Via | Cuando llega | Requiere |
|---|---|---|
| Aviso en el panel | Con `/admin/registro-inscripciones` abierto | Nada |
| Notificacion del navegador | Con el sitio abierto en alguna pestaña, aunque no sea la activa | Permiso del navegador |
| **Push al celular** | **Aunque no tengas nada abierto** | Activarlo en ese dispositivo |

## Como se activa el push (una vez por dispositivo)

1. Entrar a `/admin/registro-inscripciones` con rol `admin` o `grandteam`.
2. Tocar **"Avisarme de inscripciones nuevas"** (arriba a la derecha).
3. Aceptar el permiso que pide el navegador.
4. Probar con el boton **"Probar"**, que manda una notificacion real.

Hay que hacerlo en **cada** dispositivo: activarlo en la compu no hace que
llegue al celular.

> **iPhone**: Safari solo permite push si el sitio esta instalado como app.
> Hay que abrir el sitio en Safari, tocar *Compartir > Agregar a pantalla de
> inicio*, y activar las notificaciones desde ahi (iOS 16.4 o superior).
>
> **Android / Chrome**: funciona directo desde el navegador.

## Que dice la notificacion

```
Nueva inscripcion: Juan Perez
Concepcion del Uruguay · Grand Team
En el BNA deberia haber $1.071.920 con esta
```

El monto es la plata ya verificada **mas esa inscripcion sola**. Se calcula en
`lib/finanzas/saldoEsperado.ts`:

```
  inscripciones confirmadas y cobradas   (suma de monto_pagado)
+ ingresos cobrados
- gastos aprobados y pagados             (los "por participante" x confirmados)
= verificado
+ el precio de la inscripcion que acaba de entrar
= lo que deberia haber en el BNA
```

> **Las pendientes viejas no se suman.** Son transferencias que todavia no se
> verificaron: si se contaran, el numero creceria con plata que quiza nunca
> entro y dejaria de servir para chequear contra el homebanking. El total
> `verificado` coincide con la calculadora de caja de `/admin/gastos` con sus
> valores por defecto, asi que los dos numeros son comparables.
>
> `SaldoEsperado` igual expone `pendientes` e `inscripcionesPendientes` por si
> en algun momento se quiere mostrar ese dato aparte.

## Configuracion del servidor

Las claves VAPID se generaron una sola vez con:

```bash
npm run push:vapid
```

y viven en `.env.local` (y deben cargarse en Vercel):

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # la necesita el navegador
VAPID_PRIVATE_KEY=...              # SECRETA, solo servidor
VAPID_SUBJECT=mailto:grandteamcdelu@gmail.com
```

> **No regenerar las claves.** Si cambian, todos los dispositivos suscriptos
> dejan de recibir avisos y hay que volver a activarlos uno por uno.

## Piezas

| Pieza | Archivo |
|---|---|
| Service Worker (recibe el push, abre el panel al tocar) | `public/sw.js` |
| Envio con VAPID, limpieza de suscripciones muertas | `lib/push/enviar.ts` |
| Armado del mensaje de inscripcion nueva | `lib/push/inscripcion.ts` |
| Calculo del saldo esperado del BNA | `lib/finanzas/saldoEsperado.ts` |
| Alta/baja del dispositivo | `app/api/push/subscribe/route.ts` |
| Notificacion de prueba | `app/api/push/probar/route.ts` |
| Boton de activacion | `components/admin/NotificacionesPush.tsx` |
| Pitido del aviso en pantalla | `lib/sonidoAviso.ts` |
| Disparo real | `app/api/inscripcion/submit/route.ts` |
| Tabla de suscripciones | `supabase/migrations/20261013_push_subscriptions.sql` |

Las suscripciones se guardan en `public.push_subscriptions` y solo se tocan con
`service_role`: un endpoint push es una credencial de envio y no tiene por que
viajar al navegador de nadie.

## Problemas frecuentes

| Sintoma | Causa / solucion |
|---|---|
| El boton dice "Este navegador no admite notificaciones push" | Falta `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, o es un navegador sin soporte (Safari de escritorio viejo, modo incognito). |
| "Bloqueaste las notificaciones para este sitio" | Se rechazo el permiso. Se habilita desde el candado de la barra de direcciones y se recarga. |
| Activo pero no llega nada | Probar con el boton "Probar". Si dice "No hay dispositivos suscriptos", la suscripcion se perdio: desactivar y volver a activar. |
| Dejo de llegar de golpe | Si se regeneraron las claves VAPID, hay que volver a activar en cada dispositivo. |
| En iPhone no aparece el boton de permiso | El sitio no esta abierto como app instalada. Ver la nota de iPhone mas arriba. |
