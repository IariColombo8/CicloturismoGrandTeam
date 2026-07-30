-- Bucket publico para las fotos de la galeria del sitio (#galeria)
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do update set public = true;

-- Lectura publica de los objetos del bucket
drop policy if exists "galeria_public_select" on storage.objects;
create policy "galeria_public_select"
  on storage.objects for select
  using (bucket_id = 'galeria');

-- La escritura se hace desde /api/galeria/upload con service_role,
-- que ignora RLS. No se habilita insert/update/delete para anon.
