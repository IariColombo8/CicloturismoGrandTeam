-- ============================================
-- Personas con discapacidad
--
-- El lugar del evento (El Viejo Molino, $10.000 por persona) no les cobra a
-- las personas con discapacidad; el seguro, la bolsita y lo demas si. Hacen
-- falta dos datos:
--
--   participantes.discapacidad   -> la persona tiene discapacidad (se marca en
--                                   el panel, en el bloque de Pago). No cambia
--                                   lo que paga de inscripcion: eso sigue en
--                                   pago_estado / monto_pagado.
--   gastos.cobra_discapacidad    -> en un gasto por persona, si tambien se
--                                   paga por las personas con discapacidad.
--
-- No borra ni cambia nada de lo que ya existe: todos arrancan sin
-- discapacidad, y todos los gastos se siguen cobrando por todos menos el del
-- Viejo Molino.
-- ============================================

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS discapacidad BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.participantes.discapacidad IS
  'Persona con discapacidad. No paga los gastos por persona con cobra_discapacidad = false (el lugar del evento). La inscripcion se sigue rigiendo por pago_estado.';

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS cobra_discapacidad BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.gastos.cobra_discapacidad IS
  'Solo para gastos por participante: false = no se paga por las personas con discapacidad (ej: Viejo Molino).';

-- El lugar del evento no les cobra.
UPDATE public.gastos
SET cobra_discapacidad = false
WHERE id = '88ca275c-ffac-4e52-b4fe-69edadeb85ea'; -- Viejo Molino, $10.000 por persona
