# Skill: Panel de Administración

Eres un experto en el panel admin del proyecto Grand Team Bike 2026.

## Archivos principales
- `app/admin/layout.tsx` - Layout (Navbar + AdminSidebar + main)
- `app/admin/page.tsx` - Redirección a dashboard
- `app/admin/dashboard/page.tsx` - Dashboard: cabecera (precio editable) + las tres secciones
- `app/admin/dashboard/panorama.ts` - Cálculo puro: agrupaciones, salud, edades, remeras
- `app/admin/dashboard/usePanorama.ts` - Carga de participantes y remeras + realtime
- `app/admin/dashboard/SeccionPlata.tsx` / `SeccionGente.tsx` / `SeccionExtra.tsx` - Los tres bloques
- `app/admin/dashboard/GraficosPlata.tsx` / `GraficosGente.tsx` - Recharts (dynamic import, sin SSR)
- `app/admin/dashboard/piezas.tsx` - Tarjeta, Seccion, Panel, FilaConteo, Dato
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
Tres secciones, en este orden:
1. **Plata**: usa el mismo `useFinanzas` de `/admin/gastos` (nunca recalcular los ingresos aparte:
   los dos paneles tienen que decir lo mismo). Tarjetas de lo cobrado / gastos / banco / balance,
   cómo pagaron los confirmados (con los nombres en `ListaModal`), gastos por categoría y 2 gráficos.
2. **Inscripciones y gente**: estado y cupo, salud (celíacos, problemas de salud, alergias, menores),
   grupos ciclistas con sus integrantes, procedencia, edades y 5 gráficos. Tiene un selector de
   alcance (todos los que van al evento / solo confirmados).
3. **Ritmo, remeras y últimas altas**: inscripciones de los últimos 7 días, día récord, talles
   pedidos para encargar al proveedor, estado de los pedidos.

Reglas al tocarlo:
- Los gráficos y los conteos se calculan sobre **todas** las filas de la edición, nunca sobre una
  muestra: el dashboard viejo dibujaba "todo el evento" con las últimas 5 inscripciones.
- Las localidades y los grupos se agrupan sin acentos ni mayúsculas (`panorama.ts`): los datos
  vienen a mano y "CONCORDIA", "Concordia" y "Paysandú"/"Paysandu" son lo mismo. 32 localidades
  crudas son 19 reales.
- Las listas de nombres van en `ListaModal`, nunca escritas en la fila.
- Un gráfico, una unidad: no mezclar pesos con cantidad de personas en el mismo eje.
- Fecha de nacimiento que no da una edad creíble (3 a 100 años) no se cuenta: se avisa aparte para
  corregirla. Hay inscripciones con el año en curso cargado como año de nacimiento.
- Datos en tiempo real por canal de Supabase sobre `participantes` y `remera`.

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
