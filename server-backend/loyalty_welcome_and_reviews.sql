START TRANSACTION;

-- =========================================================
-- CONFIGURACION GLOBAL DE NIVELES DE LOYALTY
-- =========================================================
-- Regla actual:
-- 100 puntos = 1 EUR gastado
-- 1000 puntos = 1 EUR canjeable
-- Por tanto:
-- VIP = 100 EUR gastados = 10.000 puntos
-- Headliner = 250 EUR gastados = 25.000 puntos
-- Backstage = 500 EUR gastados = 50.000 puntos

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'parametros'
        AND COLUMN_NAME = 'stock_minimo'
    ),
    'SELECT 1',
    'ALTER TABLE parametros ADD COLUMN stock_minimo INT NOT NULL DEFAULT 10'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'parametros'
        AND COLUMN_NAME = 'loyalty_vip_threshold'
    ),
    'SELECT 1',
    'ALTER TABLE parametros ADD COLUMN loyalty_vip_threshold INT NOT NULL DEFAULT 10000'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'parametros'
        AND COLUMN_NAME = 'loyalty_headliner_threshold'
    ),
    'SELECT 1',
    'ALTER TABLE parametros ADD COLUMN loyalty_headliner_threshold INT NOT NULL DEFAULT 25000'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'parametros'
        AND COLUMN_NAME = 'loyalty_backstage_threshold'
    ),
    'SELECT 1',
    'ALTER TABLE parametros ADD COLUMN loyalty_backstage_threshold INT NOT NULL DEFAULT 50000'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO parametros (
  id,
  pricing_dinamico_activo,
  umbral_cola,
  porcentaje_subida,
  promociones_activas,
  stock_minimo,
  loyalty_vip_threshold,
  loyalty_headliner_threshold,
  loyalty_backstage_threshold
) VALUES (
  1,
  1,
  5,
  10.00,
  1,
  10,
  10000,
  25000,
  50000
)
ON DUPLICATE KEY UPDATE
  loyalty_vip_threshold = VALUES(loyalty_vip_threshold),
  loyalty_headliner_threshold = VALUES(loyalty_headliner_threshold),
  loyalty_backstage_threshold = VALUES(loyalty_backstage_threshold);

-- =========================================================
-- CONFIGURACION DE PUNTOS DE RESENA
-- =========================================================
-- Equivalencia economica:
-- 1000 puntos = 1 EUR
-- 100 puntos = 0,10 EUR
-- 50 puntos base = 0,05 EUR
-- 20 puntos extra = 0,02 EUR

CREATE TABLE IF NOT EXISTS resena_puntos_config (
  accion          VARCHAR(50)  NOT NULL PRIMARY KEY,
  puntos          INT          NOT NULL DEFAULT 0,
  descripcion     VARCHAR(255) NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1
);

INSERT INTO resena_puntos_config (accion, puntos, descripcion, activo) VALUES
  ('resena_base', 50, 'Por crear una reseña con al menos estrellas_general', 1),
  ('comentario_texto', 20, 'Por añadir comentario de texto de al menos 10 caracteres', 1),
  ('estrellas_servicio', 20, 'Por valorar servicio, personal y rapidez', 1),
  ('valoracion_producto', 20, 'Por cada producto valorado manualmente dentro del maximo global de 5 acciones extra', 1)
ON DUPLICATE KEY UPDATE
  puntos = VALUES(puntos),
  descripcion = VALUES(descripcion),
  activo = VALUES(activo);

-- =========================================================
-- BONUS DE BIENVENIDA PARA USUARIOS QUE AUN NO TENGAN CARTERA
-- =========================================================
-- Crea la cartera loyalty con 1000 puntos iniciales y totales historicos alineados.

INSERT INTO loyalty (
  usuario_id,
  puntos_total,
  puntos_pendientes,
  puntos_ganados_total,
  puntos_canjeados_total,
  nivel,
  activo,
  ultimo_movimiento_en
)
SELECT
  u.id,
  1000,
  0,
  1000,
  0,
  'fan',
  1,
  CURRENT_TIMESTAMP
FROM usuarios u
LEFT JOIN loyalty l ON l.usuario_id = u.id
WHERE l.id IS NULL;

-- Inserta el unico movimiento inicial de bienvenida para esas nuevas carteras.
INSERT INTO loyalty_movimientos (
  loyalty_id,
  pedido_id,
  tipo,
  origen,
  puntos,
  saldo_resultante,
  estado,
  descripcion,
  confirmado_en
)
SELECT
  l.id,
  NULL,
  'bonus',
  'sistema',
  1000,
  1000,
  'confirmado',
  'Bonus de bienvenida',
  CURRENT_TIMESTAMP
FROM loyalty l
LEFT JOIN loyalty_movimientos lm
  ON lm.loyalty_id = l.id
 AND lm.tipo = 'bonus'
 AND lm.origen = 'sistema'
 AND lm.descripcion = 'Bonus de bienvenida'
WHERE lm.id IS NULL
  AND l.puntos_total = 1000
  AND l.puntos_ganados_total = 1000
  AND l.puntos_canjeados_total = 0;

COMMIT;
