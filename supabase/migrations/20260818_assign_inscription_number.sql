-- ============================================================
-- PENDIENTE DE EJECUTAR EN EL SQL EDITOR DE SUPABASE
-- ============================================================
-- La parte de datos de 20260818_numero_inscripcion_al_confirmar.sql
-- ya se aplico. Falta solo esta funcion, que no se puede crear
-- desde la API REST.
--
-- Asigna el siguiente numero correlativo a un participante cuando
-- el admin confirma su inscripcion. Es atomica e idempotente: si el
-- participante ya tiene numero, lo devuelve sin consumir otro del
-- contador (asi editar la nota de una confirmada no la renumera).
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
