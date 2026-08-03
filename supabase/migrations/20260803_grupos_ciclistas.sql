-- Migración: fila 'grupos' en content_settings para el combo autocompletable
-- de "Grupo de ciclistas" del formulario de inscripción.
-- data.lista: string[] con los nombres de grupo que se van agregando
-- automáticamente cuando alguien escribe uno que todavía no existe.

INSERT INTO public.content_settings (id, data) VALUES
  ('grupos', '{"lista": []}')
ON CONFLICT (id) DO NOTHING;
