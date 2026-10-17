-- ============================================================
-- Cargar un sponsor no puede fallar (y si falla, tiene que decir por que)
-- ============================================================
-- Tres problemas reales que hacian fallar /admin/sponsors sin explicacion:
--
-- 1. El bucket "sponsors" solo aceptaba JPG/PNG de hasta 2 MB. Cualquier foto
--    de celular (3-8 MB, muchas veces WEBP o HEIC) la rechazaba el Storage, y
--    la API devolvia un generico "Error al subir el archivo". Encima las rutas
--    de alojamientos y sorteos suben al MISMO bucket declarando 6 MB y
--    WEBP/AVIF: nunca podian cumplirlo.
--
-- 2. Admins que entraron al panel pero quedaron con auth_user_id NULL: la UI
--    los deja usar todo (resuelve el rol por email) y la RLS les rechaza cada
--    escritura (verifica por auth_user_id). Ven el panel y no pueden guardar.
--
-- 3. link_auth_user comparaba el email tal cual: un mail guardado con una
--    mayuscula o un espacio al final no vinculaba nunca.
-- ============================================================

-- 1. El bucket acepta cualquier imagen razonable, hasta 10 MB.
--    El cliente igual comprime antes de subir (lib/imagenes/prepararImagen.ts);
--    esto es la red de seguridad para lo que no se pueda comprimir.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/avif',
      'image/gif', 'image/svg+xml', 'image/heic', 'image/heif',
      'image/bmp', 'image/tiff', 'image/x-icon'
    ]
WHERE id = 'sponsors';

-- 2. link_auth_user tolera mayusculas y espacios en el email.
CREATE OR REPLACE FUNCTION public.link_auth_user(
  p_email TEXT,
  p_auth_user_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_login_method TEXT DEFAULT 'email'
)
RETURNS TABLE(role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE administradores
  SET
    auth_user_id = p_auth_user_id,
    last_login = now(),
    display_name = COALESCE(p_display_name, administradores.display_name),
    photo_url = COALESCE(p_photo_url, administradores.photo_url),
    login_method = p_login_method
  WHERE lower(trim(administradores.email)) = lower(trim(p_email))
    AND (administradores.auth_user_id IS NULL OR administradores.auth_user_id = p_auth_user_id);

  RETURN QUERY
    SELECT administradores.role::TEXT
    FROM administradores
    WHERE lower(trim(administradores.email)) = lower(trim(p_email));
END;
$function$;

-- 3. Vincular a los que ya entraron alguna vez y quedaron sueltos.
UPDATE administradores a
SET auth_user_id = u.id
FROM auth.users u
WHERE a.auth_user_id IS NULL
  AND lower(trim(u.email)) = lower(trim(a.email));
