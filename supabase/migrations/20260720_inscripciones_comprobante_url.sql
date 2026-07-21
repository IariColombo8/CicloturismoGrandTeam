-- ============================================
-- inscripciones: comprobante en Storage en vez de base64
-- ============================================
ALTER TABLE inscripciones
  ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;
