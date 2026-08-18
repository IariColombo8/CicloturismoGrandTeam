-- ============================================================
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE
-- ============================================================
-- Orden del listado de /admin/registro-inscripciones:
--   1) Pendientes arriba
--   2) Confirmadas, del numero mas grande al 1
--   3) Rechazadas al final
--
-- El listado esta paginado en el servidor, asi que el orden tiene que
-- resolverse en la consulta: si se ordenara en el cliente, cada hoja se
-- ordenaria por separado y el #1 no quedaria en la ultima pagina.
--
-- PostgREST solo permite ordenar por columnas, no por expresiones CASE,
-- por eso se agrega esta columna generada como criterio de orden.
-- Es STORED: se calcula sola en cada INSERT/UPDATE, no hay que mantenerla.
-- ============================================================

ALTER TABLE participantes
  ADD COLUMN IF NOT EXISTS orden_estado smallint
  GENERATED ALWAYS AS (
    CASE estado
      WHEN 'pendiente' THEN 0
      WHEN 'confirmada' THEN 1
      WHEN 'aprobado'  THEN 1
      WHEN 'rechazada' THEN 2
      ELSE 3
    END
  ) STORED;

-- Indice para que el orden del listado no haga un sort completo de la tabla.
CREATE INDEX IF NOT EXISTS idx_participantes_orden_listado
  ON participantes (orden_estado, numero_inscripcion DESC NULLS LAST, fecha_inscripcion DESC);
