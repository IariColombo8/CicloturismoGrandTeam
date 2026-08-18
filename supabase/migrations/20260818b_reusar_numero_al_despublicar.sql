-- ============================================================
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE
-- ============================================================
-- Reemplaza assign_inscription_number y agrega release_inscription_number.
--
-- Cambio: el numero ya no sale de un contador que solo sube, sino del
-- menor entero libre dentro de la edicion. Asi, si una inscripcion
-- confirmada vuelve a "pendiente" o "rechazada", su numero se libera y
-- lo toma el proximo que se confirme (sin dejar huecos).
--
-- La tabla `counters` queda como espejo informativo del maximo
-- entregado; ya no es la fuente de verdad.
--
-- Ambas funciones son idempotentes y se pueden reejecutar sin riesgo.
-- ============================================================

-- ------------------------------------------------------------
-- Asigna el menor numero libre de la edicion.
-- Si el participante ya tiene numero, devuelve el mismo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_inscription_number(
  p_dni text,
  p_year text DEFAULT '2026'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer := p_year::integer;
  existing_num integer;
  next_num integer;
  usados integer;
BEGIN
  -- Serializa las asignaciones de esta edicion durante la transaccion,
  -- para que dos confirmaciones simultaneas no tomen el mismo numero.
  PERFORM pg_advisory_xact_lock(hashtext('inscripcion_numero_' || p_year));

  SELECT numero_inscripcion INTO existing_num
  FROM participantes
  WHERE dni = p_dni;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe participante con DNI %', p_dni;
  END IF;

  IF existing_num IS NOT NULL THEN
    RETURN existing_num;
  END IF;

  SELECT COUNT(*) INTO usados
  FROM participantes
  WHERE anios @> ARRAY[v_year] AND numero_inscripcion IS NOT NULL;

  -- El menor libre nunca puede ser mayor que (usados + 1).
  SELECT MIN(n) INTO next_num
  FROM generate_series(1, usados + 1) AS n
  WHERE NOT EXISTS (
    SELECT 1 FROM participantes p
    WHERE p.anios @> ARRAY[v_year]
      AND p.numero_inscripcion = n
  );

  UPDATE participantes
  SET numero_inscripcion = next_num
  WHERE dni = p_dni;

  -- Espejo informativo: el maximo entregado en la edicion.
  INSERT INTO counters (id, count)
  VALUES ('inscripciones_' || p_year, next_num)
  ON CONFLICT (id) DO UPDATE SET count = GREATEST(counters.count, next_num);

  RETURN next_num;
END;
$$;

-- ------------------------------------------------------------
-- Libera el numero cuando la inscripcion deja de estar confirmada.
-- Devuelve el numero liberado, o NULL si no tenia.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_inscription_number(
  p_dni text,
  p_year text DEFAULT '2026'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer := p_year::integer;
  liberado integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('inscripcion_numero_' || p_year));

  SELECT numero_inscripcion INTO liberado
  FROM participantes
  WHERE dni = p_dni;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe participante con DNI %', p_dni;
  END IF;

  IF liberado IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE participantes
  SET numero_inscripcion = NULL
  WHERE dni = p_dni;

  -- Reajusta el espejo al maximo que sigue asignado.
  UPDATE counters
  SET count = COALESCE((
    SELECT MAX(numero_inscripcion)
    FROM participantes
    WHERE anios @> ARRAY[v_year] AND numero_inscripcion IS NOT NULL
  ), 0)
  WHERE id = 'inscripciones_' || p_year;

  RETURN liberado;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_inscription_number(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION release_inscription_number(text, text) TO anon, authenticated;
