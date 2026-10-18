-- ============================================================
-- Comisiones de Naranja X: un solo ingreso con muchos dias adentro
-- ============================================================
-- La cuenta del evento paso del BNA a Naranja X, que acredita comision cada
-- tanto y de a montos chicos. Cargar un ingreso por acreditacion tapaba los
-- sponsors en la lista de finanzas, asi que es UN ingreso acumulador
-- (categoria 'comision') y cada acreditacion es un item de este array:
--
--   items = [{"id": "...", "fecha": "2026-10-18", "monto": 1234.5, "nota": null}, ...]
--
-- La columna `monto` del ingreso sigue siendo la fuente para los totales: se
-- guarda siempre igual a la suma de los items (lo hace el panel al cargar o
-- borrar uno), asi que el resto de las cuentas (calculadora de caja, saldo
-- esperado del push, PDF, Excel) no necesito tocarlas.

ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ingresos.items IS
  'Acreditaciones que componen el ingreso (comisiones de Naranja X): [{id, fecha, monto, nota}]. El campo monto es su suma.';

-- Refrescar el cache de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
