-- Migración: Crear tablas remera y content_settings
-- Ejecutar en Supabase SQL Editor

-- ─── Tabla: remera ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.remera (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  dni           TEXT        NOT NULL UNIQUE,
  nombre        TEXT        NOT NULL,
  telefono      TEXT,
  items         JSONB       NOT NULL DEFAULT '[]',
  -- items formato: [{"talle": "M", "cantidad": 1}, {"talle": "L", "cantidad": 2}]
  tiene_comprobante BOOLEAN DEFAULT false,
  comprobante_url   TEXT,
  esta_registrado   BOOLEAN DEFAULT false,
  envio_tipo        TEXT    DEFAULT 'retiro' CHECK (envio_tipo IN ('retiro', 'envio')),
  direccion         TEXT,
  estado            TEXT    DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'entregado')),
  alias_pago        TEXT,
  fecha_solicitud   TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remera_dni    ON public.remera(dni);
CREATE INDEX IF NOT EXISTS idx_remera_estado ON public.remera(estado);

-- ─── Tabla: content_settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_settings (
  id         TEXT PRIMARY KEY,
  -- 'remera' | 'sponsors' | 'fotos' | 'contacto' | 'confirmacion'
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Filas iniciales vacías
INSERT INTO public.content_settings (id, data) VALUES
  ('remera', '{
    "title": "",
    "description": "",
    "imageUrl": "",
    "showSection": false,
    "callToActionTitle": "¿Querés tu remera?",
    "callToActionDescription": "",
    "aliasInfo": "",
    "features": []
  }'),
  ('sponsors', '{"sponsors": []}'),
  ('fotos',    '{"fotos": []}'),
  ('contacto', '{"email": "", "telefono": "", "direccion": "", "redesSociales": {}}'),
  ('confirmacion', '{"titulo": "", "descripcion": "", "mensaje": "", "infoExtra": ""}')
ON CONFLICT (id) DO NOTHING;

-- ─── Storage bucket: comprobantes ────────────────────────────────────────────
-- Ejecutar en Supabase Storage si el bucket no existe:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', true)
-- ON CONFLICT (id) DO NOTHING;
