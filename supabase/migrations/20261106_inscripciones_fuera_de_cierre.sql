-- Dos inscripciones cargadas a mano despues del cierre (5/11 20 hs), a pedido
-- del organizador. Ya aplicado en produccion el 06/11/2026 via Management API.
--
-- Las dos personas ya existian en `participantes` (de antes) pero sin 2026 en
-- `anios`. Se las suma a esta edicion como pendientes, igual que el formulario.
-- Veronica tenia un numero_inscripcion viejo (192) que hoy es de otra persona
-- de 2026: se libera para que la RPC le asigne uno propio al confirmarla.

update participantes set
  nombre = case dni when '22149451' then 'Verónica Rosana' else 'Federico Alfredo' end,
  anios = case when 2026 = any(coalesce(anios, '{}')) then anios else array_append(coalesce(anios, '{}'), 2026) end,
  estado = 'pendiente',
  aprobado_por_admin = false,
  numero_inscripcion = null,
  token_qr = coalesce(token_qr, gen_random_uuid()::text),
  fecha_inscripcion = now(),
  comprobante_nota = 'Inscripción cargada a mano después del cierre (06/11/2026).'
where dni in ('22149451', '39082143');
