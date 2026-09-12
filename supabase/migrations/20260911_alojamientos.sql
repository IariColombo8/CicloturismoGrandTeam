-- ============================================
-- TABLA: alojamientos (alojamientos bike friendly recomendados)
-- ============================================
CREATE TABLE IF NOT EXISTS alojamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  website TEXT,
  telefono TEXT,
  whatsapp TEXT,
  direccion TEXT,
  instagram TEXT,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alojamientos_activo ON alojamientos(activo);
CREATE INDEX IF NOT EXISTS idx_alojamientos_orden ON alojamientos(orden);

-- Trigger updated_at (misma funcion que usan el resto de las tablas)
DROP TRIGGER IF EXISTS tr_alojamientos_updated_at ON alojamientos;
CREATE TRIGGER tr_alojamientos_updated_at
  BEFORE UPDATE ON alojamientos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE alojamientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de alojamientos" ON alojamientos;
CREATE POLICY "Lectura publica de alojamientos"
  ON alojamientos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin puede gestionar alojamientos" ON alojamientos;
CREATE POLICY "Admin puede gestionar alojamientos"
  ON alojamientos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam')
    )
  );
