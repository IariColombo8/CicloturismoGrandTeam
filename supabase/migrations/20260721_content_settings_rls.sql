-- Migración: Políticas RLS para content_settings
-- Problema: la tabla no tenía ninguna política definida. Con RLS activado,
-- cualquier INSERT/UPDATE/UPSERT desde el cliente (anon key) devuelve 403 Forbidden.
-- Esto rompía el guardado de la sección "Remera" (y content en general) en el admin.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la landing lee remera/sponsors/fotos/contacto/confirmacion)
DROP POLICY IF EXISTS "Lectura publica de content_settings" ON public.content_settings;
CREATE POLICY "Lectura publica de content_settings"
  ON public.content_settings FOR SELECT
  USING (true);

-- Solo admins/grandteam pueden insertar/actualizar/eliminar
DROP POLICY IF EXISTS "Admin puede gestionar content_settings" ON public.content_settings;
CREATE POLICY "Admin puede gestionar content_settings"
  ON public.content_settings FOR ALL
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
