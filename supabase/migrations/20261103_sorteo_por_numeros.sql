-- ============================================
-- SORTEO POR NUMEROS
--
-- Una tanda se puede sortear por numeros en vez de por nombres: el bolillero
-- saca un numero del 1 a numero_hasta y gana quien tenga ese numero en la
-- mano. No se mira la lista de inscriptos (300 inscriptos, se sortea del 1 al
-- 230 si asi se elige).
--
-- NULL = sorteo por nombres, como hasta ahora: las tandas existentes no
-- cambian. La tirada se guarda en sorteo_resultados sin participante_id y con
-- nombre "Número N".
--
-- El rol anon no recibe permiso sobre la columna (la pagina publica no la
-- necesita): el GRANT por columnas de 20261015_sorteos.sql queda como esta.
-- ============================================

ALTER TABLE public.sorteos
  ADD COLUMN IF NOT EXISTS numero_hasta INTEGER CHECK (numero_hasta IS NULL OR numero_hasta > 0);

COMMENT ON COLUMN public.sorteos.numero_hasta IS
  'Sorteo por numeros: del 1 a este valor. NULL = sorteo por nombres.';
