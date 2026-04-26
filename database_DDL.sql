-- queuefest.materias_primas definition

CREATE TABLE `materias_primas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `unidad_medida` enum('g','kg','ml','l','unidad') NOT NULL DEFAULT 'unidad',
  `stock_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_minimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `costo_unitario` decimal(10,2) NOT NULL DEFAULT '0.00',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_materias_primas_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.parametros definition

CREATE TABLE `parametros` (
  `id` int NOT NULL DEFAULT '1',
  `umbral_cola` int NOT NULL DEFAULT '5',
  `umbral_ventas_bajas` int NOT NULL DEFAULT '3',
  `porcentaje_subida` decimal(5,2) NOT NULL DEFAULT '10.00',
  `porcentaje_bajada` decimal(5,2) NOT NULL DEFAULT '10.00',
  `pricing_dinamico_activo` tinyint(1) NOT NULL DEFAULT '1',
  `promociones_activas` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.resena_puntos_config definition

CREATE TABLE `resena_puntos_config` (
  `accion` varchar(50) NOT NULL,
  `puntos` int NOT NULL DEFAULT '0',
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tabla de equivalencia: puntos loyalty por cada acción de reseña';


-- queuefest.roles definition

CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` enum('administrador','gestor','operador','usuario') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.usuarios definition

CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `rol_id` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `alias` varchar(50) DEFAULT NULL COMMENT 'Nombre publico o nickname visible dentro de la app',
  `telefono` varchar(20) DEFAULT NULL COMMENT 'Telefono de contacto del usuario',
  `fecha_nacimiento` date DEFAULT NULL COMMENT 'Fecha de nacimiento para personalizacion, validaciones o promociones por edad',
  `ciudad` varchar(100) DEFAULT NULL COMMENT 'Ciudad habitual o de referencia del usuario',
  `idioma_preferido` varchar(10) NOT NULL DEFAULT 'es' COMMENT 'Idioma principal que usara el usuario en la interfaz',
  `festival_favorito` varchar(150) DEFAULT NULL COMMENT 'Festival o evento favorito del usuario para personalizar la experiencia',
  `preferencias_dieteticas` text COMMENT 'Preferencias alimentarias como vegano, vegetariano o halal',
  `alergias` text COMMENT 'Alergias o restricciones alimentarias importantes para recomendaciones y seguridad',
  `notificaciones_push` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indica si el usuario acepta notificaciones push de pedidos y avisos',
  `notificaciones_email` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indica si el usuario acepta recibir correos de la plataforma',
  `acepta_marketing` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indica si el usuario consiente comunicaciones comerciales y promociones',
  `avatar_url` varchar(255) DEFAULT NULL COMMENT 'URL de la imagen de perfil del usuario',
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha y hora de la ultima actualizacion del perfil',
  `ultimo_acceso_en` timestamp NULL DEFAULT NULL COMMENT 'Fecha y hora del ultimo acceso del usuario a la aplicacion',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_usuarios_alias` (`alias`),
  KEY `rol_id` (`rol_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.festivales definition

CREATE TABLE `festivales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `localizacion` varchar(100) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `festivales_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.gestor_config definition

CREATE TABLE `gestor_config` (
  `festival_id` int NOT NULL,
  `modo_auto` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`festival_id`),
  CONSTRAINT `gestor_config_ibfk_1` FOREIGN KEY (`festival_id`) REFERENCES `festivales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.loyalty definition

CREATE TABLE `loyalty` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `puntos_total` int NOT NULL DEFAULT '0' COMMENT 'Saldo actual de royalties disponible para usar o canjear',
  `puntos_pendientes` int NOT NULL DEFAULT '0' COMMENT 'Royalties generados pero aun no confirmados definitivamente',
  `puntos_ganados_total` int NOT NULL DEFAULT '0' COMMENT 'Total historico de royalties ganados por el usuario',
  `puntos_canjeados_total` int NOT NULL DEFAULT '0' COMMENT 'Total historico de royalties ya utilizados o canjeados',
  `nivel` varchar(30) NOT NULL DEFAULT 'fan' COMMENT 'Nivel actual del usuario dentro del programa de fidelizacion',
  `activo` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indica si la cartera de loyalty del usuario esta activa',
  `ultimo_movimiento_en` timestamp NULL DEFAULT NULL COMMENT 'Fecha y hora del ultimo movimiento de royalties',
  `ultimo_canje_en` timestamp NULL DEFAULT NULL COMMENT 'Fecha y hora del ultimo canje realizado por el usuario',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de creacion del registro de loyalty',
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha y hora de la ultima actualizacion del registro de loyalty',
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `loyalty_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.notificaciones definition

CREATE TABLE `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `mensaje` text NOT NULL,
  `leida` tinyint(1) DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.puestos definition

CREATE TABLE `puestos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `festival_id` int NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('barra','foodtruck') NOT NULL,
  `capacidad_max` int DEFAULT '5',
  `num_empleados` int DEFAULT '2',
  `abierto` tinyint(1) DEFAULT '1',
  `tiempo_servicio_medio` int DEFAULT '3',
  `foto_url` varchar(500) DEFAULT NULL,
  `pos_x` float DEFAULT NULL COMMENT 'Posición X en el mapa (0-100%)',
  `pos_y` float DEFAULT NULL COMMENT 'Posición Y en el mapa (0-100%)',
  PRIMARY KEY (`id`),
  KEY `festival_id` (`festival_id`),
  CONSTRAINT `puestos_ibfk_1` FOREIGN KEY (`festival_id`) REFERENCES `festivales` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.push_subscriptions definition

CREATE TABLE `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `endpoint` varchar(512) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_endpoint` (`endpoint`(255)),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.stock_puesto definition

CREATE TABLE `stock_puesto` (
  `puesto_id` int NOT NULL,
  `materia_prima_id` int NOT NULL,
  `stock_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_minimo` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Umbral de alerta para este puesto',
  `stock_maximo` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Capacidad máxima del puesto (cuánto cabe físicamente)',
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`puesto_id`,`materia_prima_id`),
  KEY `fk_sp_materia_prima` (`materia_prima_id`),
  CONSTRAINT `fk_sp_materia_prima` FOREIGN KEY (`materia_prima_id`) REFERENCES `materias_primas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_puesto` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stock de materias primas por puesto individual';


-- queuefest.notificaciones_usuario definition

CREATE TABLE `notificaciones_usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `puesto_id` int DEFAULT NULL,
  `tipo` varchar(64) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `payload` json DEFAULT NULL,
  `dedup_key` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_dedup` (`usuario_id`,`tipo`,`dedup_key`),
  KEY `puesto_id` (`puesto_id`),
  KEY `idx_notif_usuario_id` (`usuario_id`,`id`),
  KEY `idx_notif_usuario_leida_id` (`usuario_id`,`leida`,`id`),
  CONSTRAINT `notificaciones_usuario_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notificaciones_usuario_ibfk_2` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.payment_sessions definition

CREATE TABLE `payment_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `puesto_id` int NOT NULL,
  `provider` varchar(30) NOT NULL,
  `provider_session_id` varchar(255) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'created',
  `pedido_id` int DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `items_json` longtext NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pagado_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider_session_id` (`provider_session_id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `puesto_id` (`puesto_id`),
  CONSTRAINT `payment_sessions_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_sessions_ibfk_2` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.pedidos definition

CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `puesto_id` int NOT NULL,
  `estado` enum('pendiente','confirmado','preparando','listo','entregado','cancelado') DEFAULT 'pendiente',
  `total` decimal(10,2) NOT NULL,
  `puntos_ganados` int DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `puesto_id` (`puesto_id`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.productos definition

CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `puesto_id` int NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text,
  `precio` decimal(10,2) NOT NULL,
  `precio_dinamico` decimal(10,2) DEFAULT NULL,
  `stock` int DEFAULT '100',
  `activo` tinyint(1) DEFAULT '1',
  `foto_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `puesto_id` (`puesto_id`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.promociones definition

CREATE TABLE `promociones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `puesto_id` int NOT NULL,
  `producto_id` int DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text,
  `precio_promo` decimal(10,2) NOT NULL,
  `tipo` varchar(40) NOT NULL DEFAULT 'precio_fijo',
  `valor_descuento` decimal(10,2) DEFAULT NULL,
  `activa` tinyint(1) DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promociones_puesto_activa` (`puesto_id`,`activa`),
  KEY `idx_promociones_producto` (`producto_id`),
  CONSTRAINT `promociones_ibfk_1` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.puesto_operadores definition

CREATE TABLE `puesto_operadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `puesto_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_puesto_usuario` (`puesto_id`,`usuario_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `puesto_operadores_ibfk_1` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`),
  CONSTRAINT `puesto_operadores_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.resenas definition

CREATE TABLE `resenas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `puesto_id` int NOT NULL,
  `estrellas_general` tinyint NOT NULL COMMENT 'Obligatorio, 1-5',
  `comentario` text COMMENT 'Texto libre, opcional',
  `estrellas_servicio` tinyint DEFAULT NULL COMMENT 'Valoración del servicio, 1-5',
  `estrellas_personal` tinyint DEFAULT NULL COMMENT 'Valoración del personal, 1-5',
  `estrellas_rapidez` tinyint DEFAULT NULL COMMENT 'Valoración de la rapidez, 1-5',
  `puntos_sumados` int NOT NULL DEFAULT '0' COMMENT 'Snapshot de los puntos loyalty otorgados',
  `ia_procesado` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = la IA ya analizó el comentario para inferir valoraciones de productos',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_resena_pedido` (`pedido_id`),
  KEY `idx_resenas_puesto` (`puesto_id`),
  KEY `idx_resenas_usuario` (`usuario_id`),
  CONSTRAINT `fk_res_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_puesto` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_res_estrellas_general` CHECK ((`estrellas_general` between 1 and 5)),
  CONSTRAINT `chk_res_estrellas_pers` CHECK (((`estrellas_personal` is null) or (`estrellas_personal` between 1 and 5))),
  CONSTRAINT `chk_res_estrellas_rap` CHECK (((`estrellas_rapidez` is null) or (`estrellas_rapidez` between 1 and 5))),
  CONSTRAINT `chk_res_estrellas_serv` CHECK (((`estrellas_servicio` is null) or (`estrellas_servicio` between 1 and 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reseña principal por pedido completado (1 reseña por pedido)';


-- queuefest.resenas_productos definition

CREATE TABLE `resenas_productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resena_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `estrellas` tinyint NOT NULL COMMENT '1-5',
  `comentario` text COMMENT 'Comentario específico al producto, opcional',
  `origen` enum('manual','ia') NOT NULL DEFAULT 'manual' COMMENT 'manual=usuario, ia=inferido automáticamente',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_resena_producto` (`resena_id`,`producto_id`),
  KEY `idx_rp_producto` (`producto_id`),
  CONSTRAINT `fk_rp_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_resena` FOREIGN KEY (`resena_id`) REFERENCES `resenas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rp_estrellas` CHECK ((`estrellas` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Valoración individual de productos dentro de una reseña';


-- queuefest.alertas_inventario definition

CREATE TABLE `alertas_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `tipo` enum('stock_bajo','agotado') NOT NULL,
  `resuelta` tinyint(1) DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `alertas_inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.alertas_stock definition

CREATE TABLE `alertas_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int DEFAULT NULL,
  `puesto_id` int NOT NULL,
  `materia_prima_id` int DEFAULT NULL,
  `mensaje` varchar(255) NOT NULL,
  `tipo` enum('stock_bajo','agotado') NOT NULL DEFAULT 'stock_bajo',
  `resuelta` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  KEY `puesto_id` (`puesto_id`),
  KEY `fk_as_materia_prima` (`materia_prima_id`),
  CONSTRAINT `alertas_stock_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `alertas_stock_ibfk_2` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_as_materia_prima` FOREIGN KEY (`materia_prima_id`) REFERENCES `materias_primas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.decisiones_automaticas definition

CREATE TABLE `decisiones_automaticas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `festival_id` int NOT NULL,
  `puesto_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `tipo` enum('abrir_barra','cerrar_barra','activar_promocion','ajuste_precio','descuento_producto','reposicion_stock') NOT NULL,
  `descripcion` text,
  `estado` enum('pendiente','aprobada','rechazada','ejecutada') DEFAULT 'pendiente',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `grupo_ab` varchar(36) DEFAULT NULL COMMENT 'UUID que agrupa el par A/B',
  `variante` enum('A','B') DEFAULT NULL,
  `porcentaje` decimal(5,2) DEFAULT NULL COMMENT '% aplicado (+subida / -bajada)',
  `ventas_antes` int NOT NULL DEFAULT '0',
  `ventas_despues` int DEFAULT NULL,
  `ganadora` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `festival_id` (`festival_id`),
  KEY `decisiones_automaticas_ibfk_2` (`puesto_id`),
  KEY `fk_da_producto` (`producto_id`),
  CONSTRAINT `decisiones_automaticas_ibfk_1` FOREIGN KEY (`festival_id`) REFERENCES `festivales` (`id`),
  CONSTRAINT `decisiones_automaticas_ibfk_2` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_da_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.loyalty_movimientos definition

CREATE TABLE `loyalty_movimientos` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Identificador unico del movimiento de loyalty',
  `loyalty_id` int NOT NULL COMMENT 'Referencia a la cartera de loyalty del usuario',
  `pedido_id` int DEFAULT NULL COMMENT 'Pedido relacionado con el movimiento, si aplica',
  `tipo` varchar(30) NOT NULL COMMENT 'Tipo de movimiento: compra, bonus, canje, ajuste, expiracion',
  `origen` varchar(50) DEFAULT NULL COMMENT 'Origen del movimiento: app, admin, promocion, pedido, sistema',
  `puntos` int NOT NULL COMMENT 'Cantidad de royalties sumados o restados en el movimiento',
  `saldo_resultante` int DEFAULT NULL COMMENT 'Saldo final del usuario despues de aplicar el movimiento',
  `estado` varchar(20) NOT NULL DEFAULT 'confirmado' COMMENT 'Estado del movimiento: pendiente, confirmado o cancelado',
  `descripcion` varchar(255) DEFAULT NULL COMMENT 'Texto explicativo del motivo del movimiento',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora en la que se crea el movimiento',
  `confirmado_en` timestamp NULL DEFAULT NULL COMMENT 'Fecha y hora en la que el movimiento queda confirmado',
  PRIMARY KEY (`id`),
  KEY `fk_loyalty_movimientos_loyalty` (`loyalty_id`),
  KEY `fk_loyalty_movimientos_pedido` (`pedido_id`),
  CONSTRAINT `fk_loyalty_movimientos_loyalty` FOREIGN KEY (`loyalty_id`) REFERENCES `loyalty` (`id`),
  CONSTRAINT `fk_loyalty_movimientos_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de movimientos de royalties de cada usuario';


-- queuefest.movimientos_stock definition

CREATE TABLE `movimientos_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` enum('venta','reposicion','merma','ajuste_manual') NOT NULL,
  `materia_prima_id` int NOT NULL,
  `puesto_id_origen` int DEFAULT NULL COMMENT 'NULL = almacén central',
  `puesto_id_destino` int DEFAULT NULL COMMENT 'NULL = descuento directo (venta/merma)',
  `cantidad` decimal(10,2) NOT NULL COMMENT 'Siempre positivo; el tipo indica dirección',
  `usuario_id` int DEFAULT NULL COMMENT 'Quién realizó la operación',
  `pedido_id` int DEFAULT NULL COMMENT 'FK pedidos, sólo para tipo=venta',
  `notas` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mv_puesto_origen` (`puesto_id_origen`),
  KEY `fk_mv_usuario` (`usuario_id`),
  KEY `fk_mv_pedido` (`pedido_id`),
  KEY `idx_mv_materia_prima` (`materia_prima_id`),
  KEY `idx_mv_puesto_destino` (`puesto_id_destino`),
  KEY `idx_mv_tipo_fecha` (`tipo`,`creado_en`),
  CONSTRAINT `fk_mv_materia_prima` FOREIGN KEY (`materia_prima_id`) REFERENCES `materias_primas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mv_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mv_puesto_destino` FOREIGN KEY (`puesto_id_destino`) REFERENCES `puestos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mv_puesto_origen` FOREIGN KEY (`puesto_id_origen`) REFERENCES `puestos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mv_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Auditoría completa de movimientos de stock (ventas, reposiciones, mermas)';


-- queuefest.pedido_items definition

CREATE TABLE `pedido_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `promocion_id` int DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `importe_total` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pedido_id` (`pedido_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `pedido_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`),
  CONSTRAINT `pedido_items_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- queuefest.producto_materias_primas definition

CREATE TABLE `producto_materias_primas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `materia_prima_id` int NOT NULL,
  `cantidad_por_unidad` decimal(10,3) NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_producto_materia` (`producto_id`,`materia_prima_id`),
  KEY `idx_pmp_producto` (`producto_id`),
  KEY `idx_pmp_materia` (`materia_prima_id`),
  CONSTRAINT `fk_pmp_materia` FOREIGN KEY (`materia_prima_id`) REFERENCES `materias_primas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pmp_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;