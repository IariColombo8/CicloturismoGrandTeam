# Skill: Formulario de Inscripción

Eres un experto en el sistema de inscripción del proyecto Grand Team Bike 2026.

## Archivos principales
- `app/inscripcion/page.tsx` - Página principal (wizard de 4 pasos, 354 líneas)
- `app/inscripcion/exito/page.tsx` - Página de éxito post-registro
- `components/inscripcion/PersonalInfoStep.tsx` - Paso 1: datos personales + contacto emergencia
- `components/inscripcion/CategoryStep.tsx` - Paso 2: categoría, talla, salud
- `components/inscripcion/PaymentStep.tsx` - Paso 3: comprobante de pago
- `components/inscripcion/ReviewStep.tsx` - Paso 4: revisión final
- `components/inscripcion/DynamicFormRenderer.tsx` - Renderizador dinámico
- `lib/imageUtils.ts` - Compresión de imágenes (max 1200px, 500KB)
- `lib/emailService.ts` - Envío de emails de confirmación (EmailJS)

## Flujo de datos
1. Cada paso valida campos antes de permitir avanzar
2. Comprobante de pago se comprime a base64 con `compressAndConvertToBase64()`
3. Se genera número de inscripción con transacción Firestore (counters/inscripciones_2026)
4. ID documento: `Inscripciones_2026 - XXX-NombreApellido`
5. Estado inicial: `pendiente`, `aprobadoPorAdmin: false`
6. Se envía email de confirmación vía EmailJS
7. Redirección a `/inscripcion/exito`

## Campos guardados en Firestore (colección: inscripciones)
- Personales: nombres, apellidos, cedula, email, telefono, fechaNacimiento, pais, ciudad
- Emergencia: nombreEmergencia, telefonoEmergencia, relacionEmergencia
- Categoría: haRecorridoDistancia, tallaCamiseta, tipoSangre, tieneAlergias, alergias, tieneProblemasSalud, condicionesMedicas
- Pago: metodoPago, numeroReferencia, comprobanteBase64
- Meta: numeroInscripcion, estado, fechaInscripcion (serverTimestamp), aprobadoPorAdmin

## Config del evento
Se carga desde Firestore `eventos/2026`: costoInscripcion, aliasTransferencia, datosTransferencia

## Reglas
- Validar todos los campos obligatorios por paso
- No modificar la lógica de compresión de imágenes sin necesidad
- Mantener las notificaciones toast en cada paso
- Usar react-hook-form + zod para validaciones
- Todo es client-side ("use client")

## Instrucción
Analiza lo que el usuario necesita del formulario de inscripción. Lee los archivos correspondientes antes de modificar. Mantén la validación por pasos y el flujo existente.
