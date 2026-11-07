-- Unifica los nombres de grupo que la gente escribio distinto para el mismo grupo
-- (errores de tipeo, acentos, mayusculas, nombres cortados o con la ciudad al final).
-- Pedido del usuario el 06/11/2026. Solo se unificaron los que coinciden en el nombre
-- Y en la localidad de quienes lo escribieron.
--
-- Quedaron SEPARADOS a proposito (el nombre se parece pero la gente es de otro lugar,
-- o el texto nombra dos grupos):
--   "Los poco volvedores" (El Trebol, Las Parejas, Soldini) / "los pocovolvedores" (Alvear, Maria Susana)
--   "Empujando Limites - A toda Dulzura", "Empujando Limites / varela_riders",
--   "Cicloturismo termal y empujando limites"
--   "Rebeldes MTB" (Marcos Paz) / "Rebelbike" (Beccar) / "Rebelde" (CABA)
--   "Salidas en Bici (Rosario)" / "Salidas Tranqui Rosario"
--   "Bicicletas plegables argentina" (CABA) / "BPA Team" (C. del Uruguay)
--   "Junto por la bici y bici chas", "Juntos por la Bici y Bikers Spirits de CABA"
--
-- Ojo: "Grand Team Bike" pasa a "Grand Team Bike CdelU", que esta en
-- sorteos.excluir_grupos del sorteo de la bici: esa persona queda excluida como el resto
-- del Grand Team.
--
-- Idempotente: correrla dos veces no cambia nada.

UPDATE public.participantes AS p
SET grupo_ciclistas = m.nuevo
FROM (VALUES
  ('Ciclo Materos', 'Ciclomateros'),
  ('Los ciclomateros', 'Ciclomateros'),
  ('bici aventura', 'Bici Aventuras'),
  ('Mtb los charruas. Biciaventura', 'Bici Aventuras'),
  ('Kamikazetortuga', 'Kamikaze MTB'),
  ('Sansabat', 'Sansabtt'),
  ('Sansabt', 'Sansabtt'),
  ('San sabtt', 'Sansabtt'),
  ('Colon a Todo Pedal', 'Colón a Todo Pedal'),
  ('Colón A Todos Pedal', 'Colón a Todo Pedal'),
  ('Vuerlteros Bikers Federación', 'Vuelteros Bikers Federación'),
  ('Pedal Power Bikers Federación', 'Pedal Power'),
  ('Aceleradas', 'Las Aceleradas'),
  ('Las aceleradas', 'Las Aceleradas'),
  ('Empujando Limites', 'Empujando Límites'),
  ('Fenix', 'Fénix'),
  ('Transmisión Btt', 'Transmisión BTT'),
  ('Sancienbiciva', 'Sanci en bici va'),
  ('Pedaliando aventura', 'Pedaleando aventuras'),
  ('Aventureros del Pedal. Carlos Casares', 'Aventureros del Pedal'),
  ('Los Aventureros del Pedal', 'Aventureros del Pedal'),
  ('La heroica bike', 'La Heroica Bike'),
  ('La heroica montan bike', 'La Heroica Bike'),
  ('Juntos x la bici', 'Juntos por la Bici'),
  ('jyntos por la bici', 'Juntos por la Bici'),
  ('Bpateam', 'BPA Team'),
  ('MTB Chascomus', 'Cicloturismo MTB Chascomús'),
  ('Mtb chaco corrientes', 'Mtb chaco-corrientes'),
  ('Mtb chaco-corrientes y los sin frenos', 'Mtb chaco-corrientes'),
  ('enbiciando', 'En Bici Ando'),
  ('Chicas Trek Mixto', 'Chicas Trek'),
  ('Los Pedalines LT.Bikers', 'LT BIKES'),
  ('Salidas Tranqui/SenBRosario', 'Salidas Tranqui Rosario'),
  ('Grand Team bike', 'Grand Team Bike CdelU'),
  ('Grand Team Bike', 'Grand Team Bike CdelU'),
  ('Grand Team Bike Cdelu', 'Grand Team Bike CdelU'),
  ('Grand theam', 'Grand Team Bike CdelU'),
  ('Grande Team', 'Grand Team Bike CdelU'),
  ('No', 'Sin grupo'),
  ('Solo', 'Sin grupo'),
  ('Sin nombre', 'Sin grupo')
) AS m(viejo, nuevo)
WHERE p.grupo_ciclistas = m.viejo;
