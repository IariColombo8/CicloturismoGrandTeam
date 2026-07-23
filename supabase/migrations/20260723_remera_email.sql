-- Migración: agrega el campo email (obligatorio en el formulario) a los pedidos de remera
ALTER TABLE public.remera ADD COLUMN IF NOT EXISTS email TEXT;
