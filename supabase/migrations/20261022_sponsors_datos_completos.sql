-- Datos de sponsors completados con busqueda web (22/10/2026).
-- Solo llena campos vacios, salvo descripcion (antes decia lo que aportan al evento: eso sigue en servicios/categoria) e instagram con parametros de rastreo.

-- Panadería San Carlos
UPDATE public.sponsors SET descripcion = 'Panadería de Concepción del Uruguay: pan, facturas, tortas y dulces, con envíos.', horario = COALESCE(NULLIF(horario, ''), 'Todos los días de 7 a 13 y de 16 a 20:30'), updated_at = now() WHERE id = '0dc53d28-efd4-48a1-ac3c-a5395adc8b14';

-- DJ Roda
UPDATE public.sponsors SET descripcion = 'DJ de Concepción del Uruguay para fiestas, eventos y casamientos.', updated_at = now() WHERE id = '558b53a2-469d-423c-83ab-25cf5b726123';

-- Emuná
UPDATE public.sponsors SET descripcion = 'Tienda de accesorios, ropa deportiva y ropa informal.', updated_at = now() WHERE id = 'dc3a4f44-4b12-4b5e-983a-8bc5be428038';

-- RD Deportes
UPDATE public.sponsors SET telefono = COALESCE(NULLIF(telefono, ''), '3442 640855'), whatsapp = COALESCE(NULLIF(whatsapp, ''), '5493442640855'), horario = COALESCE(NULLIF(horario, ''), 'Lun a vie 8:30 a 12:30 y 16 a 20; sáb 9 a 12:30 y 17 a 21'), instagram = 'https://instagram.com/rd.deportes', updated_at = now() WHERE id = 'ec1606cb-0810-4aac-9611-a3ca237325b7';

-- ServiTec
UPDATE public.sponsors SET email = COALESCE(NULLIF(email, ''), 'informaticabalbin@gmail.com'), horario = COALESCE(NULLIF(horario, ''), 'Lunes a viernes de 8 a 21'), facebook = COALESCE(NULLIF(facebook, ''), 'https://www.facebook.com/share/169yUqbK95/'), updated_at = now() WHERE id = '0e162a84-9853-408d-a228-ae593554fc62';

-- Miguel Imas Propiedades
UPDATE public.sponsors SET descripcion = 'Inmobiliaria: ventas, alquileres y tasaciones de casas, departamentos, locales y terrenos, a cargo de un corredor inmobiliario y martillero público matriculado.', updated_at = now() WHERE id = '87ac3595-54ac-4809-a68e-891aaf2bc02c';

-- Otra Vuelta
UPDATE public.sponsors SET descripcion = 'Viajes en bicicleta en grupo: se ocupan de la logística de las bicis, el alojamiento, las comidas y la coordinación, con vehículo de apoyo durante las rodadas. Salidas por distintos destinos del país.', telefono = COALESCE(NULLIF(telefono, ''), '3447 491308'), whatsapp = COALESCE(NULLIF(whatsapp, ''), '5493447491308'), email = COALESCE(NULLIF(email, ''), 'contacto@otravuelta.com.ar'), website = COALESCE(NULLIF(website, ''), 'https://otravuelta.com.ar'), facebook = COALESCE(NULLIF(facebook, ''), 'https://www.facebook.com/profile.php?id=61556830889359'), updated_at = now() WHERE id = '6dd21243-50b5-44db-a0d2-d38558d676b2';

-- Club Rivadavia
UPDATE public.sponsors SET descripcion = 'Club Atlético Rivadavia, club social y deportivo de Concepción del Uruguay fundado en 1941.', direccion = COALESCE(NULLIF(direccion, ''), 'Lorenzo Sartorio 1320, Concepción del Uruguay, Entre Ríos'), updated_at = now() WHERE id = '865beb8f-c09c-4451-b703-67967151b3de';

-- Il Palatium
UPDATE public.sponsors SET descripcion = 'Club de campo en Concepción del Uruguay para eventos: casamientos, cumpleaños y encuentros familiares y sociales.', telefono = COALESCE(NULLIF(telefono, ''), '3442 684175'), updated_at = now() WHERE id = 'dba663e6-1414-411f-b7fa-c687944f876d';

-- Ruca Outdoor
UPDATE public.sponsors SET descripcion = 'Marca de alforjas y accesorios para cicloturismo: alforjas, bolsos de manubrio y de cuadro, portaequipajes, bikepacking e indumentaria. Venta online a todo el país.', whatsapp = COALESCE(NULLIF(whatsapp, ''), '5491166821551'), facebook = COALESCE(NULLIF(facebook, ''), 'https://www.facebook.com/rucaoutdoors'), website = COALESCE(NULLIF(website, ''), 'https://www.rucaoutdoors.com.ar'), updated_at = now() WHERE id = '392b04ed-0217-44e8-a2ec-69f99fe53ac5';

-- Alto Impacto
UPDATE public.sponsors SET descripcion = 'Consultora ambiental de Concepción del Uruguay: servicios de consultoría ambiental integral y análisis complementarios.', updated_at = now() WHERE id = '21b1e92a-40c5-4884-a0bf-9129ac197073';

-- MultiPago
UPDATE public.sponsors SET descripcion = 'Red de cobranzas de Concepción del Uruguay: centro de pago de facturas y servicios, incluidas las boletas municipales.', telefono = COALESCE(NULLIF(telefono, ''), '3442 426655'), facebook = COALESCE(NULLIF(facebook, ''), 'https://www.facebook.com/multipago.ar/'), website = COALESCE(NULLIF(website, ''), 'https://www.multipago.com.ar/'), updated_at = now() WHERE id = '0f228c71-d6a7-4cd2-b5d0-2eccaa277cc2';

-- Estética Mara Saleb
UPDATE public.sponsors SET descripcion = 'Centro de estética con más de 10 años acompañando el cuidado de la piel: tratamientos faciales y corporales personalizados, con turno previo.', updated_at = now() WHERE id = '4ece44ac-0792-4d01-ae07-9c20017ed546';

-- 100% actitud
UPDATE public.sponsors SET descripcion = 'Ropa deportiva con envíos. Están en Concordia y Villa Elisa, Entre Ríos.', updated_at = now() WHERE id = 'e80bf26d-af60-4a33-8dd2-79ec3ecc9b47';

-- Cusco
UPDATE public.sponsors SET descripcion = 'Tienda de indumentaria unisex en Concepción del Uruguay, con envíos a todo el país.', direccion = COALESCE(NULLIF(direccion, ''), 'Bv. Ricardo Balbín 2020, Concepción del Uruguay, Entre Ríos'), updated_at = now() WHERE id = 'd9d1df8e-9b34-4b17-9b61-3505cf721c2c';

-- La ocasión gráfica
UPDATE public.sponsors SET descripcion = 'Gráfica publicitaria: banderas personalizadas y cartelería comercial, con envíos.', telefono = COALESCE(NULLIF(telefono, ''), '3442 408490'), whatsapp = COALESCE(NULLIF(whatsapp, ''), '5493442408490'), updated_at = now() WHERE id = '722c0134-3c23-499c-9044-bdf269b2e232';

-- El caballo de acero
UPDATE public.sponsors SET descripcion = 'Bicicletería con más de 15 años: venta de todo para tu bici y taller de reparación especializada.', direccion = COALESCE(NULLIF(direccion, ''), 'Galarza 1746, Concepción del Uruguay, Entre Ríos'), instagram = 'https://instagram.com/bicicleteriaelcaballodeacero', updated_at = now() WHERE id = '893f01c4-4f61-4283-bb2e-348ce584f75e';

-- Moksha • Arte Sustentable
UPDATE public.sponsors SET descripcion = 'Arte consciente hecho a mano por Marti: bordados, pintura, parches y gorras, en producción a pequeña escala.', updated_at = now() WHERE id = '205cb8e4-38dc-4477-8e62-a55bc1fc3c02';

-- Begins Sport
UPDATE public.sponsors SET facebook = COALESCE(NULLIF(facebook, ''), 'https://www.facebook.com/beginssport/'), updated_at = now() WHERE id = '434c1e99-128a-4877-8027-75daa46aff0c';

-- Frutas y verduras San Francisco
UPDATE public.sponsors SET direccion = COALESCE(NULLIF(direccion, ''), 'Millán 817 y Yrigoyen 1316 (dos locales), Concepción del Uruguay, Entre Ríos'), horario = COALESCE(NULLIF(horario, ''), 'Lun a sáb 7 a 21 hs, dom 8 a 13 hs'), updated_at = now() WHERE id = 'da6de07d-055c-4040-8864-390972b601b9';

-- Calypso
UPDATE public.sponsors SET descripcion = 'Calypso Náutica es un comercio de Concepción del Uruguay con artículos de náutica, pesca, camping y accesorios de caza.', updated_at = now() WHERE id = '4a0506f7-a437-4a41-98bd-ff4508b1b4db';

-- MarGus
UPDATE public.sponsors SET descripcion = 'Taller mecánico multimarca con diagnóstico computarizado: service, cajas automáticas, tren delantero y suspensión, aire acondicionado, alineación y balanceo, y mantenimiento de híbridos y eléctricos.', whatsapp = COALESCE(NULLIF(whatsapp, ''), '5493442508182'), email = COALESCE(NULLIF(email, ''), 'serviciomargus@gmail.com'), direccion = COALESCE(NULLIF(direccion, ''), 'Alfonsina Storni 1415, Concepción del Uruguay, Entre Ríos'), website = COALESCE(NULLIF(website, ''), 'https://www.margus.com.ar'), facebook = COALESCE(NULLIF(facebook, ''), 'https://www.facebook.com/profile.php?id=100051036111719'), updated_at = now() WHERE id = '8ee3dc7d-dead-4a90-a0e2-d2de503f95da';

-- Heladería Lucero
UPDATE public.sponsors SET descripcion = 'Heladería de helados artesanales de elaboración propia a la vista, con opciones aptas para celíacos y diabéticos, y postres.', updated_at = now() WHERE id = '43713dba-d08a-41f6-a4d5-acadf0782b54';

-- Bicicletería San José
UPDATE public.sponsors SET descripcion = 'L&B Bike es una bicicletería de San José con bicicletas para toda la familia, service, accesorios e indumentaria.', telefono = COALESCE(NULLIF(telefono, ''), '3447 498873'), whatsapp = COALESCE(NULLIF(whatsapp, ''), '5493447498873'), direccion = COALESCE(NULLIF(direccion, ''), 'Cettour y Malvinas Argentinas, San José, Entre Ríos'), updated_at = now() WHERE id = '2a55f092-eb3d-402c-818e-1ce6de636973';

-- Yerba Uruguai
UPDATE public.sponsors SET descripcion = 'Uruguaí es la primera marca de yerba registrada de Concepción del Uruguay: yerba mate estilo uruguayo (despalada y de molienda fina), que ganó el Gran Oro en el primer Mundial de la Yerba Mate. También vende accesorios y combos.', whatsapp = COALESCE(NULLIF(whatsapp, ''), '5493442400173'), website = COALESCE(NULLIF(website, ''), 'https://tiendauruguai.com'), updated_at = now() WHERE id = '146f8363-dac9-4045-81c4-34cb3cb24f9c';

-- Cedyt - Centro de diagnóstico y tratamiento
UPDATE public.sponsors SET instagram = 'https://instagram.com/cedyt.cdelu', updated_at = now() WHERE id = '9c471b61-428e-40d7-81f6-f9c759468563';

-- Aguapey Aventuras
UPDATE public.sponsors SET website = COALESCE(NULLIF(website, ''), 'https://taplink.cc/aguapeyaventuras'), updated_at = now() WHERE id = '1b8b5c93-7e03-40ad-8541-71e1a74f596c';

-- Carpintería artesanal GB
UPDATE public.sponsors SET descripcion = 'Carpintería artesanal: tablas de distintos modelos y tamaños y grabados láser. Le pedís lo que necesitás y te lo hacen.', updated_at = now() WHERE id = 'bf1e60db-535d-4486-835d-8887110419c0';

-- Verdulería La Porteña
UPDATE public.sponsors SET descripcion = 'Verdulería con frutas y verduras de calidad, con venta por mayor y por menor.', direccion = COALESCE(NULLIF(direccion, ''), 'Uncal 675, Concepción del Uruguay, Entre Ríos'), updated_at = now() WHERE id = 'e606bdbf-5169-417d-85dd-d92287b6348f';

-- Soderia Entre Ríos
UPDATE public.sponsors SET horario = COALESCE(NULLIF(horario, ''), 'Lun a Sáb de 8 a 13 y de 16 a 20:30'), updated_at = now() WHERE id = '828a0220-657d-491f-82f6-eede711c3d86';

-- Troya
UPDATE public.sponsors SET descripcion = 'Tienda de indumentaria deportiva femenina en Concepción del Uruguay, con envíos a todo el país.', direccion = COALESCE(NULLIF(direccion, ''), '8 de Junio 851, Concepción del Uruguay, Entre Ríos'), updated_at = now() WHERE id = '1fc14974-6aa7-4505-8227-c1eb36c9feef';

-- Estetica Zaklina
UPDATE public.sponsors SET descripcion = 'Centro de estética corporal y facial: depilación definitiva y pedicuría.', direccion = COALESCE(NULLIF(direccion, ''), 'Carosini 517, Concepción del Uruguay, Entre Ríos'), telefono = COALESCE(NULLIF(telefono, ''), '3442 561136'), updated_at = now() WHERE id = 'd5d5e5d4-f787-452a-a655-e357d670397b';

-- Molino Aventuras Multiparque
UPDATE public.sponsors SET descripcion = 'Parque aéreo para familias y grupos, a pocos minutos de San José y Colón, sobre el río Uruguay: circuitos con puentes colgantes y tirolesas para distintos niveles, palestra y salas de escape. Los más chicos tienen su propio molino infantil.', instagram = 'https://instagram.com/molinoaventuras', website = COALESCE(NULLIF(website, ''), 'https://www.molinoaventuras.com.ar'), updated_at = now() WHERE id = '5429f3aa-6994-4ad2-a1af-9360919a189b';

-- Rueda Libre
UPDATE public.sponsors SET descripcion = 'Bicicletería en Gualeguaychú: bicicletas y accesorios, indumentaria y alquiler de bicis.', updated_at = now() WHERE id = 'fba58945-a997-4bd1-9c58-3539554fbe4a';
