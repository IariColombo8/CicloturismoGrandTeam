-- ============================================
-- SORTEOS del evento
--
-- Tres tablas:
--   sorteos            -> una tanda de sorteo ("Sorteo de premios", "La bici")
--   sorteo_premios     -> los premios con foto que se muestran en la web
--   sorteo_resultados  -> cada tirada: quien salio y si reclamo
--
-- Lo que se muestra en la web publica (/sorteos) son los premios marcados
-- visibles y los ganadores. Por eso NUNCA se guarda el DNI en estas tablas:
-- la persona se referencia por participante_id (UUID) y se copia el nombre y
-- la localidad, que es justamente lo que se anuncia.
--
-- La configuracion (a quien se excluye) vive en columnas separadas con
-- lectura restringida a admin/grandteam.
-- ============================================

CREATE TABLE IF NOT EXISTS public.sorteos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  -- Cuantas tiradas se van a hacer en esta tanda ("cuantos sorteos quiero hacer").
  total_sorteos INTEGER NOT NULL DEFAULT 1 CHECK (total_sorteos > 0),
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'en_curso', 'finalizado')),
  -- Se muestra en /sorteos (premios + ganadores).
  publico BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0,

  -- ── Quien entra al bolillero ───────────────────────────────
  -- Grupos ciclistas que no participan (ej: "Grand Team Bike", que organiza).
  excluir_grupos TEXT[] NOT NULL DEFAULT '{}'::text[],
  -- Personas excluidas a mano (participantes.id).
  excluir_participantes UUID[] NOT NULL DEFAULT '{}'::uuid[],
  -- Si tiene algo, SOLO entran estos (lista cerrada); si esta vacio entran todos
  -- los que pasen los filtros.
  incluir_participantes UUID[] NOT NULL DEFAULT '{}'::uuid[],
  -- Solo inscripciones confirmadas (lo normal) y/o solo los acreditados del dia.
  solo_confirmados BOOLEAN NOT NULL DEFAULT true,
  solo_acreditados BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sorteos_publico ON public.sorteos(publico);
CREATE INDEX IF NOT EXISTS idx_sorteos_orden ON public.sorteos(orden);

-- ============================================
CREATE TABLE IF NOT EXISTS public.sorteo_premios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  -- Un mismo premio puede sortearse varias veces (3 gorras = cantidad 3).
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  -- Se muestra en la web antes del sorteo (los "mas importantes").
  visible BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sorteo_premios_sorteo ON public.sorteo_premios(sorteo_id, orden);

-- ============================================
CREATE TABLE IF NOT EXISTS public.sorteo_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  premio_id UUID REFERENCES public.sorteo_premios(id) ON DELETE SET NULL,
  -- Nombre del premio copiado al momento de sortear: si despues se borra o se
  -- renombra el premio, el ganador sigue diciendo que se gano.
  premio_nombre TEXT,

  -- Numero de tirada dentro de la vuelta (1, 2, 3...), para el historial.
  orden INTEGER NOT NULL,
  -- Puesto que resuelve la tirada: 1..total_sorteos. Un puesto puede tener
  -- varias tiradas (el que no reclamo y el que salio en la repesca); vale la
  -- ultima. Trabajar por puesto es lo que evita que un premio se pierda.
  slot INTEGER NOT NULL DEFAULT 1,
  -- Ronda del bolillero. Nadie puede salir dos veces en la misma ronda: si hay
  -- mas sorteos que inscriptos, primero salen todos y recien ahi arranca la
  -- ronda 2 con el bolillero lleno otra vez.
  ronda INTEGER NOT NULL DEFAULT 1,
  -- 0 = sorteo original, 1 = "rehacer el sorteo de los que no reclamaron".
  vuelta INTEGER NOT NULL DEFAULT 0,

  participante_id UUID REFERENCES public.participantes(id) ON DELETE SET NULL,
  -- Copiados a proposito: es lo que se anuncia, y asi el listado publico no
  -- necesita leer la tabla de participantes.
  nombre TEXT NOT NULL,
  localidad TEXT,
  grupo TEXT,

  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'reclamado', 'no_reclamo')),
  resuelto_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sorteo_resultados_sorteo
  ON public.sorteo_resultados(sorteo_id, vuelta, orden);
CREATE INDEX IF NOT EXISTS idx_sorteo_resultados_slot
  ON public.sorteo_resultados(sorteo_id, slot);
CREATE INDEX IF NOT EXISTS idx_sorteo_resultados_participante
  ON public.sorteo_resultados(participante_id);

-- ── updated_at (misma funcion que el resto de las tablas) ────
DROP TRIGGER IF EXISTS tr_sorteos_updated_at ON public.sorteos;
CREATE TRIGGER tr_sorteos_updated_at
  BEFORE UPDATE ON public.sorteos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_sorteo_premios_updated_at ON public.sorteo_premios;
CREATE TRIGGER tr_sorteo_premios_updated_at
  BEFORE UPDATE ON public.sorteo_premios FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS
-- Lectura publica SOLO de los sorteos marcados publicos (un sorteo en borrador
-- no se filtra, con premios ni con ganadores). Escritura: admin/grandteam.
-- ============================================
ALTER TABLE public.sorteos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorteo_premios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorteo_resultados ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.es_staff_sorteos()
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

DROP POLICY IF EXISTS "Lectura publica de sorteos publicados" ON public.sorteos;
CREATE POLICY "Lectura publica de sorteos publicados"
  ON public.sorteos FOR SELECT
  USING (publico = true);

DROP POLICY IF EXISTS "Staff gestiona sorteos" ON public.sorteos;
CREATE POLICY "Staff gestiona sorteos"
  ON public.sorteos FOR ALL
  USING (public.es_staff_sorteos())
  WITH CHECK (public.es_staff_sorteos());

DROP POLICY IF EXISTS "Lectura publica de premios publicados" ON public.sorteo_premios;
CREATE POLICY "Lectura publica de premios publicados"
  ON public.sorteo_premios FOR SELECT
  USING (
    visible = true
    AND EXISTS (SELECT 1 FROM public.sorteos s WHERE s.id = sorteo_id AND s.publico = true)
  );

DROP POLICY IF EXISTS "Staff gestiona premios" ON public.sorteo_premios;
CREATE POLICY "Staff gestiona premios"
  ON public.sorteo_premios FOR ALL
  USING (public.es_staff_sorteos())
  WITH CHECK (public.es_staff_sorteos());

DROP POLICY IF EXISTS "Lectura publica de ganadores" ON public.sorteo_resultados;
CREATE POLICY "Lectura publica de ganadores"
  ON public.sorteo_resultados FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.sorteos s WHERE s.id = sorteo_id AND s.publico = true)
  );

DROP POLICY IF EXISTS "Staff gestiona resultados" ON public.sorteo_resultados;
CREATE POLICY "Staff gestiona resultados"
  ON public.sorteo_resultados FOR ALL
  USING (public.es_staff_sorteos())
  WITH CHECK (public.es_staff_sorteos());

-- La configuracion de exclusiones no es para el publico: dice a quien se dejo
-- afuera. El anon solo necesita nombre, descripcion y total de sorteos.
--
-- Va por columnas, y para eso primero hay que sacar el SELECT de toda la tabla
-- (Supabase se lo da a anon por defecto): un REVOKE por columna no puede
-- recortar un permiso otorgado a nivel tabla.
REVOKE SELECT ON public.sorteos FROM anon;
GRANT SELECT (
  id, nombre, descripcion, total_sorteos, estado, publico, orden, created_at, updated_at
) ON public.sorteos TO anon;
