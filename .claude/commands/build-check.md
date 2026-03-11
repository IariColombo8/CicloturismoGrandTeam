# Skill: Verificación de Build

Ejecuta la verificación completa del proyecto antes de un commit.

## Pasos
1. Ejecutar `npm run build` y verificar que compile sin errores
2. Si hay errores, analizarlos y proponer correcciones
3. Ejecutar `npm run lint` para verificar estilo de código
4. Reportar el resultado al usuario

## Notas
- TypeScript tiene `ignoreBuildErrors: true`, pero aun así verificar errores críticos
- No hay tests configurados, solo build y lint
- El build debe completarse exitosamente antes de hacer commit

## Instrucción
Ejecuta `npm run build` y `npm run lint`. Reporta cualquier error encontrado y sugiere correcciones si es necesario.
