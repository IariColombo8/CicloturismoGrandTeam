-- ============================================
-- Notas de caja
-- Observaciones sueltas sobre la plata que no encajan en gastos ni ingresos:
-- "pagaron $700 uruguayos", "falta la transferencia de Lore", etc.
-- Se cargan desde /admin/registro-inscripciones y se leen tambien en
-- /admin/gastos y en el PDF de finanzas.
-- ============================================
CREATE TABLE IF NOT EXISTS public.notas_caja (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  texto       TEXT        NOT NULL CHECK (btrim(texto) <> ''),
  -- Cuando se resuelve (entro la transferencia, se aclaro el monto) se marca
  -- en vez de borrarla, para no perder el historial de lo que paso.
  resuelta    BOOLEAN     NOT NULL DEFAULT false,
  creada_por  TEXT,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notas_caja_pendientes_idx
  ON public.notas_caja (resuelta, creada_en DESC);

ALTER TABLE public.notas_caja ENABLE ROW LEVEL SECURITY;

-- Son datos internos del equipo (dicen quien no pago todavia), asi que no hay
-- lectura publica: solo admin y grandteam, igual que el resto del panel.
DROP POLICY IF EXISTS "Admin gestiona notas_caja" ON public.notas_caja;
CREATE POLICY "Admin gestiona notas_caja" ON public.notas_caja
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores a
      WHERE a.auth_user_id = auth.uid()
        AND a.role = ANY (ARRAY['admin'::text, 'grandteam'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores a
      WHERE a.auth_user_id = auth.uid()
        AND a.role = ANY (ARRAY['admin'::text, 'grandteam'::text])
    )
  );
