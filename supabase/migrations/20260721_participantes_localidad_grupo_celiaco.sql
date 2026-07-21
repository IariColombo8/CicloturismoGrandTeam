BEGIN;

-- 1) provincia deja de representar una provincia y pasa a ser ciudad/localidad.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participantes'
      AND column_name = 'provincia'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participantes'
      AND column_name = 'localidad'
  ) THEN
    ALTER TABLE public.participantes RENAME COLUMN provincia TO localidad;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participantes'
      AND column_name = 'provincia'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participantes'
      AND column_name = 'localidad'
  ) THEN
    UPDATE public.participantes
       SET localidad = COALESCE(NULLIF(BTRIM(localidad), ''), NULLIF(BTRIM(provincia), ''));
    ALTER TABLE public.participantes DROP COLUMN provincia;
  END IF;
END
$$;

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS grupo_ciclistas text,
  ADD COLUMN IF NOT EXISTS es_celiaco boolean;

-- Normalizaciones seguras sobre datos existentes.
UPDATE public.participantes
   SET pais = NULLIF(BTRIM(pais), ''),
       localidad = NULLIF(BTRIM(localidad), ''),
       grupo_ciclistas = COALESCE(NULLIF(BTRIM(grupo_ciclistas), ''), 'Sin grupo'),
       grupo_sanguineo = CASE
         WHEN grupo_sanguineo IS NULL OR BTRIM(grupo_sanguineo) = '' THEN grupo_sanguineo
         ELSE UPPER(BTRIM(grupo_sanguineo))
       END;

-- El talle se gestiona en su tabla específica y deja de formar parte de participantes.
ALTER TABLE public.participantes
  DROP COLUMN IF EXISTS talla_camiseta;

COMMENT ON COLUMN public.participantes.pais
  IS 'País de residencia normalizado';
COMMENT ON COLUMN public.participantes.localidad
  IS 'Ciudad o localidad de residencia normalizada';
COMMENT ON COLUMN public.participantes.grupo_ciclistas
  IS 'Grupo, equipo o agrupación ciclista; Sin grupo cuando no pertenece a uno';
COMMENT ON COLUMN public.participantes.es_celiaco
  IS 'TRUE si declaró celiaquía, FALSE si declaró que no, NULL si no fue informado';

COMMIT;
