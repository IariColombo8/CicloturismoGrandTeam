-- ============================================================
-- YA APLICADA en produccion el 2026-11-03 via Management API.
-- ============================================================
-- Cinco confirmados que nunca pagaron y no van a venir. No son ni
-- pendientes ni confirmados de esta edicion: se los saca de 2026 y
-- quedan como participantes historicos.
--
-- - release_inscription_number libera su numero y compacta al resto
--   (los confirmados siguen 1..N sin huecos).
-- - Sin 2026 en `anios` no aparecen en el registro, en finanzas, en
--   los cupos ni en el sorteo.
-- - La fila NO se borra: si vuelven a escribir su DNI en /inscripcion,
--   /api/lookup-participant les autocompleta el formulario.
-- ============================================================

SELECT release_inscription_number(d, '2026')
FROM unnest(ARRAY['23697046','27716186','25025601','14319584','23335754']) AS d;

UPDATE participantes
SET anios = array_remove(anios, 2026),
    estado = 'pendiente',
    aprobado_por_admin = false,
    numero_inscripcion = NULL
WHERE dni IN ('23697046','27716186','25025601','14319584','23335754');
