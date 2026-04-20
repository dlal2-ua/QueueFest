-- =============================================================================
-- Migración: Sistema de Control de Stock por Puesto
-- Ejecutar en queuefest DB:
--   mysql -h 127.0.0.1 -P 12345 -u admin -p'Proyecto_Seguro2026!' queuefest < migrate_stock_puestos.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. stock_puesto
--    Stock de cada materia prima en un puesto concreto.
--    El almacén central sigue siendo materias_primas.stock_actual.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_puesto (
  puesto_id         INT            NOT NULL,
  materia_prima_id  INT            NOT NULL,
  stock_actual      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  stock_minimo      DECIMAL(10,2)  NOT NULL DEFAULT 0.00  COMMENT 'Umbral de alerta para este puesto',
  stock_maximo      DECIMAL(10,2)  NOT NULL DEFAULT 0.00  COMMENT 'Capacidad máxima del puesto (cuánto cabe físicamente)',
  actualizado_en    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (puesto_id, materia_prima_id),
  CONSTRAINT fk_sp_puesto        FOREIGN KEY (puesto_id)        REFERENCES puestos(id)        ON DELETE CASCADE,
  CONSTRAINT fk_sp_materia_prima FOREIGN KEY (materia_prima_id) REFERENCES materias_primas(id) ON DELETE CASCADE
) COMMENT = 'Stock de materias primas por puesto individual';

-- -----------------------------------------------------------------------------
-- 2. movimientos_stock
--    Registro de auditoría de todas las operaciones sobre stock.
--    - venta:          descuento automático al procesar un pedido
--    - reposicion:     traslado desde almacén central (materias_primas) al puesto
--    - merma:          pérdida/caducidad registrada manualmente
--    - ajuste_manual:  corrección de inventario por recuento físico
--
--    puesto_id_origen  NULL = el origen es el almacén central
--    puesto_id_destino NULL = el destino es descuento directo (venta/merma)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id                  INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo                ENUM('venta','reposicion','merma','ajuste_manual') NOT NULL,
  materia_prima_id    INT            NOT NULL,
  puesto_id_origen    INT            NULL     COMMENT 'NULL = almacén central',
  puesto_id_destino   INT            NULL     COMMENT 'NULL = descuento directo (venta/merma)',
  cantidad            DECIMAL(10,2)  NOT NULL COMMENT 'Siempre positivo; el tipo indica dirección',
  usuario_id          INT            NULL     COMMENT 'Quién realizó la operación',
  pedido_id           INT            NULL     COMMENT 'FK pedidos, sólo para tipo=venta',
  notas               VARCHAR(255)   NULL,
  creado_en           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mv_materia_prima    FOREIGN KEY (materia_prima_id)  REFERENCES materias_primas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mv_puesto_origen    FOREIGN KEY (puesto_id_origen)  REFERENCES puestos(id)         ON DELETE SET NULL,
  CONSTRAINT fk_mv_puesto_destino   FOREIGN KEY (puesto_id_destino) REFERENCES puestos(id)         ON DELETE SET NULL,
  CONSTRAINT fk_mv_usuario          FOREIGN KEY (usuario_id)        REFERENCES usuarios(id)        ON DELETE SET NULL,
  CONSTRAINT fk_mv_pedido           FOREIGN KEY (pedido_id)         REFERENCES pedidos(id)         ON DELETE SET NULL,
  INDEX idx_mv_materia_prima   (materia_prima_id),
  INDEX idx_mv_puesto_destino  (puesto_id_destino),
  INDEX idx_mv_tipo_fecha      (tipo, creado_en)
) COMMENT = 'Auditoría completa de movimientos de stock (ventas, reposiciones, mermas)';

-- -----------------------------------------------------------------------------
-- 3. Ampliar alertas_stock (compatible con MySQL < 8.0.29)
--    Añadir materia_prima_id + tipo + resuelta si no existen ya.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS _migrate_alertas_stock;
DELIMITER $$
CREATE PROCEDURE _migrate_alertas_stock()
BEGIN
  -- materia_prima_id
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas_stock' AND COLUMN_NAME = 'materia_prima_id'
  ) THEN
    ALTER TABLE alertas_stock ADD COLUMN materia_prima_id INT NULL AFTER puesto_id;
  END IF;

  -- tipo
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas_stock' AND COLUMN_NAME = 'tipo'
  ) THEN
    ALTER TABLE alertas_stock ADD COLUMN tipo ENUM('stock_bajo','agotado') NOT NULL DEFAULT 'stock_bajo' AFTER mensaje;
  END IF;

  -- resuelta
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas_stock' AND COLUMN_NAME = 'resuelta'
  ) THEN
    ALTER TABLE alertas_stock ADD COLUMN resuelta TINYINT(1) NOT NULL DEFAULT 0 AFTER tipo;
  END IF;

  -- FK materia_prima (sólo si aún no existe)
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas_stock' AND CONSTRAINT_NAME = 'fk_as_materia_prima'
  ) THEN
    ALTER TABLE alertas_stock
      ADD CONSTRAINT fk_as_materia_prima FOREIGN KEY (materia_prima_id) REFERENCES materias_primas(id) ON DELETE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL _migrate_alertas_stock();
DROP PROCEDURE IF EXISTS _migrate_alertas_stock;

-- -----------------------------------------------------------------------------
-- 4. Ampliar decisiones_automaticas
--    Añadir 'reposicion_stock' al ENUM de tipos.
-- -----------------------------------------------------------------------------
ALTER TABLE decisiones_automaticas
  MODIFY COLUMN tipo ENUM(
    'abrir_barra',
    'cerrar_barra',
    'activar_promocion',
    'ajuste_precio',
    'reposicion_stock'
  ) NOT NULL;

-- -----------------------------------------------------------------------------
-- Verificación final
-- -----------------------------------------------------------------------------
SELECT 'stock_puesto'         AS tabla, COUNT(*) AS filas FROM stock_puesto
UNION ALL
SELECT 'movimientos_stock',             COUNT(*)          FROM movimientos_stock;

DESCRIBE stock_puesto;
DESCRIBE movimientos_stock;
SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas_stock'
  ORDER BY ORDINAL_POSITION;
