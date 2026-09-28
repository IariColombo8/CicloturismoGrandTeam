-- ============================================================
-- Marca de pago real de un gasto (distinto de "aprobado").
-- Un gasto puede estar aprobado pero todavia no haberse pagado
-- (ej: seguro, DJ, ambulancia, lugar que se pagan a ultimo momento).
-- ============================================================

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS pagado BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.gastos.pagado IS
  'Si es false, el gasto esta aprobado pero todavia no se abono (se paga a ultimo momento).';

NOTIFY pgrst, 'reload schema';
