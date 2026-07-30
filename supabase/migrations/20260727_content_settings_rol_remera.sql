-- Migración: permitir que el rol "remera" gestione content_settings.
-- Problema: la política RLS solo permitía 'admin' y 'grandteam', por lo que un
-- usuario con rol 'remera' recibía 403 al guardar el contenido de /pedir-remera
-- desde /admin/remera ("Editar contenido de /pedir-remera").
-- Ejecutar en Supabase SQL Editor.

DROP POLICY IF EXISTS "Admin puede gestionar content_settings" ON public.content_settings;
CREATE POLICY "Admin puede gestionar content_settings"
  ON public.content_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam', 'remera')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam', 'remera')
    )
  );
