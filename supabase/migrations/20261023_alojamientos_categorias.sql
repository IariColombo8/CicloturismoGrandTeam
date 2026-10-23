-- Alojamientos de Concepcion del Uruguay por categoria.
-- GENERADO por scripts/alojamientos-md-a-sql.mjs desde
-- alojamientos-concepcion-del-uruguay.md: no editar a mano, cambiar el .md y
-- volver a correr el script.
--
-- Fuente: Servicios Turisticos de Alojamientos, septiembre 2026. Direccion de
-- Turismo de Concepcion del Uruguay. 67 alojamientos en 9 categorias.
--
-- categoria NULL = destacado bike friendly (los que ya estaban: El Viejo
-- Molino y Cabañas Dulce Amanecer), que siguen arriba como tarjetas grandes.

ALTER TABLE public.alojamientos
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS estrellas SMALLINT,
  ADD COLUMN IF NOT EXISTS clasificacion TEXT,
  ADD COLUMN IF NOT EXISTS mascotas TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alojamientos_categoria_check') THEN
    ALTER TABLE public.alojamientos ADD CONSTRAINT alojamientos_categoria_check CHECK (
      categoria IS NULL OR categoria IN ('hotel','apart','hosteria','complejo','bungalow','cabana','campo','casa','departamento')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alojamientos_estrellas_check') THEN
    ALTER TABLE public.alojamientos ADD CONSTRAINT alojamientos_estrellas_check CHECK (
      estrellas IS NULL OR estrellas BETWEEN 1 AND 5
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alojamientos_mascotas_check') THEN
    ALTER TABLE public.alojamientos ADD CONSTRAINT alojamientos_mascotas_check CHECK (
      mascotas IS NULL OR mascotas IN ('si','pequenas','medianas','no')
    );
  END IF;
END $$;

INSERT INTO public.alojamientos
  (categoria, nombre, direccion, telefono, estrellas, clasificacion, mascotas, descripcion, orden, activo, imagenes)
SELECT v.categoria, v.nombre, v.direccion, v.telefono, v.estrellas::smallint, v.clasificacion, v.mascotas,
       v.descripcion, v.orden, true, '{}'::text[]
FROM (VALUES
  ('hotel', 'Gran Texier', 'Eva Perón 114', '(3442) 15 671460', NULL, 'Hotel boutique', NULL, 'Habitaciones estándar, vintage y suite; desayuno continental; Wi-Fi; azotea con sala de descanso y recreación y solárium con piscina.', 100),
  ('hotel', 'Los Aguaribay', 'Artusi 797', '(3442) 154 06543', NULL, 'Hotel boutique', NULL, 'Piscina, estacionamiento, quincho, sala de estar. Incluye desayuno.', 101),
  ('hotel', 'Lourd Mary', 'Posadas 829', '(3442) 411200 / 472422', NULL, 'Hotel boutique', 'no', 'Suite. NO aceptan mascotas.', 102),
  ('hotel', 'Posta del Torreón', 'Almafuerte 799', '(3442) 432618', NULL, 'Hotel boutique', 'no', 'Pileta semicubierta, desayuno continental, Wi-Fi, A/A. NO aceptan mascotas.', 103),
  ('hotel', 'Circulo Policia Federal Argentina', 'Rocamora 219', '(3442) 431493', '3', 'Hotel', NULL, 'Desayuno, wifi, estacionamiento, AA, pileta, patio. Ropa de cama, convenios Inter círculos Suboficiales.', 104),
  ('hotel', 'Plaza Hotel', 'Eva Perón 117', '(3442) 426415 / 155 79278', '2', 'Hotel', 'si', 'Wi-Fi, salones para reuniones, cocheras cerradas limitadas. Aceptan MASCOTAS.', 105),
  ('hotel', 'Gran Litoral', 'Rocamora 1406', '(3442) 15 624678', '2', 'Hotel', 'si', 'A/A, desayuno, piscina, conserjería 24 hrs, cochera cerrada. Aceptan MASCOTAS.', 106),
  ('hotel', 'Circulo Prefectura Naval Argentina Apart HTL', 'Malvar y Pinto 517', '(3442) 422842', '2', 'Hotel', NULL, 'Consultar tarifas asociados y de convenios Inter Círculos.', 107),
  ('hotel', 'Río Hotel', 'B. Mitre 170', '(3442) 426755', '2', 'Hotel', NULL, NULL, 108),
  ('hotel', 'Casa Cielo Cardenal', 'Dra Ratto 541', NULL, NULL, 'Sin categoría', NULL, NULL, 109),
  ('apart', 'Agora', 'Maipú 67', '(3442) 15 569795', '3', 'Apart hotel', NULL, 'Wi-Fi, A/A, desayuno, piscina, cochera limitada, spa, parrilla, habitación adaptada. Consultar PROMOCIÓN.', 110),
  ('apart', 'La Delfina', 'Carosini 138', '(3442) 15 509960 / 15 643991', '3', 'Apart hotel', NULL, 'Cochera, desayuno seco.', 111),
  ('apart', 'Concepción Aparth', '3 de febrero 655', '(3442) 15 418669', '2', 'Apart hotel', 'pequenas', 'A/A, desayuno seco, TV, wifi, parrilla, cámaras de seguridad. Promoción por estadía y grupos. ACEPTAN MASCOTAS pequeñas.', 112),
  ('apart', 'Duplex Uruguay', 'Sarmiento 504', '(3442) 15 628820', '2', 'Apart hotel', NULL, NULL, 113),
  ('apart', 'El Ciervo', 'Gaucho Rivero 180', '(3442) 15 645300', '2', 'Apart hotel', NULL, 'Piscina, quincho, AA, alarma, Wi-Fi, Directv, parrillas, bicicletas, estacionamiento, cancha de fútbol, ropa de cama al ingreso sin reposición. Consultar PROMOCIÓN por más de 3 días.', 114),
  ('apart', 'Family Bung', 'Lisandro de la Torre 2980', '(3442) 442226', '2', 'Apart hotel', 'no', 'Quincho, pileta, wi-fi y AA. Desayuno seco, ropa de cama y mucama. NO aceptan mascotas.', 115),
  ('apart', 'Mexico', 'Carlos Granillo Posse 197', '(11) 3469-0257 / (3442) 15 579977', '2', 'Apart hotel', 'pequenas', 'Parque, pileta, quincho, parrilla, juegos, cable, wi-fi, cochera cubierta, A/A. ACEPTAN MASCOTAS PEQUEÑAS. Consultar PROMOCIÓN.', 116),
  ('apart', 'Millenium', '21 de Noviembre 340', '(3442) 15 458273', '2', 'Apart hotel', NULL, 'Incluye cochera.', 117),
  ('apart', 'Sol del Litoral', 'Autovía Artigas KM 130, Barrio Chacras II', NULL, '2', 'Apart hotel', 'pequenas', 'Cabañas equipadas, con desayuno incluido, parrilla individual, cochera techada, amplio parque y Wi-Fi. No incluye ropa de cama ni blanquería. ACEPTAN MASCOTAS PEQUEÑAS (con aviso previo y libreta sanitaria al día).', 118),
  ('apart', 'Adriano', 'Juana Azurduy 260', '(3442) 15 627894', '1', 'Apart hotel', 'no', 'Desayuno seco, ropa de cama, estacionamiento, parrilla. NO aceptan mascotas.', 119),
  ('apart', 'Altos de Artusi', 'A. Artusi 486', '(3442) 431084 / 156 46660', '1', 'Apart hotel', 'no', 'A/A. Wi-fi, cochera. NO aceptan mascotas.', 120),
  ('apart', 'Big Posadas', 'Galarza 219', '(3442) 15 505207', '1', 'Apart hotel', NULL, 'Dptos. equipados. Descuentos por estadías.', 121),
  ('apart', 'Bonato', 'Rocamora 1266', '(3442) 427621 / 15 538579', '1', 'Apart hotel', NULL, 'Dptos. equipados, A/A, calefacción, Wi-fi, cochera sin cargo adicional, ropa de cama y toallas.', 122),
  ('apart', 'Dulce Naturaleza', 'Autovía Artigas Km 131', '(3442) 15 640322', '1', 'Apart hotel', 'si', 'A/A. Ropa de cama, tv, heladera, anafe, vajilla. Piletas protegidas. Pileta para niños pequeños. Quincho con parrilla, patio con parrilla, parque, juegos para chicos. Aceptan MASCOTAS.', 123),
  ('apart', 'Ecos del Río', 'P. Sceliga 1287', '(3442) 15 559883', '1', 'Apart hotel', 'no', 'Parrilleros, WiFi, TV 32, aire acondicionado, heladera, cocina con horno, vajilla, ropa de cama, baño privado. Chicos: casita de juegos y hamaca. No aceptan mascotas.', 124),
  ('apart', 'El Viejo Duplino', 'Cdor Rubinsky y Proyectada', '(11) 15 4943687', '1', 'Apart hotel', NULL, 'Consultar promoción por estadía.', 125),
  ('apart', 'Ña Zuna', 'Autovía Artigas Km 124 Oeste', '(3442) 15 453527', '1', 'Apart hotel', NULL, 'Ropa de cama, piscina, parque, wifi, AA, parrilla. Mínimo dos noches.', 126),
  ('apart', 'Río Sol', 'Bv. Yrigoyen 474', '(3442) 15 566060', '1', 'Apart hotel', 'pequenas', 'Dptos. con cochera, bung con estacionamiento, calefacción, wifi, TV con cable, ropa de cama. ACEPTAN MASCOTAS pequeñas. (Adicional A/A.) Atención a huéspedes: bicis, gym, Club Rocamora (piletas, canchas de tenis y pádel), beneficios en Complejos Termales.', 127),
  ('hosteria', 'Antigua Fonda', 'España 172', '(3442) 433734', '2', 'Hostería', 'pequenas', 'Desayuno incluido, wi-fi, ropa de cama, A/A. ACEPTAN MASCOTAS pequeñas con cobro adicional.', 128),
  ('hosteria', 'Mitre', 'Mitre 949', '(3442) 429754', '2', 'Hostería', NULL, 'A/A, cochera, wi-fi, ropa de cama, baño privado.', 129),
  ('hosteria', 'Hostel 3260', 'Mariano Moreno 241', '(3442) 15 606412', NULL, 'Hostel', NULL, 'Habitaciones compartidas y privadas, cocina completa, patio con parrilla, wifi, televisión, servicio de ducha, lockers, lavarropas.', 130),
  ('hosteria', 'Casa Mboyere', 'Ameghino 68', '(3442) 15 674297', NULL, 'Sin categoría', NULL, 'Desayuno incluido, wi-fi, TV smart, ropa de cama, A/A, baño privado. Cocina completa, patio con parrilla, bicicletas. Apto niños y bebés.', 131),
  ('hosteria', 'Santa Rita', '34 del Oeste Norte 184', '(3442) 15 648120', NULL, 'Sin categoría', 'pequenas', 'A/A, wifi, cochera y parrilla individuales, con ropa de cama y servicio. ACEPTAN MASCOTAS pequeñas.', 132),
  ('hosteria', 'VH Apart', 'Bv. Sansoni 2075', '(3442) 15 415490', NULL, 'Sin categoría', NULL, NULL, 133),
  ('complejo', 'Termas Concepción', 'Autovía Artigas 14 Km. 129', '(3442) 15 473805', '3', NULL, 'no', 'Desayuno, mucama, parrilla, A/A. Entrada al complejo. Consultar PROMOCIÓN DESCUENTOS. NO aceptan mascotas.', 134),
  ('complejo', 'Verde y Sol en la Colonia', 'Calle Pública 1158 S/N (39 del Oeste Sur)', '(3442) 15 472829', '2', NULL, 'no', 'Consultar PROMOCIÓN por estadía. Wi-Fi, piscina, juegos para niños, amplio salón comedor y parrillas individuales. NO ACEPTAN MASCOTAS.', 135),
  ('bungalow', 'Brisas de la Colonia', 'Colonia Perfección Sur, Alberdi y Calle Pública', '(3442) 15 408810', '1', NULL, 'si', 'Ropa blanca, pileta con jacuzzi, wi-fi, juegos para niños, quincho, parrillas, cochera, amplio parque. ACEPTAN MASCOTAS.', 136),
  ('bungalow', 'El Amanecer', 'Granillo Posse y Rodríguez Artusi', '(3442) 15 642736', '1', NULL, NULL, 'Cochera, pileta. TV, Wi-Fi y AA. Sin desayuno, con ropa de cama y toallas opcional.', 137),
  ('bungalow', 'La Martoria', 'Ruta Nº 39 Km 142 Lote 43 (Pueblo Escondido)', '11 35726995', '1', NULL, NULL, 'Wi-Fi, TV, AA, sin blanquería, parque, pileta, parrilla, cochera descubierta. Consultar PROMOCIÓN.', 138),
  ('bungalow', 'La Querencia', 'Alfonsina Storni y Bv Uncal', '(3442) 15 579849 / 15 542384 / 15 554407', '1', NULL, 'si', 'Cochera y parrilla individual, piscina, sin desayuno, AA, Wi-Fi, limpieza opcional, salón, ACEPTAN MASCOTAS.', 139),
  ('cabana', 'Pura Vida Lodge', 'Barrio Rincón de Río, Calle Pública 453', '(3442) 15 557964', '2', NULL, 'medianas', 'Entrada vehículo. Parrilla individual, ropa blanca, DirecTV, Wi-Fi, A/A. ACEPTAN MASCOTAS medianas.', 140),
  ('cabana', 'Fogon Criollo', 'Alberdi entre Yorga Salomón y Félix Pereyra', '(3442) 15 487148', '1', NULL, 'si', 'Mínimo 3 días, blanquería, Wi-Fi, AA, tv, ACEPTAN MASCOTAS. Promo: 3 o más noches 10% desc.', 141),
  ('cabana', 'Santa Rosa de Lima', '35 del Oeste y 9 de Julio', '(3442) 15 629135', '1', NULL, NULL, 'Blanquería, AA, tv, Wi-Fi. Consultar PROMOCIÓN por estadía y más pasajeros.', 142),
  ('cabana', 'Costa del Rio Uruguay', 'Autovía Artigas Km 130', '(3442) 15 403774', NULL, 'Sin categoría', 'si', 'TV Directv, AA, cocina equipada, microondas, heladera, parrilla individual, pileta y cochera. Se entrega ropa de cama y de baño. Wi-Fi en todo el complejo, ACEPTAN MASCOTAS. Consultar PROMOCIÓN DESCUENTOS.', 143),
  ('campo', 'La Cipriana', 'Autovía Artigas 14 Km. 136, Aº Colman', '(3442) 15 649733', NULL, 'Casa de Campo', NULL, 'Casa totalmente equipada. WiFi, aire acondicionado, estufa a leña, microondas, cocina, heladera. Ropa blanca. Alquiler de bicicletas. Amplio parque con entorno rural, juegos, piscina, quincho y parrilla.', 144),
  ('campo', 'La Titina', 'Ruta Prov. 42 (ruta vieja 14) y Aº La China', NULL, NULL, 'Estancia', NULL, 'Incluye desayuno y ropa blanca, habitaciones con baño privado, cocina, comedor y living compartido. Wifi en zonas comunes y actividades de senderismo por la Reserva natural.', 145),
  ('casa', 'Benitez, Maria Teresa', 'Chacabuco 277', '(3442) 15 465921', NULL, NULL, 'no', 'Casa A. AA, TV, Wi-Fi, ropa de cama, churrasquera, garaje. Descuentos por estadía. NO aceptan mascotas.', 146),
  ('casa', 'El Esfuerzo', 'Bourband T 1216', '(3442) 15 545425', NULL, NULL, NULL, 'Casa, ropa de cama, cocina, TV, A/A frío, Wi-Fi, estacionamiento semi cubierto, vajillas, chulengo, desayuno seco.', 147),
  ('casa', 'El Rincón', 'Belgrano 320', '(3442) 424026 / 15 588803', NULL, NULL, NULL, 'Casa A, AA, churrasquera, patio, tv.', 148),
  ('casa', 'La Casa de Vivi', 'Rivadavia 177', '(3442) 15 481229', NULL, NULL, NULL, 'Alquila desde 2da quincena de Diciembre hasta 1ra quincena de Febrero.', 149),
  ('casa', 'Las Casuarinas', 'Ruta Nº 39 Km 142 Lote 41 B (Pueblo Escondido)', '(3442) 15 625378', NULL, NULL, 'si', 'Wifi, tv, AA, blanquería, cocina completa, parque, pileta, parrilla, ACEPTAN MASCOTAS.', 150),
  ('casa', 'Los Dos Soles', 'Aº Mandisoví, Barrio Las Quintas', '(3442) 15 602598', NULL, NULL, 'pequenas', 'Cabaña totalmente equipada, AA y ventilador, tv, wi-fi, parrilla, pileta. ACEPTAN MASCOTAS pequeñas.', 151),
  ('casa', 'Los Mirasoles', 'Calle Pública S/N, Arroyo Molino', '(3442) 15 641672', NULL, NULL, 'si', 'Casa container equipadas con AA, horno eléctrico, parrilla y pileta individuales, wifi, estacionamiento semi cubierto. Senderos. Ropa de cama, SE ACEPTAN MASCOTAS, heladera, vajilla, AA frío/calor en todos los ambientes, horno a leña portátil, disco, fogonero, anafes, agas y entradas a termas con descuento.', 152),
  ('casa', 'Mi Casita', 'Bv. Lauria 103', '(3442) 440907 / 15 453341 / 15 548553', NULL, NULL, NULL, 'Casa B. Matrimonial con AA, matrimonial y cucheta con ventilador, matrimonial + individual y cucheta, patio, tv, wifi, blancos, microondas, baño adaptado, piscina, parrillas, quincho.', 153),
  ('casa', 'Pequeño Arroyo', 'Autovía Artigas 14 Km 131', '(3442) 15 6 3355', NULL, NULL, 'si', 'Sin desayuno, parrilla, wi-fi, AA, cochera semicubierta, arroyo, parque, ropa de cama, blanquería. ACEPTAN MASCOTAS.', 154),
  ('casa', 'Refugios del Rio Ilo', 'Calle Pública 453 S/N, Rincón del Río', NULL, NULL, NULL, 'pequenas', 'Refugios equipados, AA, wifi, piscina, jacuzzi exterior, parrilla, fogoneros, estacionamiento, desayuno opcional. ACEPTAN MASCOTAS PEQUEÑAS.', 155),
  ('casa', 'Ikigay', 'Camino Rural Aº de la China Esq. Aº Mandisoví', '(3442) 15 407329 / (11) 6868-6239', NULL, 'Sin categoría', 'si', 'Casa quinta equipadas con AA, wifi, TV, pileta, parrilla, ACEPTAN MASCOTAS.', 156),
  ('casa', 'Ubuntu', 'Camino Rural Aº de la China Esq. Aº Mandisoví', '(3442) 15 407329 / (11) 6868-6239', NULL, 'Sin categoría', 'si', 'Casa quinta equipadas con AA, wifi, TV, pileta, parrilla, ACEPTAN MASCOTAS.', 157),
  ('departamento', 'Altos', 'Bv Yrigoyen 508 6º B', '(3442) 15 648690', NULL, NULL, 'si', 'Dpto. equipado. Ropa de cama o blanquería completa, aire acondicionado en todas las dependencias, acepta mascotas.', 158),
  ('departamento', 'Alma Vintage', 'Chacabuco 262', '(3442) 15 551427', NULL, NULL, NULL, 'Dpto. equipado. PROMOCIÓN por estadía.', 159),
  ('departamento', 'Buen Puerto', 'Lucilo López 365 PB', '(3442) 15 564271', NULL, NULL, 'no', 'Dpto. equipado. Incluye desayuno seco y frigobar. SUM, WIFI, monitoreo por cámaras las 24 hs. Estacionamiento. No se aceptan mascotas. Cochera privada. Opcional: alquiler de piraguas y bicicletas.', 160),
  ('departamento', 'El Balcón y el Balcon 2', 'Millán 284', '(3442) 15 621191', NULL, NULL, NULL, 'Dpto. equipado.', 161),
  ('departamento', 'Guay I', 'Calle Pública 425 Nº32', '(3442) 154 8 9128', NULL, NULL, 'si', 'Dpto equipado. WiFi y Directv; A/A; desayuno seco de bienvenida; ropa de cama y blanquería. ACEPTAN MASCOTAS.', 162),
  ('departamento', 'Guesthouse Alberdi', 'Alberdi 1313 Piso 2 B', '(3442) 15 671241', NULL, NULL, NULL, 'Habitación con cama matrimonial, 2 camas de una plaza en cocina comedor y AA frío calor. Balcón, ascensor y cochera.', 163),
  ('departamento', 'Las Palmas', 'Suipacha 780', '(3442) 15 485757', NULL, NULL, NULL, 'Dpto. equipado.', 164),
  ('departamento', 'Vistas del Puerto Viejo', 'Calderón 673 1º piso', '(3442) 15 648526', NULL, NULL, NULL, 'Dpto. equipado.', 165),
  ('departamento', '1914', 'Congreso de Tucumán 337', '(3442) 15 525871', NULL, NULL, NULL, 'Dpto. equipado, desayuno seco, ropa de cama. Descuentos por estadía.', 166)
) AS v (categoria, nombre, direccion, telefono, estrellas, clasificacion, mascotas, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.alojamientos a
  WHERE a.categoria = v.categoria AND lower(a.nombre) = lower(v.nombre)
);
