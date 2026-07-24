-- Remeras: localidades oficiales, pin editable y entrega en Correo Argentino.
-- Ejecutar después de la migración de dirección/estados anterior.
-- Idempotente: puede ejecutarse más de una vez.

begin;

alter table public.remera
  add column if not exists provincia_id text,
  add column if not exists localidad_id text,
  add column if not exists destino_envio text not null default 'domicilio',
  add column if not exists sucursal_correo text;

update public.remera
set destino_envio = 'domicilio'
where destino_envio is null
   or destino_envio not in ('domicilio', 'correo');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'remera_destino_envio_check'
      and conrelid = 'public.remera'::regclass
  ) then
    alter table public.remera
      add constraint remera_destino_envio_check
      check (destino_envio in ('domicilio', 'correo'));
  end if;
end
$$;

create index if not exists remera_localidad_id_idx
  on public.remera (localidad_id);

create index if not exists remera_destino_envio_idx
  on public.remera (destino_envio);

-- RPC pública y acotada para completar los datos de entrega luego del upsert
-- realizado por /api/remera/submit. Barrio es opcional.
create or replace function public.guardar_entrega_remera_v2(
  p_dni text,
  p_email text,
  p_es_envio boolean,
  p_destino_envio text,
  p_pais text,
  p_provincia text,
  p_provincia_id text,
  p_ciudad text,
  p_localidad_id text,
  p_barrio text,
  p_codigo_postal text,
  p_sucursal_correo text,
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
  v_destino text;
  v_numero text;
  v_direccion text;
begin
  if p_dni is null or p_dni !~ '^[0-9]{7,8}$' then
    raise exception 'DNI inválido';
  end if;

  if p_email is null or position('@' in p_email) < 2 then
    raise exception 'Email inválido';
  end if;

  if p_latitud is not null and (p_latitud < -90 or p_latitud > 90) then
    raise exception 'Latitud inválida';
  end if;

  if p_longitud is not null and (p_longitud < -180 or p_longitud > 180) then
    raise exception 'Longitud inválida';
  end if;

  if coalesce(p_es_envio, false) then
    if lower(trim(coalesce(p_pais, ''))) <> 'argentina' then
      raise exception 'Los envíos solo están disponibles dentro de Argentina';
    end if;

    v_destino := lower(trim(coalesce(p_destino_envio, 'domicilio')));
    if v_destino not in ('domicilio', 'correo') then
      raise exception 'Modalidad de entrega inválida';
    end if;

    if nullif(trim(coalesce(p_provincia, '')), '') is null
       or nullif(trim(coalesce(p_ciudad, '')), '') is null
       or nullif(trim(coalesce(p_codigo_postal, '')), '') is null then
      raise exception 'Faltan provincia, localidad o código postal';
    end if;

    if v_destino = 'correo' then
      if nullif(trim(coalesce(p_sucursal_correo, '')), '') is null then
        raise exception 'Indicá la sucursal de Correo Argentino';
      end if;

      v_direccion := left(
        concat_ws(
          ', ',
          concat('Correo Argentino - ', trim(p_sucursal_correo)),
          trim(p_ciudad),
          trim(p_provincia),
          concat('CP ', upper(trim(p_codigo_postal))),
          'Argentina'
        ),
        300
      );

      update public.remera
      set
        pais = 'Argentina',
        provincia = left(trim(p_provincia), 100),
        provincia_id = nullif(left(trim(coalesce(p_provincia_id, '')), 20), ''),
        ciudad = left(trim(p_ciudad), 120),
        localidad_id = nullif(left(trim(coalesce(p_localidad_id, '')), 30), ''),
        barrio = null,
        codigo_postal = left(upper(trim(p_codigo_postal)), 10),
        destino_envio = 'correo',
        sucursal_correo = left(trim(p_sucursal_correo), 240),
        calle = null,
        altura = null,
        sin_numero = false,
        piso = null,
        departamento = null,
        entre_calles = null,
        lugar_entrega = 'Sucursal de Correo Argentino',
        indicaciones_entrega = null,
        latitud = p_latitud,
        longitud = p_longitud,
        direccion = v_direccion,
        updated_at = now()
      where dni = trim(p_dni)
        and lower(coalesce(email, '')) = lower(trim(p_email));
    else
      if nullif(trim(coalesce(p_calle, '')), '') is null
         or nullif(trim(coalesce(p_lugar_entrega, '')), '') is null
         or nullif(trim(coalesce(p_indicaciones_entrega, '')), '') is null then
        raise exception 'Faltan datos obligatorios del domicilio';
      end if;

      if not coalesce(p_sin_numero, false)
         and nullif(trim(coalesce(p_altura, '')), '') is null then
        raise exception 'Ingresá la altura o indicá S/N';
      end if;

      v_numero := case
        when coalesce(p_sin_numero, false) then 'S/N'
        else trim(p_altura)
      end;

      v_direccion := left(
        concat_ws(
          ', ',
          concat(trim(p_calle), ' ', v_numero),
          nullif(concat('Piso ', trim(coalesce(p_piso, ''))), 'Piso '),
          nullif(concat('Dpto. ', trim(coalesce(p_departamento, ''))), 'Dpto. '),
          case
            when nullif(trim(coalesce(p_barrio, '')), '') is not null
              then concat('Barrio ', trim(p_barrio))
            else null
          end,
          trim(p_ciudad),
          trim(p_provincia),
          concat('CP ', upper(trim(p_codigo_postal))),
          'Argentina'
        ),
        300
      );

      update public.remera
      set
        pais = 'Argentina',
        provincia = left(trim(p_provincia), 100),
        provincia_id = nullif(left(trim(coalesce(p_provincia_id, '')), 20), ''),
        ciudad = left(trim(p_ciudad), 120),
        localidad_id = nullif(left(trim(coalesce(p_localidad_id, '')), 30), ''),
        barrio = nullif(left(trim(coalesce(p_barrio, '')), 120), ''),
        codigo_postal = left(upper(trim(p_codigo_postal)), 10),
        destino_envio = 'domicilio',
        sucursal_correo = null,
        calle = left(trim(p_calle), 160),
        altura = case
          when coalesce(p_sin_numero, false) then null
          else left(trim(p_altura), 20)
        end,
        sin_numero = coalesce(p_sin_numero, false),
        piso = nullif(left(trim(coalesce(p_piso, '')), 20), ''),
        departamento = nullif(left(trim(coalesce(p_departamento, '')), 30), ''),
        entre_calles = nullif(left(trim(coalesce(p_entre_calles, '')), 180), ''),
        lugar_entrega = left(trim(p_lugar_entrega), 120),
        indicaciones_entrega = left(trim(p_indicaciones_entrega), 600),
        latitud = p_latitud,
        longitud = p_longitud,
        direccion = v_direccion,
        updated_at = now()
      where dni = trim(p_dni)
        and lower(coalesce(email, '')) = lower(trim(p_email));
    end if;
  else
    update public.remera
    set
      pais = null,
      provincia = null,
      provincia_id = null,
      ciudad = null,
      localidad_id = null,
      barrio = null,
      codigo_postal = null,
      destino_envio = 'domicilio',
      sucursal_correo = null,
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
    raise exception 'No se encontró un pedido coincidente para guardar la entrega';
  end if;

  return true;
end;
$$;

revoke all on function public.guardar_entrega_remera_v2(
  text, text, boolean, text, text, text, text, text, text, text, text,
  text, text, text, boolean, text, text, text, text, text, numeric, numeric
) from public;

grant execute on function public.guardar_entrega_remera_v2(
  text, text, boolean, text, text, text, text, text, text, text, text,
  text, text, text, boolean, text, text, text, text, text, numeric, numeric
) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
