# Skill: Firebase y Backend

Eres un experto en la configuración de Firebase del proyecto Grand Team Bike 2026.

## Archivos principales
- `lib/firebase.js` - Inicialización (exporta db, auth, app, analytics)
- `lib/emailService.ts` - Servicio de emails con EmailJS
- `lib/imageUtils.ts` - Compresión de imágenes a base64
- `lib/exportUtils.ts` - Exportación a CSV/Excel
- `components/providers/FirebaseProvider.tsx` - Context global (user, role, settings)
- `FIREBASE_SETUP.md` - Documentación de configuración

## Proyecto Firebase
- ID: `cicloturismo-35fd8`
- Servicios: Firestore, Auth, Analytics, Storage (gastos)

## Colecciones Firestore

### administrador/{emailKey}
```
email, displayName, photoURL, role ("admin"|"grandteam"|"usuario"),
loginMethod ("google"|"email"), createdAt, lastLogin
```
emailKey = email con @ y . reemplazados por _

### inscripciones/{id}
```
ID: "Inscripciones_2026 - XXX-NombreApellido"
nombres, apellidos, cedula, email, telefono, fechaNacimiento, pais, ciudad,
nombreEmergencia, telefonoEmergencia, relacionEmergencia,
haRecorridoDistancia, tallaCamiseta, tipoSangre, tieneAlergias, alergias,
tieneProblemasSalud, condicionesMedicas,
metodoPago, numeroReferencia, comprobanteBase64,
numeroInscripcion, estado, fechaInscripcion, aprobadoPorAdmin
```

### counters/inscripciones_2026
```
count (auto-incremental via runTransaction)
```

### eventos/2026
```
costoInscripcion, aliasTransferencia, datosTransferencia,
nombre, fecha, ubicacion, recorrido, cupo, contacto, redes...
```

### settings/eventSettings
```
cupoMaximo (default 300), precio (default 35000),
metodoPago, inscripcionesAbiertas, currentYear (2026)
```

### gastos_2026/{id}
```
Gastos con estados: pendiente, aprobado, rechazado
Categorías: equipamiento, premios, logística, marketing, alimentación, otro
```

## EmailJS
- Template confirmación: "template_2fg4bhx"
- Templates por crear: rejection ("template_rejection"), reminder ("template_reminder")
- Funciones: sendConfirmationEmail, sendRejectionEmail, sendReminderEmail, sendCustomEmail, sendBulkEmails

## Variables de entorno
Todas con prefijo `NEXT_PUBLIC_`:
FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET,
FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, FIREBASE_MEASUREMENT_ID,
EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY

## Reglas
- Todo Firebase es client-side ("use client")
- Nunca exponer credenciales en código
- Usar serverTimestamp() para fechas
- Usar runTransaction() para operaciones atómicas (counters)
- onSnapshot() para datos en tiempo real, getDocs() para lecturas puntuales

## Instrucción
Analiza lo que el usuario necesita de Firebase o servicios backend. Lee los archivos relevantes antes de modificar. Mantén la estructura de colecciones existente.
