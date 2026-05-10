-- =============================================================================
-- Migración: Sistema de Reseñas y Valoraciones
-- Fecha: 2026-04-26
-- Segura para re-ejecución: usa IF NOT EXISTS / INSERT IGNORE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. resena_puntos_config
--    Tabla de equivalencia de puntos por acción de reseña.
--    El administrador puede ajustar los valores sin tocar código.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resena_puntos_config (
  accion          VARCHAR(50)   NOT NULL,
  puntos          INT           NOT NULL DEFAULT 0,
  descripcion     VARCHAR(255)  NULL,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (accion)
) COMMENT = 'Tabla de equivalencia: puntos loyalty por cada acción de reseña';

-- Datos semilla (INSERT IGNORE para ser idempotente)
INSERT IGNORE INTO resena_puntos_config (accion, puntos, descripcion) VALUES
  ('resena_base',        50, 'Por crear una reseña con al menos estrellas_general'),
  ('comentario_texto',   20, 'Por añadir comentario de texto (mínimo 10 caracteres)'),
  ('estrellas_servicio', 20, 'Por valorar las 3 sub-estrellas (servicio/personal/rapidez)'),
  ('valoracion_producto',20, 'Por cada producto valorado manualmente (máximo 3 para evitar abuso)');


-- -----------------------------------------------------------------------------
-- 2. resenas
--    Reseña principal: una por pedido completado (UNIQUE pedido_id).
--    El puesto y el usuario se desnormalizan para queries de listado rápidas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resenas (
  id                    INT           NOT NULL AUTO_INCREMENT,
  pedido_id             INT           NOT NULL,
  usuario_id            INT           NOT NULL,
  puesto_id             INT           NOT NULL,
  estrellas_general     TINYINT       NOT NULL COMMENT 'Obligatorio, 1-5',
  comentario            TEXT          NULL     COMMENT 'Texto libre, opcional',
  estrellas_servicio    TINYINT       NULL     COMMENT 'Valoración del servicio, 1-5',
  estrellas_personal    TINYINT       NULL     COMMENT 'Valoración del personal, 1-5',
  estrellas_rapidez     TINYINT       NULL     COMMENT 'Valoración de la rapidez, 1-5',
  puntos_sumados        INT           NOT NULL DEFAULT 0 COMMENT 'Snapshot de los puntos loyalty otorgados',
  ia_procesado          TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = la IA ya analizó el comentario para inferir valoraciones de productos',
  creado_en             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_resena_pedido (pedido_id),
  INDEX   idx_resenas_puesto  (puesto_id),
  INDEX   idx_resenas_usuario (usuario_id),
  CONSTRAINT fk_res_pedido   FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_res_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
  CONSTRAINT fk_res_puesto   FOREIGN KEY (puesto_id)   REFERENCES puestos(id)   ON DELETE CASCADE,
  CONSTRAINT chk_res_estrellas_general  CHECK (estrellas_general  BETWEEN 1 AND 5),
  CONSTRAINT chk_res_estrellas_serv     CHECK (estrellas_servicio IS NULL OR estrellas_servicio BETWEEN 1 AND 5),
  CONSTRAINT chk_res_estrellas_pers     CHECK (estrellas_personal IS NULL OR estrellas_personal BETWEEN 1 AND 5),
  CONSTRAINT chk_res_estrellas_rap      CHECK (estrellas_rapidez  IS NULL OR estrellas_rapidez  BETWEEN 1 AND 5)
) COMMENT = 'Reseña principal por pedido completado (1 reseña por pedido)';


-- -----------------------------------------------------------------------------
-- 3. resenas_productos
--    Valoración de un producto individual dentro de una reseña.
--    origen='ia' para las valoraciones auto-inferidas del texto (futuro).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resenas_productos (
  id            INT         NOT NULL AUTO_INCREMENT,
  resena_id     INT         NOT NULL,
  producto_id   INT         NOT NULL,
  estrellas     TINYINT     NOT NULL COMMENT '1-5',
  comentario    TEXT        NULL     COMMENT 'Comentario específico al producto, opcional',
  origen        ENUM('manual','ia') NOT NULL DEFAULT 'manual' COMMENT 'manual=usuario, ia=inferido automáticamente',
  creado_en     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_resena_producto (resena_id, producto_id),
  INDEX   idx_rp_producto (producto_id),
  CONSTRAINT fk_rp_resena   FOREIGN KEY (resena_id)   REFERENCES resenas(id)   ON DELETE CASCADE,
  CONSTRAINT fk_rp_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT chk_rp_estrellas CHECK (estrellas BETWEEN 1 AND 5)
) COMMENT = 'Valoración individual de productos dentro de una reseña';


-- -----------------------------------------------------------------------------
-- Verificación final
-- -----------------------------------------------------------------------------
SELECT 'resena_puntos_config' AS tabla, COUNT(*) AS filas FROM resena_puntos_config
UNION ALL
SELECT 'resenas',                        COUNT(*)          FROM resenas
UNION ALL
SELECT 'resenas_productos',              COUNT(*)          FROM resenas_productos;

DESCRIBE resenas;
DESCRIBE resenas_productos;
SELECT accion, puntos, descripcion FROM resena_puntos_config ORDER BY puntos DESC;
