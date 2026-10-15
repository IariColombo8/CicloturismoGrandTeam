-- Nota del comprobante de pago.
--
-- El formulario de inscripcion ya no rechaza nada: si el comprobante no se
-- puede subir (un PDF enorme, una foto HEIC que el navegador no decodifica,
-- un fallo del Storage), la inscripcion se guarda igual y acá queda escrito
-- por que llego sin archivo, para que el equipo se lo pida a la persona.
--
-- Antes, cualquiera de esos casos devolvia un error despues de completar los
-- cuatro pasos y la inscripcion se perdia.

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS comprobante_nota TEXT DEFAULT '';

COMMENT ON COLUMN public.participantes.comprobante_nota IS
  'Por que la inscripcion llego sin comprobante (o con un problema al subirlo). Vacio = todo bien.';
