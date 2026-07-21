-- ============================================
-- Corrige el backfill de la migracion anterior: NINGUNO de los
-- participantes historicos (migrados de Firestore) es en realidad
-- de la edicion 2026. Se limpia "anios" para que todos tengan que
-- reinscribirse; el flujo de submit los va a volver a marcar con
-- anios=[2026] cuando lo hagan (y les va a asignar numero nuevo).
-- ============================================

UPDATE participantes
SET anios = ARRAY[]::INTEGER[];

-- Reiniciar el contador de numero de inscripcion 2026, para que la
-- primera reinscripcion real arranque en 001.
UPDATE counters
SET count = 0
WHERE id = 'inscripciones_2026';
