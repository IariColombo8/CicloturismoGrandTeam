-- Corrige las politicas RLS de public.remera: deben permitir gestion
-- (SELECT/INSERT/UPDATE/DELETE) a los roles admin, grandteam y remera.
-- El formulario publico /pedir-remera no toca esta tabla directamente:
-- usa las API routes /api/remera/lookup y /api/remera/submit con
-- service_role, asi que no hace falta una politica de acceso publico.

ALTER TABLE public.remera ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona remera" ON public.remera;
DROP POLICY IF EXISTS "Lectura publica de remera" ON public.remera;
DROP POLICY IF EXISTS "remera_select" ON public.remera;
DROP POLICY IF EXISTS "remera_update" ON public.remera;

CREATE POLICY "Admin gestiona remera"
  ON public.remera FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam', 'remera')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam', 'remera')
    )
  );
