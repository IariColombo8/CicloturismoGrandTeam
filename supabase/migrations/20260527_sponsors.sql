-- ============================================
-- TABLA: sponsors (patrocinadores)
-- ============================================
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nombre_comercial TEXT,
  descripcion TEXT,
  logo_url TEXT,
  tier TEXT NOT NULL DEFAULT 'bronce' CHECK (tier IN ('oro', 'plata', 'bronce')),

  -- Contacto
  telefono TEXT,
  email TEXT,
  whatsapp TEXT,
  direccion TEXT,
  horario TEXT,

  -- Redes sociales
  instagram TEXT,
  facebook TEXT,
  website TEXT,

  -- Clasificacion
  categoria TEXT,
  servicios TEXT[], -- array de servicios

  -- Control
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);
CREATE INDEX IF NOT EXISTS idx_sponsors_activo ON sponsors(activo);

-- Trigger updated_at
CREATE TRIGGER tr_sponsors_updated_at
  BEFORE UPDATE ON sponsors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Lectura publica (para la landing)
CREATE POLICY "Lectura publica de sponsors"
  ON sponsors FOR SELECT
  USING (true);

-- Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "Admin puede gestionar sponsors"
  ON sponsors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'grandteam')
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sponsors;

-- ============================================
-- SEED: sponsors existentes
-- ============================================
INSERT INTO sponsors (nombre, nombre_comercial, descripcion, logo_url, tier, telefono, email, whatsapp, direccion, horario, instagram, facebook, website, categoria, servicios, activo, orden) VALUES
-- ORO
('Sponsor Premium 1', 'Sponsor Premium S.A.', 'Líderes en equipamiento deportivo de alta gama. Proveemos las mejores bicicletas y accesorios para ciclistas profesionales y aficionados. Con más de 20 años de experiencia en el mercado.', '/cycling-sponsor-logo-gold.jpg', 'oro', '+54 9 342 123 4567', 'contacto@sponsorpremium.com', '5493421234567', 'Av. Principal 1234, Ciudad, Provincia', 'Lun a Vie: 9:00-18:00 | Sáb: 9:00-13:00', 'https://instagram.com/sponsorpremium', 'https://facebook.com/sponsorpremium', 'https://sponsorpremium.com', 'Equipamiento Deportivo', ARRAY['Venta de bicicletas', 'Accesorios ciclismo', 'Mantenimiento', 'Asesoramiento personalizado'], true, 1),

('Sponsor Premium 2', 'Bike Pro Center', 'Tu tienda especializada en ciclismo. Ofrecemos las mejores marcas internacionales, servicio técnico especializado y asesoramiento experto para todos los niveles.', '/cycling-sponsor-logo-silver.jpg', 'oro', '+54 9 342 765 4321', 'info@bikeprocenter.com', '5493427654321', 'Calle del Ciclista 567, Centro', 'Lun a Sáb: 8:30-19:00', 'https://instagram.com/bikeprocenter', 'https://facebook.com/bikeprocenter', 'https://bikeprocenter.com', 'Tienda de Ciclismo', ARRAY['Bicicletas de ruta', 'Mountain bikes', 'Service completo', 'Personalización'], true, 2),

-- PLATA
('Sponsor Plata 1', 'Deportes Extremos', 'Especialistas en deportes de aventura y outdoor. Equipamiento de calidad para ciclistas que buscan superar límites.', '/bike-sponsor-logo.jpg', 'plata', '+54 9 342 555 1234', 'ventas@deportesextremos.com', '5493425551234', 'Av. Libertador 890', 'Lun a Vie: 10:00-20:00', 'https://instagram.com/deportesextremos', NULL, NULL, 'Deportes Outdoor', ARRAY['Equipamiento', 'Indumentaria', 'Accesorios'], true, 1),

('Sponsor Plata 2', 'Nutrición Deportiva Plus', 'Suplementos y nutrición especializada para atletas. Productos de calidad certificada para mejorar tu rendimiento.', '/generic-sports-sponsor-logo.png', 'plata', '+54 9 342 666 7890', NULL, '5493426667890', 'Bv. San Martín 2345', 'Lun a Sáb: 9:00-21:00', NULL, 'https://facebook.com/nutricionplus', 'https://nutricionplus.com', 'Nutrición Deportiva', ARRAY['Suplementos', 'Asesoramiento nutricional', 'Planes personalizados'], true, 2),

('Sponsor Plata 3', 'Taller Bike Mechanics', 'Service y reparación de bicicletas de todas las marcas. Mecánicos certificados y repuestos originales.', '/cycling-sponsor-logo-gold.jpg', 'plata', '+54 9 342 777 8899', 'servicio@bikemechanics.com', '5493427778899', 'Calle Belgrano 456', 'Lun a Vie: 8:00-18:00', 'https://instagram.com/bikemechanics', NULL, NULL, 'Taller Mecánico', ARRAY['Reparaciones', 'Mantenimiento', 'Armado custom', 'Venta de repuestos'], true, 3),

-- BRONCE
('Diesel Nando', 'Diesel Nando', 'Inyectores y bombas diesel. Limpieza, reparación, repuestos y calibración.', '/sponsor/dieselnando.png', 'bronce', '+54 9 3442 621477', NULL, '5493442621477', 'Valais 824, Villa Elisa, Entre Ríos', NULL, NULL, NULL, NULL, NULL, NULL, true, 1),

('Alto Impacto', 'Alto Impacto', 'Consultoría ambiental. Asesoramiento y gestión en medio ambiente para empresas y proyectos.', '/sponsor/altoimpacto.jpeg', 'bronce', NULL, NULL, '543447508396', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 2),

('Cafetería Los Ciclistas', 'Cafetería Los Ciclistas', 'El punto de encuentro de la comunidad ciclista. Café de especialidad, desayunos saludables y ambiente biker friendly.', '/sponsor/logoc.png', 'bronce', '+54 9 342 888 9900', NULL, '5493428889900', 'Esquina Ruta 11 y Av. Circunvalación', NULL, 'https://instagram.com/cafeteriaciclistas', NULL, NULL, NULL, NULL, true, 3),

('LM Seguros', 'LM Seguros - Coberturas Deportivas', 'Protección integral para deportistas. Seguros especializados en actividades de riesgo y eventos deportivos.', '/sponsor/logolm.png', 'bronce', '+54 9 342 999 0011', NULL, '5493429990011', 'San Jerónimo 1122', NULL, NULL, NULL, NULL, NULL, NULL, true, 4),

('Yoga & Fitness Center', 'Yoga & Fitness Center', 'Centro de entrenamiento complementario para ciclistas. Yoga, stretching y fortalecimiento muscular.', '/sponsor/logoly.png', 'bronce', '+54 9 342 111 2233', NULL, '5493421112233', 'Av. Pellegrini 3456', NULL, 'https://instagram.com/yogafitnesscenter', NULL, NULL, NULL, NULL, true, 5),

('Local Aventura', 'Local Aventura Outdoor', 'Todo para tus aventuras al aire libre. Camping, trekking y equipamiento para exploradores.', '/sponsor/logola.png', 'bronce', '+54 9 342 222 3344', NULL, '5493422223344', 'Costanera Este 789', NULL, NULL, NULL, NULL, NULL, NULL, true, 6);
