-- ============================================
-- FIX: Funcion para vincular auth_user_id en primer login
--
-- Problema: Los registros migrados de Firestore no tienen auth_user_id.
-- Las politicas RLS verifican auth_user_id = auth.uid(), lo que bloquea
-- el UPDATE en el primer login.
--
-- Solucion: Funcion SECURITY DEFINER que bypasea RLS para vincular
-- el auth_user_id si el email coincide y auth_user_id es NULL.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION link_auth_user(p_email TEXT, p_auth_user_id UUID, p_display_name TEXT DEFAULT NULL, p_photo_url TEXT DEFAULT NULL, p_login_method TEXT DEFAULT 'email')
RETURNS TABLE(role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar auth_user_id solo si el email existe y auth_user_id es NULL o ya coincide
  UPDATE administradores
  SET
    auth_user_id = p_auth_user_id,
    last_login = now(),
    display_name = COALESCE(p_display_name, administradores.display_name),
    photo_url = COALESCE(p_photo_url, administradores.photo_url),
    login_method = p_login_method
  WHERE administradores.email = p_email
    AND (administradores.auth_user_id IS NULL OR administradores.auth_user_id = p_auth_user_id);

  -- Retornar el rol del usuario
  RETURN QUERY
    SELECT administradores.role::TEXT
    FROM administradores
    WHERE administradores.email = p_email;
END;
$$;
