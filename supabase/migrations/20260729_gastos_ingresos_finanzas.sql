-- ============================================================
-- Finanzas del evento: gastos por participante + ingresos
-- ============================================================

-- 1) Gastos por participante -------------------------------------------------
-- Cuando por_participante = true, el campo "monto" es el COSTO UNITARIO
-- (por persona) y el total se calcula multiplicando por la cantidad de
-- participantes. Cuando es false, "monto" es el total fijo del gasto.
ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS por_participante BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gastos.por_participante IS
  'Si es true, monto representa el costo unitario por persona (no el total).';

-- 2) Monto efectivamente pagado por cada participante ------------------------
-- NULL = pago el precio base del evento (event_settings.precio).
-- Un valor distinto de NULL indica una excepcion (pago parcial o diferente).
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(12, 2);

COMMENT ON COLUMN public.participantes.monto_pagado IS
  'Monto real abonado. NULL significa que pago el precio base del evento.';

-- 3) Tabla de ingresos -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id TEXT NOT NULL DEFAULT '2026',
  descripcion TEXT NOT NULL,
  monto NUMERIC(12, 2) NOT NULL,
  -- sponsor | donacion | venta | remera | otro
  categoria TEXT NOT NULL DEFAULT 'sponsor',
  -- cobrado = plata en mano | por_cobrar = comprometido pero no ingresado
  estado TEXT NOT NULL DEFAULT 'cobrado',
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  comprobante TEXT,
  creado_por TEXT,
  rol_creador TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingresos_evento_fecha_idx
  ON public.ingresos (evento_id, fecha DESC);

CREATE INDEX IF NOT EXISTS ingresos_estado_idx
  ON public.ingresos (estado);

-- RLS: solo administradores autenticados (mismo patron que content_settings)
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin puede gestionar ingresos" ON public.ingresos;
CREATE POLICY "Admin puede gestionar ingresos"
  ON public.ingresos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam')
    )
  );

-- 4) Refrescar el cache de esquema de PostgREST ------------------------------
NOTIFY pgrst, 'reload schema';
