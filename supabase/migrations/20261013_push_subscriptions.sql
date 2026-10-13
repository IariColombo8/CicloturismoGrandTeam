-- ============================================
-- Suscripciones Web Push de los administradores
-- Cada dispositivo que activa las notificaciones guarda su endpoint aca.
-- El envio se hace desde el servidor con las claves VAPID.
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  -- URL unica que da el navegador: identifica al dispositivo.
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  -- Admin que activo las notificaciones en ese dispositivo.
  email       TEXT        NOT NULL,
  user_agent  TEXT,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ultimo envio exitoso, para detectar suscripciones muertas.
  ultimo_ok   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_subscriptions_email_idx
  ON public.push_subscriptions (email);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Todo el acceso pasa por API routes con service_role (que ignora RLS).
-- No se expone ninguna policy al cliente: los endpoints push son credenciales
-- de envio y no tienen por que viajar al navegador de nadie mas.
