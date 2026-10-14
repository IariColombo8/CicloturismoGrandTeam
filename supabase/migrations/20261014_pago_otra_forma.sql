-- ============================================
-- Pago "de otra forma" + nota del pago
--
-- Caso real: alguien pago 700 pesos uruguayos, o le transfirio a otra persona
-- que todavia no nos paso la plata ("Lore nos transfiere esa plata"). La
-- inscripcion esta confirmada y el participante ya pago, pero esa plata NO
-- entro a la caja, asi que no tiene que sumar a los ingresos hasta que se
-- cambie a "pago el precio de lista" o "pago otro monto".
-- ============================================

-- Cuarto valor posible de pago_estado: 'otro'.
ALTER TABLE public.participantes
  DROP CONSTRAINT IF EXISTS participantes_pago_estado_check;

ALTER TABLE public.participantes
  ADD CONSTRAINT participantes_pago_estado_check
  CHECK (pago_estado IN ('pagado', 'pendiente', 'gratis', 'otro'));

-- Aclaracion de como pago, para los casos que no son un monto en pesos.
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS pago_nota TEXT;

COMMENT ON COLUMN public.participantes.pago_estado IS
  'pagado = entro la plata | pendiente = falta que pague | gratis = sin cargo | otro = pago de una forma que no entro a la caja (ver pago_nota)';

COMMENT ON COLUMN public.participantes.pago_nota IS
  'Aclaracion del pago cuando pago_estado = otro. Ej: "Pago 700 uruguayos, Lore nos transfiere esa plata".';
