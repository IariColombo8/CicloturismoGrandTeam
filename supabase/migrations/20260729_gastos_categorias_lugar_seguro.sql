-- ============================================================
-- Amplia las categorias permitidas de gastos.
-- El CHECK original no incluia "lugar" ni "seguro", que son
-- los gastos por participante tipicos del evento.
-- ============================================================

ALTER TABLE public.gastos
  DROP CONSTRAINT IF EXISTS gastos_categoria_check;

ALTER TABLE public.gastos
  ADD CONSTRAINT gastos_categoria_check CHECK (
    categoria IN (
      'equipamiento',
      'premios',
      'logística',
      'marketing',
      'alimentación',
      'lugar',
      'seguro',
      'otro'
    )
  );

NOTIFY pgrst, 'reload schema';
