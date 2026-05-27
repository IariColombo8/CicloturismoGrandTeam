-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Ejecutar DESPUES de schema.sql
-- ============================================

-- ============================================
-- RLS: administradores
-- ============================================
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

-- Lectura: usuarios autenticados
CREATE POLICY "Autenticados pueden leer administradores"
  ON administradores FOR SELECT
  TO authenticated
  USING (true);

-- Insert: solo admins existentes (o el trigger de primer admin)
CREATE POLICY "Admins pueden insertar administradores"
  ON administradores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Update: admins pueden actualizar cualquiera, usuarios su propio registro
CREATE POLICY "Admins pueden actualizar administradores"
  ON administradores FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Delete: solo admins
CREATE POLICY "Admins pueden eliminar administradores"
  ON administradores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS: inscripciones
-- ============================================
ALTER TABLE inscripciones ENABLE ROW LEVEL SECURITY;

-- Lectura: publica
CREATE POLICY "Lectura publica de inscripciones"
  ON inscripciones FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insercion: publica (cualquiera puede inscribirse)
CREATE POLICY "Insercion publica de inscripciones"
  ON inscripciones FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update: solo team members
CREATE POLICY "Team puede actualizar inscripciones"
  ON inscripciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

-- Delete: solo admin
CREATE POLICY "Admin puede eliminar inscripciones"
  ON inscripciones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS: participantes
-- ============================================
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;

-- Lectura: publica (necesario para verificar DNI duplicado)
CREATE POLICY "Lectura publica de participantes"
  ON participantes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insercion: publica
CREATE POLICY "Insercion publica de participantes"
  ON participantes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update: solo team members
CREATE POLICY "Team puede actualizar participantes"
  ON participantes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

-- Delete: solo admin
CREATE POLICY "Admin puede eliminar participantes"
  ON participantes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS: eventos
-- ============================================
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Lectura: publica
CREATE POLICY "Lectura publica de eventos"
  ON eventos FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert/Update/Delete: solo admin
CREATE POLICY "Admin puede insertar eventos"
  ON eventos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin puede actualizar eventos"
  ON eventos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin puede eliminar eventos"
  ON eventos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS: gastos
-- ============================================
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Solo team members pueden hacer todo con gastos
CREATE POLICY "Team puede leer gastos"
  ON gastos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

CREATE POLICY "Team puede insertar gastos"
  ON gastos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

CREATE POLICY "Team puede actualizar gastos"
  ON gastos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

CREATE POLICY "Team puede eliminar gastos"
  ON gastos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

-- ============================================
-- RLS: counters
-- ============================================
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

-- Lectura: publica
CREATE POLICY "Lectura publica de counters"
  ON counters FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura: via RPC (SECURITY DEFINER), no directa
-- No se necesitan policies de INSERT/UPDATE porque la funcion
-- next_inscription_number() tiene SECURITY DEFINER

-- ============================================
-- RLS: event_settings
-- ============================================
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- Lectura: publica
CREATE POLICY "Lectura publica de event_settings"
  ON event_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura: solo admin
CREATE POLICY "Admin puede actualizar event_settings"
  ON event_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin puede insertar event_settings"
  ON event_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STORAGE: bucket comprobantes
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT DO NOTHING;

-- Team puede subir comprobantes
CREATE POLICY "Team puede subir comprobantes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comprobantes' AND
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

-- Team puede leer comprobantes
CREATE POLICY "Team puede leer comprobantes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comprobantes' AND
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );

-- Team puede eliminar comprobantes
CREATE POLICY "Team puede eliminar comprobantes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comprobantes' AND
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'grandteam')
    )
  );
