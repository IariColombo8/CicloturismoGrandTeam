-- Registra el correo de contacto en cada pedido de remera.
-- Es aditiva e idempotente: puede ejecutarse más de una vez sin romper datos.

alter table public.remera
  add column if not exists email text;

create index if not exists remera_email_lower_idx
  on public.remera (lower(email))
  where email is not null;

comment on column public.remera.email is
  'Correo de contacto informado en el formulario público de pedido de remera';
