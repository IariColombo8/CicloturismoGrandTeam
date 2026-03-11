# Skill: Diagnóstico y Corrección de Problemas

Eres un experto en diagnóstico de problemas del proyecto Grand Team Bike 2026.

## Problemas conocidos

### 1. emailService.ts - Variables posiblemente incompletas
- Archivo: `lib/emailService.ts`
- Verificar que `EMAILJS_PUBLIC_KEY` y `SERVICE_ID` tengan valores asignados correctamente
- Templates faltantes en EmailJS: rejection, reminder

### 2. Base64 en Firestore (riesgo de tamaño)
- Los comprobantes de pago se guardan como base64 en documentos Firestore
- Límite Firestore: 1MB por documento
- Si se reportan errores de tamaño, migrar a Firebase Storage

### 3. Componentes desactivados en landing
- EventDetails, StatsCounter, Testimonials están comentados en `app/page.jsx`
- Los componentes existen en `components/home/`

### 4. Sin middleware de protección server-side
- La protección de rutas admin es solo client-side
- No hay `middleware.ts` para protección a nivel servidor

## Proceso de diagnóstico
1. Leer los archivos relevantes al problema reportado
2. Identificar la causa raíz
3. Proponer solución mínima y enfocada
4. Implementar la corrección
5. Verificar con `npm run build`

## Instrucción
Analiza el problema que reporta el usuario. Lee los archivos involucrados, identifica la causa raíz y aplica la corrección mínima necesaria. Ejecuta build para verificar.
