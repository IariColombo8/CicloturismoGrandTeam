-- ============================================
-- Pago "colaboracion"
--
-- Alguien pone la plata de la inscripcion ($25.000) pero no va al evento.
-- Suma como ingreso (monto_pagado) y NO cuenta en ningun gasto por persona
-- (el lugar en El Viejo Molino, el seguro, la bolsita...). Lo calculan
-- cuentaEnGastos() en app/admin/gastos/tipos.ts y lib/finanzas/saldoEsperado.ts.
-- ============================================

ALTER TABLE public.participantes
  DROP CONSTRAINT IF EXISTS participantes_pago_estado_check;

ALTER TABLE public.participantes
  ADD CONSTRAINT participantes_pago_estado_check
  CHECK (pago_estado IN ('pagado', 'pendiente', 'gratis', 'otro', 'colaboracion'));

COMMENT ON COLUMN public.participantes.pago_estado IS
  'pagado = entro la plata | pendiente = falta que pague | gratis = sin cargo | otro = pago de una forma que no entro a la caja (ver pago_nota) | colaboracion = pone la plata pero no va: suma como ingreso y no cuenta en los gastos por persona';
