# MD · Documentación para clonar la app a otro proyecto

Documenta la **funcionalidad** (no los colores ni estilos) para replicar esta app en otro evento. Leer en orden:

1. [`00-overview.md`](./00-overview.md) — arquitectura, stack, Supabase (2 clientes), providers, caché, esquema de tablas, Storage, env vars. **Empezar acá.**
2. [`01-inscripciones.md`](./01-inscripciones.md) — wizard de 3 pasos, autocompletado por DNI, número de inscripción por año, comprobante, apertura/cierre por edición.
3. [`02-contenido.md`](./02-contenido.md) — editor `/admin/content`, patrón de editores (imagen base64 + upsert + invalidar cache), sponsors, remera-info (jersey), fotos (Google Drive).
4. [`03-remeras.md`](./03-remeras.md) — pedido público con autocompletado, panel admin de pedidos, y el **rol `remera`** (usuario que solo ve remeras).
5. [`04-admin-config-contador.md`](./04-admin-config-contador.md) — auth y roles, configuración del evento, y el **contador diario anti-pausa** de Supabase.

> Todo lo estético (Tailwind, gradientes, paleta) es reemplazable. Lo que hay que clonar es: esquema de datos, API routes con service_role, flujos de autocompletado por DNI, caché stale-while-revalidate, roles, y la config por año.
