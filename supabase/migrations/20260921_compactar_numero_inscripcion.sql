-- ============================================================
-- YA APLICADA en produccion el 2026-09-21 via Management API.
-- Se deja documentada para que el historial de `supabase/migrations`
-- quede consistente con el estado real de la base.
-- ============================================================
-- Contexto: con la logica de "menor numero libre" (20260818b), cuando una
-- inscripcion confirmada volvia a pendiente/rechazada, su numero se liberaba
-- pero los confirmados con numero MAYOR no se corrian. Eso dejaba huecos
-- reales solo visibles despues de mucho ida y vuelta (ej: 1..14, despues
-- 62, 134, 137, 138, 190, 191 en vez de 15..20).
--
-- Cambio: release_inscription_number ahora compacta corriendo un lugar
-- hacia abajo a todos los que tenian numero mayor al liberado. Con esto,
-- la secuencia de confirmados de cada edicion queda SIEMPRE 1..N sin
-- huecos, en cualquier momento, sin importar cuantas altas y bajas haya.
-- ============================================================

-- 1) Compactar los numeros de inscripcion 2026 ya asignados (deja 1..N sin huecos).
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (ORDER BY numero_inscripcion ASC) AS nuevo_numero
  FROM participantes
  WHERE anios @> ARRAY[2026] AND numero_inscripcion IS NOT NULL
)
UPDATE participantes p
SET numero_inscripcion = ranked.nuevo_numero
FROM ranked
WHERE p.id = ranked.id;

-- 2) Reajustar el espejo informativo en counters.
UPDATE counters
SET count = (
  SELECT COALESCE(MAX(numero_inscripcion), 0)
  FROM participantes
  WHERE anios @> ARRAY[2026]
)
WHERE id = 'inscripciones_2026';

-- 3) release_inscription_number: ahora compacta al liberar.
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

  -- Compacta: todos los que tenian un numero mayor bajan un lugar, asi la
  -- secuencia de confirmados de la edicion queda siempre 1..N sin huecos.
  UPDATE participantes
  SET numero_inscripcion = numero_inscripcion - 1
  WHERE anios @> ARRAY[v_year]
    AND numero_inscripcion IS NOT NULL
    AND numero_inscripcion > liberado;

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

-- 4) assign_inscription_number: sin cambios de fondo (menor libre), queda
--    reescrita para dejar la funcion completa en un solo lugar versionado.
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

  INSERT INTO counters (id, count)
  VALUES ('inscripciones_' || p_year, next_num)
  ON CONFLICT (id) DO UPDATE SET count = GREATEST(counters.count, next_num);

  RETURN next_num;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_inscription_number(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION release_inscription_number(text, text) TO anon, authenticated;
