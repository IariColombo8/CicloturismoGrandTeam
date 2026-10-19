-- ============================================
-- ROLES DEL DIA DEL EVENTO
--
-- Una sola tabla: la lista de quien hace que el dia del evento. Quien pedalea,
-- quien ayuda, quien ayuda y no pedalea, quien trae familiares para dar una
-- mano y los detalles de cada uno.
--
-- La lista la ve TODO EL MUNDO en /roles (es el reparto de tareas del equipo,
-- se mira desde el celular el dia del evento). Por eso:
--   * Aca NO van datos de contacto (ni telefono ni email): todo lo que esta en
--     esta tabla es publico, y el telefono de cada uno ya vive en
--     `participantes`, que no tiene lectura publica. Si alguna vez hace falta
--     mostrarlo, va por una API route autorizada, no por una columna de aca.
--   * El anon no escribe nada: el formulario publico entra por
--     POST /api/roles/sumarse (service_role, con limite por IP). Asi nadie
--     puede borrar la lista desde la consola del navegador.
--
-- Editar y borrar: admin/grandteam (el panel, /admin/roles).
-- ============================================

CREATE TABLE IF NOT EXISTS public.roles_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Si se eligio de la lista de inscriptos queda el vinculo; si el nombre se
  -- cargo a mano (gente del equipo que no se inscribe) queda en NULL.
  participante_id UUID REFERENCES public.participantes(id) ON DELETE SET NULL,

  nombre TEXT NOT NULL,
  -- Nombre sin acentos, sin mayusculas y sin espacios de mas: es lo que decide
  -- si dos cargas son la misma persona. Lo calcula el trigger de abajo, nunca
  -- la aplicacion, para que no pueda quedar desincronizado.
  clave TEXT NOT NULL,

  -- Dos datos, una sola pregunta en pantalla (ver MODOS en lib/roles.ts).
  pedalea BOOLEAN NOT NULL DEFAULT false,
  ayuda BOOLEAN NOT NULL DEFAULT false,

  -- Que va a hacer: ids de lib/roles.ts (TAREAS) o texto libre.
  tareas TEXT[] NOT NULL DEFAULT '{}'::text[],

  -- Familiares o amigos que trae para ayudar.
  familiares INTEGER NOT NULL DEFAULT 0 CHECK (familiares >= 0 AND familiares <= 20),
  familiares_detalle TEXT,

  notas TEXT,

  -- Fijado por el admin: el formulario publico ya no lo puede volver a tocar.
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  -- Email del admin que lo cargo, o 'publico' si la persona se sumo sola.
  cargado_por TEXT,

  orden INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una fila por persona: si alguien se suma dos veces desde el celular, la
-- segunda actualiza la primera en vez de duplicarla.
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_evento_clave ON public.roles_evento(clave);
CREATE INDEX IF NOT EXISTS idx_roles_evento_orden ON public.roles_evento(orden, nombre);
CREATE INDEX IF NOT EXISTS idx_roles_evento_participante ON public.roles_evento(participante_id);

-- ── clave: la misma cuenta que normalizarNombre() en lib/roles.ts ──
CREATE OR REPLACE FUNCTION public.roles_evento_clave()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.nombre := btrim(regexp_replace(NEW.nombre, '\s+', ' ', 'g'));
  NEW.clave := lower(
    translate(
      NEW.nombre,
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_roles_evento_clave ON public.roles_evento;
CREATE TRIGGER tr_roles_evento_clave
  BEFORE INSERT OR UPDATE OF nombre ON public.roles_evento
  FOR EACH ROW EXECUTE FUNCTION public.roles_evento_clave();

DROP TRIGGER IF EXISTS tr_roles_evento_updated_at ON public.roles_evento;
CREATE TRIGGER tr_roles_evento_updated_at
  BEFORE UPDATE ON public.roles_evento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.roles_evento ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.es_staff_roles()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.administradores
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'grandteam')
  );
$$;

DROP POLICY IF EXISTS "Lectura publica de los roles" ON public.roles_evento;
CREATE POLICY "Lectura publica de los roles"
  ON public.roles_evento FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff gestiona los roles" ON public.roles_evento;
CREATE POLICY "Staff gestiona los roles"
  ON public.roles_evento FOR ALL
  USING (public.es_staff_roles())
  WITH CHECK (public.es_staff_roles());

-- El anon LEE la lista entera (es publica) pero no escribe una sola fila: el
-- alta publica pasa por /api/roles/sumarse, que valida y limita por IP.
REVOKE ALL ON public.roles_evento FROM anon;
GRANT SELECT ON public.roles_evento TO anon;

-- El autenticado puede intentar escribir, pero la politica de arriba solo deja
-- pasar a admin/grandteam: un usuario con rol "usuario" solo lee.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles_evento TO authenticated;
