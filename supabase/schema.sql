-- ============================================
-- SCHEMA COMPLETO: Migracion Firebase -> Supabase
-- Grand Team Bike 2026
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- TABLA: administradores
-- Reemplaza: coleccion "administrador"
-- ============================================
CREATE TABLE IF NOT EXISTS administradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin', 'grandteam', 'usuario')),
  login_method TEXT DEFAULT 'email' CHECK (login_method IN ('google', 'email')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_administradores_email ON administradores(email);
CREATE INDEX IF NOT EXISTS idx_administradores_role ON administradores(role);
CREATE INDEX IF NOT EXISTS idx_administradores_auth_user_id ON administradores(auth_user_id);

-- ============================================
-- TABLA: inscripciones
-- Reemplaza: coleccion "inscripciones"
-- ============================================
CREATE TABLE IF NOT EXISTS inscripciones (
  id TEXT PRIMARY KEY,
  numero_inscripcion INTEGER NOT NULL,

  -- Datos personales
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  cedula TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  fecha_nacimiento TEXT,
  pais TEXT,
  ciudad TEXT,

  -- Contacto de emergencia
  nombre_emergencia TEXT,
  telefono_emergencia TEXT,
  relacion_emergencia TEXT,

  -- Informacion adicional
  ha_recorrido_distancia TEXT,
  talla_camiseta TEXT,
  tipo_sangre TEXT,
  tiene_alergias TEXT,
  alergias TEXT,
  tiene_problemas_salud TEXT,
  condiciones_medicas TEXT,

  -- Pago
  metodo_pago TEXT DEFAULT 'transferencia',
  numero_referencia TEXT,
  comprobante_base64 TEXT,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'rechazada')),
  aprobado_por_admin BOOLEAN DEFAULT false,
  nota_estado TEXT,

  -- Metadata
  fecha_inscripcion TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON inscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_inscripciones_cedula ON inscripciones(cedula);
CREATE INDEX IF NOT EXISTS idx_inscripciones_fecha ON inscripciones(fecha_inscripcion DESC);

-- ============================================
-- TABLA: participantes
-- Reemplaza: coleccion "Participantes"
-- ============================================
CREATE TABLE IF NOT EXISTS participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  categoria TEXT,
  provincia TEXT,
  numero_inscripcion INTEGER,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'aprobado')),
  precio TEXT,
  fecha_inscripcion TIMESTAMPTZ DEFAULT now(),

  -- Check-in
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_in_by TEXT,
  token_qr TEXT,

  -- Info medica
  grupo_sanguineo TEXT,
  talla_camiseta TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participantes_dni ON participantes(dni);
CREATE INDEX IF NOT EXISTS idx_participantes_estado ON participantes(estado);
CREATE INDEX IF NOT EXISTS idx_participantes_token_qr ON participantes(token_qr);
CREATE INDEX IF NOT EXISTS idx_participantes_fecha ON participantes(fecha_inscripcion DESC);

-- ============================================
-- TABLA: eventos
-- Reemplaza: coleccion "eventos"
-- ============================================
CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  fecha TEXT,
  ubicacion TEXT,
  recorrido TEXT,
  cupo_maximo INTEGER DEFAULT 300,
  costo_inscripcion NUMERIC DEFAULT 0,
  alias_transferencia TEXT,
  datos_transferencia TEXT,
  hora_largada TEXT,
  punto_encuentro TEXT,
  incluye TEXT[] DEFAULT '{}',
  redes_sociales JSONB DEFAULT '{}',
  telefono_contacto TEXT,
  email_contacto TEXT,
  inscripciones_abiertas BOOLEAN DEFAULT true,
  categoria TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLA: gastos
-- Reemplaza: coleccion "gastos_2026"
-- ============================================
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  categoria TEXT CHECK (categoria IN ('equipamiento', 'premios', 'logistica', 'marketing', 'alimentacion', 'otro')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha TIMESTAMPTZ DEFAULT now(),
  comprobante TEXT,
  creado_por TEXT NOT NULL,
  rol_creador TEXT,
  aprobado_por TEXT,
  fecha_aprobacion TIMESTAMPTZ,
  motivo_rechazo TEXT,
  evento_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gastos_estado ON gastos(estado);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha DESC);

-- ============================================
-- TABLA: counters
-- Reemplaza: coleccion "counters"
-- ============================================
CREATE TABLE IF NOT EXISTS counters (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- TABLA: event_settings
-- Reemplaza: coleccion "settings" doc "eventSettings"
-- ============================================
CREATE TABLE IF NOT EXISTS event_settings (
  id TEXT PRIMARY KEY DEFAULT 'eventSettings',
  cupo_maximo INTEGER DEFAULT 300,
  precio NUMERIC DEFAULT 35000,
  costo_inscripcion NUMERIC,
  metodo_pago TEXT DEFAULT 'Transferencia bancaria',
  inscripciones_abiertas BOOLEAN DEFAULT true,
  current_year INTEGER DEFAULT 2026,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar fila default de settings
INSERT INTO event_settings (id) VALUES ('eventSettings') ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCION RPC: next_inscription_number
-- Reemplaza: runTransaction() atomico de Firebase
-- ============================================
CREATE OR REPLACE FUNCTION next_inscription_number(p_year text DEFAULT '2026')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
BEGIN
  INSERT INTO counters (id, count)
  VALUES ('inscripciones_' || p_year, 1)
  ON CONFLICT (id) DO UPDATE SET count = counters.count + 1
  RETURNING count INTO next_num;
  RETURN next_num;
END;
$$;

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_inscripciones_updated_at
  BEFORE UPDATE ON inscripciones FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_participantes_updated_at
  BEFORE UPDATE ON participantes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_eventos_updated_at
  BEFORE UPDATE ON eventos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_gastos_updated_at
  BEFORE UPDATE ON gastos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_event_settings_updated_at
  BEFORE UPDATE ON event_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- HABILITAR REALTIME en tablas necesarias
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE inscripciones;
ALTER PUBLICATION supabase_realtime ADD TABLE participantes;
ALTER PUBLICATION supabase_realtime ADD TABLE gastos;
