-- Migración: keep_alive (contador diario anti-pausa de Supabase)
-- Ejecutar en Supabase SQL Editor
--
-- Objetivo: el plan free de Supabase pausa el proyecto tras 7 días sin
-- actividad. Esta tabla guarda un contador que suma 1 por día, para siempre,
-- empezando en 1 el día que se ejecuta esta migración.
--
-- El contador NO se muestra en ningún lado: su único rol es generar actividad.

-- ─── Tabla: keep_alive (una sola fila, id siempre = 1) ───────────────────────
CREATE TABLE IF NOT EXISTS public.keep_alive (
  id                   SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  contador             BIGINT      NOT NULL DEFAULT 1,
  fecha_inicio         DATE        NOT NULL DEFAULT CURRENT_DATE,
  ultima_fecha         DATE        NOT NULL DEFAULT CURRENT_DATE,
  ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fila inicial: hoy = 1. Si ya existe, no la pisa.
INSERT INTO public.keep_alive (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Nadie necesita leer esto desde el cliente: RLS activo y sin políticas.
-- La función de abajo es SECURITY DEFINER, así que igual puede escribir.
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

-- ─── Función: suma 1 por día (idempotente) ───────────────────────────────────
-- Si se llama varias veces el mismo día, sólo cuenta la primera: el WHERE
-- ultima_fecha < CURRENT_DATE bloquea el resto. Así el contador siempre
-- coincide con la cantidad de días transcurridos, y ejecutarla de más
-- (retries, doble cron, pings extra) no la rompe.
CREATE OR REPLACE FUNCTION public.keep_alive_tick()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contador BIGINT;
BEGIN
  UPDATE public.keep_alive
     SET contador             = contador + 1,
         ultima_fecha         = CURRENT_DATE,
         ultima_actualizacion = NOW()
   WHERE id = 1
     AND ultima_fecha < CURRENT_DATE
  RETURNING contador INTO v_contador;

  -- Ya se había contado hoy: devolvemos el valor actual sin sumar.
  IF v_contador IS NULL THEN
    SELECT contador INTO v_contador FROM public.keep_alive WHERE id = 1;
  END IF;

  RETURN v_contador;
END;
$$;

-- Permitir invocarla como RPC desde el ping externo (ver README abajo).
-- No es un riesgo: es idempotente por día, nadie puede inflar el contador.
GRANT EXECUTE ON FUNCTION public.keep_alive_tick() TO anon, authenticated;

-- ─── Cron interno (pg_cron): corre todos los días a las 12:00 UTC ────────────
-- 12:00 UTC = 09:00 Argentina. pg_cron siempre trabaja en UTC.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Borra el job si ya existía, para poder re-ejecutar esta migración sin duplicar.
SELECT cron.unschedule('keep-alive-diario')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keep-alive-diario');

-- Ojo: el comando va como string simple y SIN punto y coma adentro. El SQL
-- Editor de Supabase parte los statements por ";" y no entiende los
-- dollar-quotes con etiqueta ($cron$...$cron$), así que romperia la linea.
SELECT cron.schedule('keep-alive-diario', '0 12 * * *', 'SELECT public.keep_alive_tick()');

-- ─── Verificación ────────────────────────────────────────────────────────────
-- SELECT * FROM public.keep_alive;                    -- estado del contador
-- SELECT * FROM cron.job WHERE jobname = 'keep-alive-diario';   -- job activo
-- SELECT public.keep_alive_tick();                    -- probar a mano
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;  -- historial
