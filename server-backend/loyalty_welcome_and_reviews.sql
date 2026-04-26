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

ALTER TABLE parametros
  ADD COLUMN IF NOT EXISTS stock_minimo INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS loyalty_vip_threshold INT NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS loyalty_headliner_threshold INT NOT NULL DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS loyalty_backstage_threshold INT NOT NULL DEFAULT 50000;

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

INSERT INTO resena_puntos_config (accion, puntos, descripcion, activo) VALUES
  ('resena_base_estrellas', 50, 'Puntos base por enviar una resena con estrellas generales', 1),
  ('resena_estrellas_servicio', 20, 'Extra por valorar el servicio', 1),
  ('resena_estrellas_personal', 20, 'Extra por valorar al personal', 1),
  ('resena_estrellas_rapidez', 20, 'Extra por valorar la rapidez', 1),
  ('resena_producto', 20, 'Extra por resenar un producto concreto', 1)
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
