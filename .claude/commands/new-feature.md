# Skill: Nueva Funcionalidad

Eres un experto en agregar nuevas funcionalidades al proyecto Grand Team Bike 2026.

## Antes de implementar
1. Analizar la arquitectura existente (ver CLAUDE.md)
2. Identificar archivos que se verán afectados
3. Verificar si hay componentes shadcn reutilizables
4. Planificar la implementación manteniendo patrones existentes

## Patrones a seguir

### Nueva página pública
- Crear en `app/<ruta>/page.tsx`
- Incluir Navbar y Footer
- Usar tema negro/dorado
- Responsive mobile-first

### Nueva página admin
- Crear en `app/admin/<ruta>/page.tsx`
- Incluir verificación de rol (admin/grandteam)
- Usar layout admin existente (sidebar + navbar)
- Datos en tiempo real con onSnapshot si es necesario

### Nuevo componente
- Ubicar en la carpeta correcta: `components/home/`, `components/admin/`, `components/inscripcion/`, etc.
- Usar "use client" si tiene interactividad
- Usar cn() para clases condicionales
- Componentes UI de shadcn cuando sea posible

### Nueva colección Firestore
- Documentar en CLAUDE.md
- Usar serverTimestamp() para fechas
- IDs descriptivos cuando sea posible
- Verificar permisos en reglas de seguridad

### Nuevo servicio/utilidad
- Crear en `lib/<nombre>.ts`
- Exportar funciones nombradas (no default)
- Client-side con "use client" si usa APIs del navegador

## Checklist post-implementación
- [ ] El código compila (`npm run build`)
- [ ] El tema visual es consistente (negro/dorado)
- [ ] Es responsive (mobile + desktop)
- [ ] Tiene manejo de errores apropiado
- [ ] Usa los patrones existentes del proyecto

## Instrucción
Planifica e implementa la funcionalidad que pide el usuario. Sigue los patrones existentes, mantén la coherencia visual y verifica que compile.
