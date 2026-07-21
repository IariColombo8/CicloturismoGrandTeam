-- ============================================
-- Consolidar inscripciones -> participantes
-- A partir de ahora "participantes" es la unica tabla de inscripciones
-- (identidad = dni). "inscripciones" queda como archivo historico,
-- ya no recibe escrituras nuevas.
-- ============================================

-- 1) Columnas nuevas en participantes (todo lo que tenia "inscripciones"
--    y no existia aca, + tracking de anios para reinscripciones futuras)
ALTER TABLE participantes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT,
  ADD COLUMN IF NOT EXISTS nombre_emergencia TEXT,
  ADD COLUMN IF NOT EXISTS telefono_emergencia TEXT,
  ADD COLUMN IF NOT EXISTS relacion_emergencia TEXT,
  ADD COLUMN IF NOT EXISTS ha_recorrido_distancia TEXT,
  ADD COLUMN IF NOT EXISTS tiene_alergias TEXT,
  ADD COLUMN IF NOT EXISTS alergias TEXT,
  ADD COLUMN IF NOT EXISTS tiene_problemas_salud TEXT,
  ADD COLUMN IF NOT EXISTS condicion_salud TEXT,
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'transferencia',
  ADD COLUMN IF NOT EXISTS numero_referencia TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT,
  ADD COLUMN IF NOT EXISTS aprobado_por_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nota_estado TEXT,
  ADD COLUMN IF NOT EXISTS anios INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- 2) Deduplicar por dni antes de poder poner la constraint UNIQUE.
--    Nos quedamos con la fila mas reciente (fecha_inscripcion) por dni
--    y borramos el resto.
WITH ranked AS (
  SELECT id, dni,
         ROW_NUMBER() OVER (PARTITION BY dni ORDER BY fecha_inscripcion DESC NULLS LAST, id DESC) AS rn
  FROM participantes
)
DELETE FROM participantes p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

-- 3) DNI unico: a partir de ahora es la clave de identidad para upsert.
CREATE UNIQUE INDEX IF NOT EXISTS participantes_dni_key ON participantes(dni);

-- 4) Backfill: completar campos faltantes en participantes ya existentes
--    con los datos de inscripciones (sin pisar lo que ya estaba cargado).
UPDATE participantes p
SET
  fecha_nacimiento     = COALESCE(p.fecha_nacimiento, i.fecha_nacimiento),
  pais                 = COALESCE(p.pais, i.pais),
  nombre_emergencia    = COALESCE(p.nombre_emergencia, i.nombre_emergencia),
  telefono_emergencia  = COALESCE(p.telefono_emergencia, i.telefono_emergencia),
  relacion_emergencia  = COALESCE(p.relacion_emergencia, i.relacion_emergencia),
  ha_recorrido_distancia = COALESCE(p.ha_recorrido_distancia, i.ha_recorrido_distancia),
  tiene_alergias       = COALESCE(p.tiene_alergias, i.tiene_alergias),
  alergias             = COALESCE(p.alergias, i.alergias),
  tiene_problemas_salud = COALESCE(p.tiene_problemas_salud, i.tiene_problemas_salud),
  condicion_salud      = COALESCE(p.condicion_salud, i.condiciones_medicas),
  metodo_pago          = COALESCE(p.metodo_pago, i.metodo_pago),
  numero_referencia    = COALESCE(p.numero_referencia, i.numero_referencia),
  provincia            = COALESCE(p.provincia, i.ciudad),
  estado               = COALESCE(p.estado, i.estado),
  nota_estado          = COALESCE(p.nota_estado, i.nota_estado),
  aprobado_por_admin   = COALESCE(p.aprobado_por_admin, i.aprobado_por_admin)
FROM inscripciones i
WHERE p.dni = i.cedula;

-- 5) Insertar como participante nuevo cualquier inscripcion que no tenga
--    ya una fila en participantes con el mismo dni.
INSERT INTO participantes (
  nombre, apellido, dni, email, telefono, categoria, provincia,
  numero_inscripcion, estado, talla_camiseta, grupo_sanguineo,
  fecha_nacimiento, pais, nombre_emergencia, telefono_emergencia, relacion_emergencia,
  ha_recorrido_distancia, tiene_alergias, alergias, tiene_problemas_salud, condicion_salud,
  metodo_pago, numero_referencia, aprobado_por_admin, nota_estado,
  fecha_inscripcion, token_qr
)
SELECT
  i.nombres, i.apellidos, i.cedula, i.email, i.telefono, i.talla_camiseta, i.ciudad,
  i.numero_inscripcion, i.estado, i.talla_camiseta, i.tipo_sangre,
  i.fecha_nacimiento, i.pais, i.nombre_emergencia, i.telefono_emergencia, i.relacion_emergencia,
  i.ha_recorrido_distancia, i.tiene_alergias, i.alergias, i.tiene_problemas_salud, i.condiciones_medicas,
  i.metodo_pago, i.numero_referencia, i.aprobado_por_admin, i.nota_estado,
  i.fecha_inscripcion, gen_random_uuid()::text
FROM inscripciones i
WHERE NOT EXISTS (SELECT 1 FROM participantes p WHERE p.dni = i.cedula);

-- 6) Marcar a todos los que ya tienen datos como inscriptos en la edicion 2026.
UPDATE participantes
SET anios = ARRAY[2026]
WHERE anios IS NULL OR anios = ARRAY[]::INTEGER[];

-- Nota: "inscripciones" NO se borra en esta migracion. Queda como
-- respaldo historico hasta confirmar que todo funciona correctamente
-- con la tabla participantes. Se puede eliminar mas adelante con:
--   DROP TABLE inscripciones;
