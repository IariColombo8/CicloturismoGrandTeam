# Conectar Gmail (enviar y recibir correos)

El sitio usa la **Gmail API** para mandar los correos transaccionales
(confirmacion de inscripcion, rechazo, avisos) y para leer y responder la
bandeja desde `/admin/emails`.

No hay dependencias nuevas: se habla con la API REST de Google usando `fetch`
desde las API routes.

---

## 1. Crear el proyecto y habilitar la API

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/) con la
   cuenta de Gmail que va a mandar y recibir los correos del evento.
2. Crear un proyecto (o usar uno existente). Ej: `grand-team-bike`.
3. Ir a **APIs y servicios > Biblioteca**, buscar **Gmail API** y pulsar
   **Habilitar**.

## 2. Configurar la pantalla de consentimiento

1. **APIs y servicios > Pantalla de consentimiento de OAuth**.
2. Tipo de usuario: **Externo**.
3. Datos de la app:
   - Nombre: `Grand Team Bike`
   - Correo de asistencia y de contacto: la cuenta del evento.
4. En **Permisos (scopes)**, agregar manualmente:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
5. **IMPORTANTE — publicar la app**: en la pantalla de consentimiento,
   pulsar **Publicar aplicacion** (estado `En produccion`).

   > Mientras la app esta en modo **Testing**, Google vence el refresh token
   > **cada 7 dias** y hay que volver a autorizar. Publicada, el token no
   > caduca. Al ser una app de uso interno con pocos usuarios, Google no exige
   > verificacion: solo muestra un cartel de "app no verificada" al autorizar,
   > donde hay que entrar en **Configuracion avanzada > Ir a Grand Team Bike**.

## 3. Crear las credenciales OAuth

1. **APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth**.
2. Tipo de aplicacion: **Aplicacion web**.
3. Nombre: `Grand Team Bike - servidor`.
4. En **URIs de redireccionamiento autorizados**, agregar exactamente:

   ```
   http://localhost:5987/callback
   ```

   (lo usa el script de autorizacion; no hace falta ninguna URL de produccion
   porque el token se genera una sola vez desde la maquina local)
5. Guardar y copiar **ID de cliente** y **Secreto de cliente**.

## 4. Cargar las credenciales en `.env.local`

```env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
```

## 5. Generar el refresh token

```bash
npm run gmail:auth
```

El script abre el consentimiento de Google en el navegador. Hay que:

1. Elegir la cuenta de Gmail del evento.
2. Pasar el cartel de "app no verificada"
   (**Configuracion avanzada > Ir a Grand Team Bike**).
3. Aceptar **todos** los permisos pedidos (si se destilda alguno, el panel
   despues falla con "permisos insuficientes").

Al volver, la terminal imprime las lineas para completar `.env.local`:

```env
GOOGLE_REFRESH_TOKEN=1//0gxxxxxxxx
GMAIL_SENDER=lacuentadelevento@gmail.com
GMAIL_SENDER_NAME=Grand Team Bike
```

## 6. Cargar las variables en Vercel

En **Project Settings > Environment Variables** agregar las cinco variables
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
`GMAIL_SENDER`, `GMAIL_SENDER_NAME`) en los entornos Production y Preview, y
hacer un redeploy.

> Las tres primeras son **secretas**: nunca van con prefijo `NEXT_PUBLIC_` ni
> se usan desde componentes cliente. Solo las lee `lib/google/*` desde
> `app/api/email/**`.

## 7. Aplicar la migracion del log de envios

```sql
-- supabase/migrations/20261013_emails_enviados.sql
```

Se corre desde el SQL Editor de Supabase. Guarda un registro de cada envio
(destinatarios, asunto, plantilla, quien lo mando, si salio bien). Si no se
aplica, los envios siguen funcionando: el registro es best-effort.

## 8. Verificar

1. Entrar a `/admin/emails` con un usuario con rol `admin` o `grandteam`.
2. Si todo esta bien, el encabezado muestra `Casilla <cuenta>@gmail.com` y se
   listan los correos recibidos.
3. Probar **Redactar** mandandose un correo a uno mismo, y responder un hilo.

---

## Que quedo implementado

| Pieza | Archivo |
|---|---|
| OAuth2 (refresh token -> access token, con cache) | `lib/google/oauth.ts` |
| Cliente REST de Gmail (listar, leer, enviar, etiquetas) | `lib/google/gmail.ts` |
| Armado de mensajes MIME (UTF-8, HTML + texto, adjuntos) | `lib/google/mime.ts` |
| Plantillas HTML del evento | `lib/email/templates.ts` |
| Tipos compartidos servidor/panel | `lib/email/tipos.ts` |
| Log de envios en Supabase | `lib/email/registro.ts` |
| Fachada para el panel (reemplaza EmailJS) | `lib/emailService.ts` |
| Bandeja de entrada del admin | `app/admin/emails/page.tsx` |

### API Routes

| Ruta | Que hace |
|---|---|
| `GET /api/email/estado` | Diagnostico: que falta configurar, casilla conectada |
| `GET /api/email/inbox` | Lista hilos por carpeta (`recibidos`, `no-leidos`, `enviados`, `archivados`, `papelera`, `todos`) con busqueda estilo Gmail |
| `GET /api/email/thread` | Hilo completo con los cuerpos parseados y saneados |
| `POST /api/email/send` | Envia con plantilla del repo o con HTML/texto propio |
| `POST /api/email/reply` | Responde un hilo manteniendo el enhebrado |
| `POST /api/email/acciones` | Leido / no leido / archivar / papelera / destacar |
| `GET /api/email/adjunto` | Descarga un adjunto de un correo recibido |

Todas exigen sesion de Supabase con rol `admin` o `grandteam`
(`lib/api/autorizar.ts`).

### Seguridad del HTML recibido

Un correo entrante es contenido ajeno, asi que se trata en dos capas:

1. `sanearHtmlEmail()` en el servidor saca `<script>`, `<iframe>`, handlers
   `on*` y URLs `javascript:`.
2. El panel lo renderiza en un `<iframe sandbox="">` con CSP propia
   (`components/admin/emails/VisorMensaje.tsx`), asi nada de lo que llegue por
   correo puede ejecutar JS ni leer la sesion del admin.

---

## Problemas frecuentes

| Sintoma | Causa / solucion |
|---|---|
| `El refresh token de Google ya no es valido (invalid_grant)` | La app quedo en modo Testing (token vence a los 7 dias) o se revoco el acceso. Publicar la app y volver a correr `npm run gmail:auth`. |
| `Permisos insuficientes en el token de Google` | Se destildo un permiso al autorizar. Revocar el acceso en [myaccount.google.com/permissions](https://myaccount.google.com/permissions) y repetir el paso 5. |
| El script no devuelve `refresh_token` | La cuenta ya habia autorizado la app. Revocar el acceso en la misma URL y repetir. |
| `redirect_uri_mismatch` | Falta `http://localhost:5987/callback` en las URIs autorizadas del cliente OAuth. |
| El panel dice "Gmail todavia no esta conectado" en produccion | Faltan las variables en Vercel o no se hizo redeploy despues de agregarlas. |

## Limites de Gmail

Una cuenta gratuita de Gmail permite del orden de **500 destinatarios por
dia**. Para los correos del evento (confirmaciones de a una) alcanza de sobra,
pero un envio masivo a todos los inscriptos conviene hacerlo en tandas.
`POST /api/email/send` corta en 50 destinatarios por request.
