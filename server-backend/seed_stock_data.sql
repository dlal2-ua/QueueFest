-- =============================================================================
-- Seed: Datos realistas para el sistema de stock
-- Ejecutar en queuefest DB:
--   mysql -h 127.0.0.1 -P 12345 -u admin -p'Proyecto_Seguro2026!' queuefest < server-backend/seed_stock_data.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MATERIAS PRIMAS
--    Insumos reales del almacén central (coherentes con los productos existentes)
-- -----------------------------------------------------------------------------
INSERT INTO materias_primas (id, nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario, activo) VALUES
-- Bebidas
( 1, 'Cerveza Lata 33cl',         'unidad', 480.00,  60.00, 0.65, 1),
( 2, 'Ron Blanco 70cl',           'l',       45.00,   8.00, 7.20, 1),
( 3, 'Hierbabuena (manojo)',       'unidad',  80.00,  15.00, 0.50, 1),
( 4, 'Lima (unidad)',              'unidad', 150.00,  30.00, 0.20, 1),
( 5, 'Azúcar moreno (kg)',         'kg',      20.00,   4.00, 1.10, 1),
( 6, 'Agua con gas 33cl',         'unidad', 300.00,  40.00, 0.30, 1),
( 7, 'Ginebra 70cl',              'l',       30.00,   6.00, 9.50, 1),
( 8, 'Tónica lata 25cl',          'unidad', 240.00,  40.00, 0.55, 1),
( 9, 'Refresco Cola 33cl',        'unidad', 200.00,  30.00, 0.40, 1),
(10, 'Agua mineral 50cl',         'unidad', 350.00,  50.00, 0.25, 1),
(11, 'Cava botella 75cl',         'unidad',  40.00,   8.00,  5.50, 1),
(12, 'Licor Triple Seco 70cl',    'l',       15.00,   3.00, 11.00, 1),
-- Alimentación barras
(13, 'Pan de hamburguesa (unid)', 'unidad', 200.00,  40.00, 0.18, 1),
(14, 'Carne picada (kg)',         'kg',      50.00,  10.00, 6.80, 1),
(15, 'Tortilla de trigo (unid)',  'unidad', 300.00,  60.00, 0.15, 1),
(16, 'Pollo (kg)',                'kg',      40.00,   8.00, 5.20, 1),
(17, 'Tomate frito (kg)',         'kg',      20.00,   4.00, 1.80, 1),
(18, 'Queso rallado (kg)',        'kg',      15.00,   3.00, 4.50, 1),
(19, 'Masa de pizza (unid)',      'unidad', 120.00,  20.00, 0.80, 1),
(20, 'Pepperoni (kg)',            'kg',      10.00,   2.00, 8.00, 1),
(21, 'Patata (kg)',               'kg',      60.00,  12.00, 0.60, 1),
(22, 'Aceite de girasol (l)',     'l',       25.00,   5.00, 1.40, 1),
(23, 'Burrito precocido (unid)',  'unidad', 150.00,  30.00, 1.20, 1)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- -----------------------------------------------------------------------------
-- 2. ESCANDALLOS (producto_materias_primas)
--    Recetas de cada producto → qué materias primas consume y en qué cantidad
-- -----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE producto_materias_primas;
SET FOREIGN_KEY_CHECKS=1;


INSERT INTO producto_materias_primas (producto_id, materia_prima_id, cantidad_por_unidad) VALUES
-- Producto 1: Cerveza (puesto 1)
(1,  1, 1.000),   -- 1 lata
-- Producto 2: Mojito (puesto 1)
(2,  2, 0.050),   -- 50ml Ron
(2,  3, 0.250),   -- 1/4 manojo hierbabuena
(2,  4, 0.500),   -- 1/2 lima
(2,  5, 0.020),   -- 20g azúcar
(2,  6, 1.000),   -- 1 agua con gas
-- Producto 3: Agua (puesto 1)
(3, 10, 1.000),
-- Producto 4: Gin Tonic (puesto 2)
(4,  7, 0.050),   -- 50ml Ginebra
(4,  8, 1.000),   -- 1 tónica
-- Producto 5: Cerveza (puesto 2)
(5,  1, 1.000),
-- Producto 6: Refresco (puesto 2)
(6,  9, 1.000),
-- Producto 7: Cava (puesto 3)
(7, 11, 0.200),   -- 200ml cava
-- Producto 8: Cocktail Premium (puesto 3)
(8,  7, 0.040),
(8, 12, 0.020),
(8,  6, 1.000),
-- Producto 9: Taco Carne (puesto 4)
(9, 15, 2.000),   -- 2 tortillas
(9, 14, 0.120),   -- 120g carne
(9, 17, 0.050),
-- Producto 10: Taco Pollo (puesto 4)
(10, 15, 2.000),
(10, 16, 0.120),
(10, 17, 0.050),
-- Producto 11: Burrito (puesto 4)
(11, 23, 1.000),
-- Producto 12: Burger Clásica (puesto 5)
(12, 13, 1.000),
(12, 14, 0.200),
-- Producto 13: Burger BBQ (puesto 5)
(13, 13, 1.000),
(13, 14, 0.250),
-- Producto 14: Patatas Fritas (puesto 5)
(14, 21, 0.250),
(14, 22, 0.020),
-- Producto 15: Pizza Margarita (puesto 6)
(15, 19, 1.000),
(15, 17, 0.100),
(15, 18, 0.100),
-- Producto 16: Pizza Pepperoni (puesto 6)
(16, 19, 1.000),
(16, 17, 0.100),
(16, 18, 0.080),
(16, 20, 0.060),
-- Producto 17: Pizza Vegana (puesto 6)
(17, 19, 1.000),
(17, 17, 0.120),
-- Producto 23: Cerveza doble (puesto 1)
(23,  1, 2.000),
-- Producto 24: Burrito (puesto 1)
(24, 23, 1.000),
-- Producto 25: Pesicola (puesto 1)
(25,  9, 1.000);

-- -----------------------------------------------------------------------------
-- 3. STOCK_PUESTO
--    Stock de cada materia prima en cada puesto concreto
--    (min, max y actual → realistas para un festival en marcha)
-- -----------------------------------------------------------------------------
INSERT INTO stock_puesto (puesto_id, materia_prima_id, stock_actual, stock_minimo, stock_maximo) VALUES
-- Puesto 1: Barra Principal (barras de cerveza, mojitos, agua)
(1,  1,  60.00,  20.00, 120.00),  -- Cerveza lata      ⚠ cerca del mínimo
(1,  2,   4.50,   2.00,  12.00),  -- Ron
(1,  3,  12.00,   5.00,  30.00),  -- Hierbabuena
(1,  4,  20.00,   8.00,  50.00),  -- Lima
(1,  5,   2.00,   1.00,   6.00),  -- Azúcar
(1,  6,  25.00,  10.00,  80.00),  -- Agua con gas
(1,  9,  18.00,   8.00,  50.00),  -- Refresco cola
(1, 10,  30.00,  15.00,  80.00),  -- Agua mineral
(1, 23,  18.00,   5.00,  40.00),  -- Burrito precocido

-- Puesto 2: Bar Escenario B
(2,  1,  18.00,  20.00, 100.00),  -- Cerveza ❌ BAJO MÍNIMO
(2,  7,   3.00,   3.00,  10.00),  -- Ginebra  ⚠ en el límite
(2,  8,  22.00,  10.00,  60.00),  -- Tónica
(2,  9,  20.00,  10.00,  50.00),  -- Refresco

-- Puesto 3: Barra VIP
(3, 11,  12.00,   4.00,  20.00),  -- Cava
(3,  7,   2.50,   3.00,   8.00),  -- Ginebra ❌ BAJO MÍNIMO
(3, 12,   1.50,   1.00,   5.00),  -- Triple Seco
(3,  6,  30.00,  10.00,  60.00),  -- Agua con gas

-- Puesto 4: Food Truck Tacos
(4, 15,  80.00,  30.00, 200.00),  -- Tortillas
(4, 14,   8.00,   5.00,  20.00),  -- Carne
(4, 16,   6.00,   5.00,  20.00),  -- Pollo ⚠ cerca del mínimo
(4, 17,   3.00,   2.00,   8.00),  -- Tomate frito
(4, 23,  20.00,  10.00,  60.00),

-- Puesto 5: Food Truck Burgers
(5, 13,  45.00,  20.00, 100.00),  -- Pan hamburguesa
(5, 14,  12.00,   5.00,  25.00),  -- Carne picada
(5, 21,  18.00,   8.00,  40.00),  -- Patata
(5, 22,   3.50,   2.00,   8.00),  -- Aceite

-- Puesto 6: Food Truck Pizza
(6, 19,  25.00,  10.00,  60.00),  -- Masa pizza
(6, 17,   2.00,   2.00,   8.00),  -- Tomate frito ❌ BAJO MÍNIMO
(6, 18,   1.50,   1.50,   6.00),  -- Queso ❌ en el límite
(6, 20,   2.00,   1.00,   5.00),  -- Pepperoni

-- Puesto 9: Malibu Beach
(9,  1,  32.00,  12.00,  80.00),
(9,  7,   4.00,   2.00,   8.00),
(9,  8,  30.00,  12.00,  60.00),
(9,  9,  15.00,   8.00,  40.00),

-- Puesto 10: La barra del DJ
(10,  1,  10.00,  15.00,  60.00),  -- Cerveza ❌ BAJO MÍNIMO
(10,  9,  25.00,  10.00,  50.00),
(10, 10,  20.00,  10.00,  50.00)
ON DUPLICATE KEY UPDATE
  stock_actual = VALUES(stock_actual),
  stock_minimo = VALUES(stock_minimo),
  stock_maximo = VALUES(stock_maximo);

-- -----------------------------------------------------------------------------
-- 4. MOVIMIENTOS_STOCK (histórico de operaciones)
-- -----------------------------------------------------------------------------
INSERT INTO movimientos_stock (tipo, materia_prima_id, puesto_id_origen, puesto_id_destino, cantidad, usuario_id, notas, creado_en) VALUES
-- Reposiciones desde almacén central a puestos
('reposicion', 1,  NULL, 1, 120.00, 3, 'Carga inicial jornada', NOW() - INTERVAL 8 HOUR),
('reposicion', 2,  NULL, 1,  12.00, 3, 'Carga inicial jornada', NOW() - INTERVAL 8 HOUR),
('reposicion', 1,  NULL, 2, 100.00, 3, 'Carga inicial jornada', NOW() - INTERVAL 8 HOUR),
('reposicion', 7,  NULL, 2,  10.00, 3, 'Carga inicial jornada', NOW() - INTERVAL 8 HOUR),
('reposicion', 11, NULL, 3,  20.00, 3, 'Carga inicial VIP',     NOW() - INTERVAL 8 HOUR),
('reposicion', 19, NULL, 6,  60.00, 3, 'Carga inicial pizzas',  NOW() - INTERVAL 8 HOUR),
-- Ventas (descuentos por pedidos procesados)
('venta',  1,  1, NULL, 60.00, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 6 HOUR),
('venta',  2,  1, NULL,  7.50, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 6 HOUR),
('venta',  1,  2, NULL, 82.00, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 5 HOUR),
('venta',  7,  2, NULL,  7.00, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 5 HOUR),
('venta', 14,  5, NULL, 13.00, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 4 HOUR),
('venta', 19,  6, NULL, 35.00, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 4 HOUR),
('venta', 17,  6, NULL,  6.00, NULL, 'Descuento por ventas jornada', NOW() - INTERVAL 3 HOUR),
-- Mermas y ajustes
('merma',        3, 1, NULL,  3.00, 3, 'Hierbabuena caducada', NOW() - INTERVAL 2 HOUR),
('ajuste_manual', 1, NULL, 10, 10.00, 1, 'Corrección recuento físico barra DJ', NOW() - INTERVAL 1 HOUR);

-- -----------------------------------------------------------------------------
-- 5. ALERTAS_STOCK (alertas activas generadas por stock bajo)
-- -----------------------------------------------------------------------------
INSERT INTO alertas_stock (producto_id, puesto_id, materia_prima_id, mensaje, tipo, resuelta) VALUES
(NULL, 2, 1,  'Cerveza Lata 33cl en Bar Escenario B: stock 18 (mínimo 20)',  'stock_bajo', 0),
(NULL, 3, 7,  'Ginebra 70cl en Barra VIP: stock 2.5 (mínimo 3)',             'stock_bajo', 0),
(NULL, 6, 17, 'Tomate frito en Food Truck Pizza: stock 2 (mínimo 2)',        'agotado',    0),
(NULL, 6, 18, 'Queso rallado en Food Truck Pizza: stock 1.5 (mínimo 1.5)',   'stock_bajo', 0),
(NULL, 10, 1, 'Cerveza Lata 33cl en Barra DJ: stock 10 (mínimo 15)',         'stock_bajo', 0);

-- -----------------------------------------------------------------------------
-- 6. DECISIONES_AUTOMATICAS (sugerencias pendientes de aprobación)
-- -----------------------------------------------------------------------------
INSERT INTO decisiones_automaticas (festival_id, puesto_id, tipo, descripcion, estado) VALUES
(1, 2,  'reposicion_stock', 'Reponer Cerveza Lata 33cl en Bar Escenario B: enviar 82 unidades desde almacén (hasta máximo 100)', 'pendiente'),
(1, 3,  'reposicion_stock', 'Reponer Ginebra 70cl en Barra VIP: enviar 5.5l desde almacén (hasta máximo 8l)',                  'pendiente'),
(1, 6,  'reposicion_stock', 'Reponer Tomate frito en Food Truck Pizza: enviar 6kg desde almacén (hasta máximo 8kg)',            'pendiente'),
(1, 10, 'reposicion_stock', 'Reponer Cerveza Lata 33cl en Barra DJ: enviar 50 unidades desde almacén (hasta máximo 60)',        'pendiente');

-- -----------------------------------------------------------------------------
-- Verificación
-- -----------------------------------------------------------------------------
SELECT 'materias_primas'        AS tabla, COUNT(*) AS filas FROM materias_primas
UNION ALL
SELECT 'producto_materias_primas',          COUNT(*) FROM producto_materias_primas
UNION ALL
SELECT 'stock_puesto',                      COUNT(*) FROM stock_puesto
UNION ALL
SELECT 'movimientos_stock',                 COUNT(*) FROM movimientos_stock
UNION ALL
SELECT 'alertas_stock (no resueltas)',       COUNT(*) FROM alertas_stock WHERE resuelta = 0
UNION ALL
SELECT 'decisiones_automaticas (pendientes)', COUNT(*) FROM decisiones_automaticas WHERE estado = 'pendiente';
