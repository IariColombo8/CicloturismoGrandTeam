# Skill: Panel de Administración

Eres un experto en el panel admin del proyecto Grand Team Bike 2026.

## Archivos principales
- `app/admin/layout.tsx` - Layout (Navbar + AdminSidebar + main)
- `app/admin/page.tsx` - Redirección a dashboard
- `app/admin/dashboard/page.tsx` - Dashboard con stats y gráficos (378 líneas)
- `app/admin/dashboard/DashboardCharts.tsx` - 7 gráficos recharts (carga dinámica sin SSR)
- `app/admin/registro-inscripciones/page.tsx` - Tabla de inscripciones (695 líneas)
- `app/admin/configuraciones/page.tsx` - Config del evento (373 líneas)
- `app/admin/gastos/page.tsx` - Control de gastos (527 líneas)
- `app/admin/grandteam/page.tsx` - Gestión equipo (281 líneas)
- `components/admin/AdminSidebar.tsx` - Sidebar colapsable
- `components/admin/AdminStats.tsx` - Tarjetas de estadísticas
- `components/admin/InscripcionDetailModal.tsx` - Modal detalles inscripción

## Autenticación y roles
- Verificación en cada página: `useFirebaseContext()` → user + userRole
- Roles: "admin" (acceso total), "grandteam" (acceso parcial)
- Sin acceso → redirect a `/login` o `/`
- Colección Firestore: `administrador/{emailKey}`

## Dashboard
- 4 stats principales: total, pendientes, confirmadas, ingresos
- 3 stats secundarias: tasa conversión, rechazadas, ingreso promedio
- 7 gráficos: área acumulada, pie estado, línea diaria, pie categoría, bar provincias, radar métricas, bar financiero
- Datos en tiempo real con `onSnapshot()`
- Precio fijo: $40,000 por inscripción confirmada

## Registro de inscripciones
- Tabla paginada (50/100/150 por página)
- Búsqueda por nombre, apellido, email, DNI
- Filtro por estado (pendiente, confirmada, rechazada)
- Modal con 6 secciones + cambio de estado + notas

## Gastos
- CRUD completo con categorías (equipamiento, premios, logística, marketing, alimentación, otro)
- Admin: aprueba automáticamente
- GrandTeam: propone (queda pendiente)
- Comprobantes en Firebase Storage
- Colección: `gastos_2026`

## Configuraciones
- Formulario: nombre evento, fecha, ubicación, recorrido, precio, cupo, datos pago, contacto, redes sociales
- Se guarda en `eventos/2026` con merge + serverTimestamp

## GrandTeam
- 3 tabs: cumpleaños del mes, datos de salud, todos los miembros
- Exportar CSV de datos de salud
- Fuente: colección `administrador`

## Reglas
- Siempre verificar autenticación y rol antes de mostrar contenido
- Gráficos de recharts con carga dinámica (ssr: false)
- Mantener consistencia visual del sidebar y stats cards
- Datos en tiempo real con onSnapshot donde sea posible

## Instrucción
Analiza lo que el usuario necesita del panel admin. Lee los archivos relevantes antes de modificar. Mantén la verificación de roles y la estructura existente.
