-- ============================================
-- Estado de pago de la inscripcion
-- Permite confirmar a alguien que todavia no pago (queda marcado como
-- "falta pagar"), registrar un monto distinto al de lista, o darle la
-- inscripcion gratis.
--
--   pago_estado:  'pagado' | 'pendiente' | 'gratis'
--   monto_pagado: lo que efectivamente entro por esa inscripcion
-- ============================================
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS pago_estado  TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(12,2);

ALTER TABLE public.participantes
  DROP CONSTRAINT IF EXISTS participantes_pago_estado_check;

ALTER TABLE public.participantes
  ADD CONSTRAINT participantes_pago_estado_check
  CHECK (pago_estado IN ('pagado', 'pendiente', 'gratis'));

-- Historico: hasta ahora una inscripcion se confirmaba recien despues de
-- verificar el comprobante, asi que toda confirmada previa a esta migracion
-- ya habia pagado el precio de lista.
UPDATE public.participantes
SET
  pago_estado  = 'pagado',
  monto_pagado = COALESCE(
    monto_pagado,
    (SELECT precio::numeric FROM public.event_settings WHERE id = 'eventSettings' LIMIT 1),
    25000
  )
WHERE estado = 'confirmada'
  AND pago_estado = 'pendiente';

CREATE INDEX IF NOT EXISTS participantes_pago_estado_idx
  ON public.participantes (pago_estado);
