-- ============================================
-- Alojamientos: galeria de imagenes adicionales
-- El logo sigue viviendo en logo_url; "imagenes" guarda las fotos extra
-- (habitaciones, frente, cochera para bicis, etc.) en el orden de carga.
-- ============================================
ALTER TABLE alojamientos
  ADD COLUMN IF NOT EXISTS imagenes TEXT[] DEFAULT '{}'::text[];

-- Filas viejas sin valor: array vacio en vez de NULL para simplificar el cliente.
UPDATE alojamientos SET imagenes = '{}'::text[] WHERE imagenes IS NULL;
