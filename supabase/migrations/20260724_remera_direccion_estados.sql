-- Remeras: dirección estructurada de envío y estados independientes.
-- Supabase/PostgreSQL. Idempotente: puede ejecutarse más de una vez.

begin;

alter table public.remera
  add column if not exists email text,
  add column if not exists pais text,
  add column if not exists provincia text,
  add column if not exists ciudad text,
  add column if not exists barrio text,
  add column if not exists codigo_postal text,
  add column if not exists calle text,
  add column if not exists altura text,
  add column if not exists sin_numero boolean not null default false,
  add column if not exists piso text,
  add column if not exists departamento text,
  add column if not exists entre_calles text,
  add column if not exists lugar_entrega text,
  add column if not exists indicaciones_entrega text,
  add column if not exists latitud numeric(10,7),
  add column if not exists longitud numeric(10,7),
  add column if not exists estado_confirmacion text not null default 'pendiente',
  add column if not exists entregado boolean not null default false,
  add column if not exists entregado_at timestamptz;

-- Conserva el significado de los pedidos existentes.
update public.remera
set
  estado_confirmacion = case
    when estado = 'entregado' then 'confirmado'
    when estado = 'confirmado' then 'confirmado'
    when estado = 'anulado' then 'anulado'
    else case when estado_confirmacion in ('pendiente', 'confirmado', 'anulado') then estado_confirmacion else 'pendiente' end
  end,
  entregado = case
    when estado = 'entregado' then true
    else coalesce(entregado, false)
  end,
  entregado_at = case
    when estado = 'entregado' then coalesce(entregado_at, updated_at, now())
    else entregado_at
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'remera_estado_confirmacion_check'
      and conrelid = 'public.remera'::regclass
  ) then
    alter table public.remera
      add constraint remera_estado_confirmacion_check
      check (estado_confirmacion in ('pendiente', 'confirmado', 'anulado'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'remera_pais_argentina_check'
      and conrelid = 'public.remera'::regclass
  ) then
    alter table public.remera
      add constraint remera_pais_argentina_check
      check (pais is null or lower(trim(pais)) = 'argentina');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'remera_latitud_check'
      and conrelid = 'public.remera'::regclass
  ) then
    alter table public.remera
      add constraint remera_latitud_check
      check (latitud is null or latitud between -90 and 90);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'remera_longitud_check'
      and conrelid = 'public.remera'::regclass
  ) then
    alter table public.remera
      add constraint remera_longitud_check
      check (longitud is null or longitud between -180 and 180);
  end if;
end
$$;

create index if not exists remera_estado_confirmacion_idx
  on public.remera (estado_confirmacion);

create index if not exists remera_entregado_idx
  on public.remera (entregado);

create index if not exists remera_envio_tipo_idx
  on public.remera (envio_tipo);

-- Mantiene separados "confirmación" y "entrega", sin romper el campo estado
-- anterior que solo utilizaba pendiente/entregado.
create or replace function public.sincronizar_estado_remera()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado_confirmacion is null
     or new.estado_confirmacion not in ('pendiente', 'confirmado', 'anulado') then
    new.estado_confirmacion := 'pendiente';
  end if;

  -- Un pedido pendiente o anulado nunca puede figurar como entregado.
  if new.estado_confirmacion <> 'confirmado' then
    new.entregado := false;
  end if;

  if new.entregado then
    new.entregado_at := coalesce(new.entregado_at, now());
    new.estado := 'entregado';
  else
    new.entregado_at := null;
    new.estado := 'pendiente';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sincronizar_estado_remera on public.remera;
create trigger trg_sincronizar_estado_remera
before insert or update
on public.remera
for each row
execute function public.sincronizar_estado_remera();

-- RPC pública y acotada: el formulario guarda la dirección después de crear
-- o actualizar el pedido mediante /api/remera/submit. Verifica DNI + email y
-- solo puede modificar datos de entrega.
create or replace function public.guardar_direccion_remera(
  p_dni text,
  p_email text,
  p_es_envio boolean,
  p_pais text,
  p_provincia text,
  p_ciudad text,
  p_barrio text,
  p_codigo_postal text,
  p_calle text,
  p_altura text,
  p_sin_numero boolean,
  p_piso text,
  p_departamento text,
  p_entre_calles text,
  p_lugar_entrega text,
  p_indicaciones_entrega text,
  p_latitud numeric,
  p_longitud numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas integer;
  v_numero text;
begin
  if p_dni is null or p_dni !~ '^[0-9]{7,8}$' then
    raise exception 'DNI inválido';
  end if;

  if p_email is null or position('@' in p_email) < 2 then
    raise exception 'Email inválido';
  end if;

  if coalesce(p_es_envio, false) then
    if lower(trim(coalesce(p_pais, ''))) <> 'argentina' then
      raise exception 'Los envíos solo están disponibles dentro de Argentina';
    end if;

    if nullif(trim(coalesce(p_provincia, '')), '') is null
       or nullif(trim(coalesce(p_ciudad, '')), '') is null
       or nullif(trim(coalesce(p_barrio, '')), '') is null
       or nullif(trim(coalesce(p_codigo_postal, '')), '') is null
       or nullif(trim(coalesce(p_calle, '')), '') is null
       or nullif(trim(coalesce(p_lugar_entrega, '')), '') is null
       or nullif(trim(coalesce(p_indicaciones_entrega, '')), '') is null then
      raise exception 'Faltan datos obligatorios de la dirección';
    end if;

    if not coalesce(p_sin_numero, false)
       and nullif(trim(coalesce(p_altura, '')), '') is null then
      raise exception 'Ingresá la altura o indicá S/N';
    end if;

    v_numero := case
      when coalesce(p_sin_numero, false) then 'S/N'
      else trim(p_altura)
    end;

    update public.remera
    set
      pais = 'Argentina',
      provincia = left(trim(p_provincia), 100),
      ciudad = left(trim(p_ciudad), 120),
      barrio = left(trim(p_barrio), 120),
      codigo_postal = left(upper(trim(p_codigo_postal)), 10),
      calle = left(trim(p_calle), 160),
      altura = case when coalesce(p_sin_numero, false) then null else left(trim(p_altura), 20) end,
      sin_numero = coalesce(p_sin_numero, false),
      piso = nullif(left(trim(coalesce(p_piso, '')), 20), ''),
      departamento = nullif(left(trim(coalesce(p_departamento, '')), 30), ''),
      entre_calles = nullif(left(trim(coalesce(p_entre_calles, '')), 180), ''),
      lugar_entrega = left(trim(p_lugar_entrega), 120),
      indicaciones_entrega = left(trim(p_indicaciones_entrega), 600),
      latitud = p_latitud,
      longitud = p_longitud,
      direccion = left(
        concat_ws(
          ', ',
          concat(trim(p_calle), ' ', v_numero),
          nullif(concat('Piso ', trim(coalesce(p_piso, ''))), 'Piso '),
          nullif(concat('Dpto. ', trim(coalesce(p_departamento, ''))), 'Dpto. '),
          concat('Barrio ', trim(p_barrio)),
          trim(p_ciudad),
          trim(p_provincia),
          concat('CP ', upper(trim(p_codigo_postal))),
          'Argentina'
        ),
        300
      ),
      updated_at = now()
    where dni = trim(p_dni)
      and lower(coalesce(email, '')) = lower(trim(p_email));
  else
    update public.remera
    set
      pais = null,
      provincia = null,
      ciudad = null,
      barrio = null,
      codigo_postal = null,
      calle = null,
      altura = null,
      sin_numero = false,
      piso = null,
      departamento = null,
      entre_calles = null,
      lugar_entrega = null,
      indicaciones_entrega = null,
      latitud = null,
      longitud = null,
      direccion = null,
      updated_at = now()
    where dni = trim(p_dni)
      and lower(coalesce(email, '')) = lower(trim(p_email));
  end if;

  get diagnostics v_filas = row_count;

  if v_filas <> 1 then
    raise exception 'No se encontró un pedido coincidente para guardar la dirección';
  end if;

  return true;
end;
$$;

revoke all on function public.guardar_direccion_remera(
  text, text, boolean, text, text, text, text, text, text, text, boolean,
  text, text, text, text, text, numeric, numeric
) from public;

grant execute on function public.guardar_direccion_remera(
  text, text, boolean, text, text, text, text, text, text, text, boolean,
  text, text, text, text, text, numeric, numeric
) to anon, authenticated;

-- Solicita a PostgREST que refresque funciones/columnas para que rpc() quede
-- disponible sin esperar al refresco automático de caché.
notify pgrst, 'reload schema';

commit;
