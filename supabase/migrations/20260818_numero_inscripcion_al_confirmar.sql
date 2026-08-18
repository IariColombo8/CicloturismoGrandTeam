-- ============================================================
-- Numero de inscripcion: correlativo 1,2,3... y solo al confirmar
-- ============================================================
-- >>> YA APLICADO EL 2026-08-18. NO VOLVER A EJECUTAR. <<<
--
-- Este archivo queda como registro del cambio. La parte de datos
-- es de un solo uso: si se corre de nuevo, blanquea la numeracion
-- vigente y deja el contador en 5, con lo cual el proximo
-- confirmado repetiria un numero ya entregado.
--
-- Para crear/actualizar solo la funcion, usar el archivo
-- 20260818_assign_inscription_number.sql (es idempotente).
-- ============================================================
-- Antes: el numero se asignaba al enviar el formulario y los
-- participantes que repiten arrastraban el numero de ediciones
-- anteriores, por eso la grilla se veia salteada.
--
-- Ahora:
--   * numero_inscripcion arranca en NULL para toda la edicion 2026.
--   * Se asigna recien cuando el admin pasa la inscripcion a
--     "confirmada", tomando el siguiente correlativo.
--   * Los pendientes y rechazados no tienen numero.
-- ============================================================

-- 1) Blanquear la edicion 2026. Las ediciones anteriores conservan
--    su numeracion historica (no se tocan).
UPDATE participantes
SET numero_inscripcion = NULL
WHERE anios @> ARRAY[2026];

-- 2) Semilla: los 5 primeros confirmados, en el orden acordado.
--    Se identifican por DNI para no depender de tildes ni mayusculas.
UPDATE participantes SET numero_inscripcion = 1 WHERE dni = '22819640'; -- Marisa Roxana Campodonico
UPDATE participantes SET numero_inscripcion = 2 WHERE dni = '17329642'; -- Laura marcela Perinotto
UPDATE participantes SET numero_inscripcion = 3 WHERE dni = '96184910'; -- Lorena Duré a
UPDATE participantes SET numero_inscripcion = 4 WHERE dni = '42241816'; -- Ayelen Godoy
UPDATE participantes SET numero_inscripcion = 5 WHERE dni = '94694723'; -- Gilberto Serna

-- 3) El contador queda en 5: el proximo confirmado sera el 6.
INSERT INTO counters (id, count) VALUES ('inscripciones_2026', 5)
ON CONFLICT (id) DO UPDATE SET count = 5;

-- ============================================================
-- RPC: assign_inscription_number
-- Asigna el siguiente correlativo a un participante, de forma
-- atomica e idempotente: si ya tiene numero, lo devuelve sin
-- consumir otro del contador.
-- ============================================================
CREATE OR REPLACE FUNCTION assign_inscription_number(
  p_dni text,
  p_year text DEFAULT '2026'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_num integer;
  next_num integer;
BEGIN
  -- Bloquea la fila para que dos confirmaciones simultaneas no
  -- asignen dos numeros distintos a la misma persona.
  SELECT numero_inscripcion INTO existing_num
  FROM participantes
  WHERE dni = p_dni
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe participante con DNI %', p_dni;
  END IF;

  IF existing_num IS NOT NULL THEN
    RETURN existing_num;
  END IF;

  INSERT INTO counters (id, count)
  VALUES ('inscripciones_' || p_year, 1)
  ON CONFLICT (id) DO UPDATE SET count = counters.count + 1
  RETURNING count INTO next_num;

  UPDATE participantes
  SET numero_inscripcion = next_num
  WHERE dni = p_dni;

  RETURN next_num;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_inscription_number(text, text) TO anon, authenticated;
