-- ============================================
-- Datos de transferencia en campos separados
--
-- Antes todo vivia en `eventos.datos_transferencia`, un texto libre
-- ("Banco: ...\nAlias: ...\nCBU: ...\nNombre: ..."), que en la pantalla solo
-- se podia mostrar como un parrafo con un unico boton "copiar todo". Con los
-- campos separados cada dato tiene su propio boton de copiar.
--
-- `datos_transferencia` se mantiene: lo regenera la pantalla de configuracion
-- a partir de estos campos y sirve para copiar todo de una y como respaldo.
-- ============================================
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS banco          TEXT,
  ADD COLUMN IF NOT EXISTS cbu            TEXT,
  ADD COLUMN IF NOT EXISTS titular_cuenta TEXT,
  -- Aclaracion opcional abajo de los datos ("transferi desde cualquier banco").
  ADD COLUMN IF NOT EXISTS nota_transferencia TEXT;

-- Migracion de lo que ya estaba cargado: se parsea el texto libre.
-- [^\n]+ para no pasarse de renglon (en Postgres el punto si matchea newline).
UPDATE public.eventos
SET
  banco = COALESCE(banco, (regexp_match(datos_transferencia, '(?i)banco:[ \t]*([^\n]+)'))[1]),
  cbu = COALESCE(cbu, (regexp_match(datos_transferencia, '(?i)cbu:[ \t]*([^\n]+)'))[1]),
  titular_cuenta = COALESCE(
    titular_cuenta,
    (regexp_match(datos_transferencia, '(?i)(?:nombre|titular):[ \t]*([^\n]+)'))[1]
  )
WHERE datos_transferencia IS NOT NULL AND datos_transferencia <> '';

COMMENT ON COLUMN public.eventos.datos_transferencia IS
  'Texto completo armado a partir de banco/alias/cbu/titular. Se usa para el boton "copiar todo"; la fuente de verdad son los campos separados.';
