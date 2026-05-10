-- =============================================================================
-- Seed: "Barra Mala" — puesto deliberadamente poco atractivo
-- Objetivo demo: nadie compra hasta que el gestor le pone promociones.
--
-- Diseño:
--   - precio = 50€ (caro de cara al usuario real en la app)
--   - precio_dinamico = 100€ (ratio dinamico/base = 2 → el bot hunde el factor
--     de precio al suelo (0.2) en su scoring; ver festival-bot.js:368-374)
--   - num_empleados = 1 (cuando alguien compre, la cola se acumula y penaliza
--     aún más el score)
--   - sin escandallo ni stock_puesto: el producto es "infinito" en materias
--     primas, así el único motivo de no compra es el score
--
-- Ejecutar:
--   mysql -h 127.0.0.1 -P 12346 -u admin -p'Proyecto_Seguro2026!' queuefest \
--     < server-backend/seed_barra_mala.sql
-- =============================================================================

-- 1. Puesto en Festival de Primavera 2026 (id=1)
INSERT INTO puestos
  (festival_id, nombre, tipo, capacidad_max, num_empleados, abierto, tiempo_servicio_medio, pos_x, pos_y)
VALUES
  (1, 'Barra Mala', 'barra', 5, 1, 1, 8, 85, 85);

SET @puesto_id = LAST_INSERT_ID();

-- 2. Único producto, deliberadamente caro
INSERT INTO productos
  (puesto_id, nombre, descripcion, precio, precio_dinamico, stock, activo)
VALUES
  (@puesto_id, 'Agua Premium Importada',
   'Agua mineral de un manantial lejano. Carísima sin justificación.',
   50.00, 100.00, 100, 1);

-- 3. Verificación
SELECT 'puesto creado' AS info, p.id, p.nombre, p.num_empleados, p.abierto
FROM puestos p WHERE p.id = @puesto_id
UNION ALL
SELECT 'producto creado', pr.id, pr.nombre,
       CAST(pr.precio AS CHAR), CAST(pr.precio_dinamico AS CHAR)
FROM productos pr WHERE pr.puesto_id = @puesto_id;
