-- ============================================
-- Jerarquia de los premios en la web publica
--
-- El admin elige si un premio es el mejor, el segundo o uno del resto, y
-- /sorteos los muestra en ese orden: el grande arriba y los otros en grilla.
--
-- NO cambia el orden en que se sortean (eso lo sigue manejando `orden`, con
-- las flechas del panel): es solo como se presentan en la pagina.
-- ============================================

ALTER TABLE public.sorteo_premios
  ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'otro'
    CHECK (nivel IN ('principal', 'segundo', 'otro'));

-- La pagina publica pide los premios de un sorteo ordenados por jerarquia.
CREATE INDEX IF NOT EXISTS idx_sorteo_premios_nivel
  ON public.sorteo_premios(sorteo_id, nivel, orden);
