-- ============================================
-- Log de emails enviados por Gmail API
-- Lo escribe lib/email/registro.ts desde las API routes (service_role).
-- Sirve para auditar que se mando, a quien y si salio bien.
-- ============================================
CREATE TABLE IF NOT EXISTS public.emails_enviados (
  id             BIGSERIAL PRIMARY KEY,
  destinatarios  TEXT[]      NOT NULL DEFAULT '{}'::text[],
  asunto         TEXT        NOT NULL,
  plantilla      TEXT,
  enviado_por    TEXT        NOT NULL,
  exito          BOOLEAN     NOT NULL DEFAULT false,
  -- Id del mensaje de Gmail si salio bien, o el mensaje de error si fallo.
  detalle        TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emails_enviados_creado_en_idx
  ON public.emails_enviados (creado_en DESC);

ALTER TABLE public.emails_enviados ENABLE ROW LEVEL SECURITY;

-- Solo admin/grandteam pueden leer el log desde el cliente.
-- Las escrituras van siempre con service_role (bypassea RLS).
DROP POLICY IF EXISTS "emails_enviados_select_admin" ON public.emails_enviados;
CREATE POLICY "emails_enviados_select_admin"
  ON public.emails_enviados
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores a
      WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
        AND a.role IN ('admin', 'grandteam')
    )
  );
