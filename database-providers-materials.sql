-- ============================================================================
-- TABLA NECESARIA PARA GEST-014: Proveedores
-- ============================================================================

-- Tabla de relación entre proveedores y materias primas
-- Incluye precio unitario y plazo de entrega por proveedor
CREATE TABLE IF NOT EXISTS `proveedores_materias_primas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proveedor_id` int NOT NULL,
  `materia_prima_id` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Precio por unidad de medida de la materia prima',
  `plazo_entrega_dias` int NOT NULL DEFAULT '1' COMMENT 'Días de entrega para esta materia prima específica',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_proveedor_materia` (`proveedor_id`, `materia_prima_id`),
  KEY `idx_proveedor` (`proveedor_id`),
  KEY `idx_materia_prima` (`materia_prima_id`),
  CONSTRAINT `fk_pmp_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pmp_materia_prima` FOREIGN KEY (`materia_prima_id`) REFERENCES `materias_primas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Relación M:N entre proveedores y materias primas con precio';
