-- Se saca la nota de estado "URUGUAYO" de la unica inscripcion que tenia nota
-- (Fabio Andrés Festino Nieves), a pedido. Ya aplicado en produccion el
-- 02/11/2026 por la Management API; este archivo lo deja documentado.
-- Idempotente: si la nota ya no esta, no cambia nada.
update public.participantes
set nota_estado = null
where id = 'b5bce5ab-3e59-461d-952e-3b9e9cbae6be'
  and nota_estado = 'URUGUAYO';
