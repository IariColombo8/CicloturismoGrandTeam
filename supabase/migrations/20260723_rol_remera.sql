-- Migración: agregar rol "remera" para acceso restringido solo a /admin/remera
ALTER TABLE public.administradores DROP CONSTRAINT IF EXISTS administradores_role_check;
ALTER TABLE public.administradores ADD CONSTRAINT administradores_role_check
  CHECK (role IN ('admin', 'grandteam', 'usuario', 'remera'));

-- Otorga el rol "remera" al usuario begins.sport@gmail.com (solo ve/administra la sección remera)
INSERT INTO public.administradores (email, role, login_method)
VALUES ('begins.sport@gmail.com', 'remera', 'google')
ON CONFLICT (email) DO UPDATE SET role = 'remera';
