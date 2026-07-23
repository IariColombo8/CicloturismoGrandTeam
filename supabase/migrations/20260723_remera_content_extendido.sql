-- Migración: agrega badgeText, price, talles y sizeChartImageUrl al contenido de
-- la sección remera, sembrando los valores que ya se muestran hoy en el sitio
-- (sin pisar campos que el admin ya haya personalizado).
UPDATE public.content_settings
SET data = jsonb_build_object(
  'badgeText', 'Merch oficial del evento',
  'title', 'Remera Grand Team Bike',
  'description', 'Llevate la remera oficial de la edición 2026. Elegí tu talle, adjuntá el comprobante y el equipo coordina la entrega con vos.',
  'imageUrl', '',
  'price', '',
  'callToActionTitle', '¿Querés tu remera?',
  'callToActionDescription', '',
  'aliasInfo', '',
  'features', jsonb_build_array(
    jsonb_build_object('id', 'f1', 'title', 'Remera oficial', 'description', 'Diseño exclusivo del evento Grand Team Bike 2026.'),
    jsonb_build_object('id', 'f2', 'title', 'Todos los talles', 'description', 'Desde XS hasta 5XL para que le quede bien a todos.'),
    jsonb_build_object('id', 'f3', 'title', 'Retiro o envío', 'description', 'Retirala en el evento o recibila en tu domicilio.'),
    jsonb_build_object('id', 'f4', 'title', 'Pago simple', 'description', 'Coordinás el pago por transferencia y adjuntás el comprobante.')
  ),
  'talles', to_jsonb(ARRAY['XS','S','M','L','XL','2XL','3XL','4XL','5XL']),
  'sizeChartImageUrl', '',
  'showSection', true
) || data
WHERE id = 'remera';
