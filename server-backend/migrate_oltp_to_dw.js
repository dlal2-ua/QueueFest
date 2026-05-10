/**
 * Migración queuefest (OLTP) → queuefest_dw (analítica / dashboards Admin).
 *
 * Requisitos (según Instrucciones_BD_Oracle.txt → en realidad MySQL vía SSH):
 *   - Túnel abierto al MySQL interno (p. ej. 127.0.0.1:12346 como index-adminDashboard.js).
 *
 * Ejecución (desde esta carpeta):
 *   MYSQL_HOST=127.0.0.1 MYSQL_PORT=12346 node migrate_oltp_to_dw.js
 *
 * Credenciales: MYSQL_USER / MYSQL_PASSWORD o .env si usas dotenv (carga opcional).
 *
 * Opciones:
 *   --dry-run    Solo muestra los pasos, no escribe en queuefest_dw
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');

const OLTP = 'queuefest';
const DW = 'queuefest_dw';

const connOpts = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 12346),
  user: process.env.MYSQL_USER || 'admin',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'Proyecto_Seguro2026!',
  multipleStatements: true,
};

const DDL_STATEMENTS = [
  `
  CREATE DATABASE IF NOT EXISTS \`${DW}\`
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_festival (
    festival_key INT NOT NULL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_puesto (
    puesto_key INT NOT NULL PRIMARY KEY,
    festival_key INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    abierto TINYINT(1) NOT NULL DEFAULT 1,
    capacidad_max INT DEFAULT NULL,
    tiempo_servicio_medio INT DEFAULT 2,
    num_empleados INT DEFAULT 1,
    pos_x DECIMAL(12,6) DEFAULT NULL,
    pos_y DECIMAL(12,6) DEFAULT NULL,
    KEY idx_dp_festival (festival_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_producto (
    producto_key INT NOT NULL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_usuario (
    usuario_key INT NOT NULL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    alias VARCHAR(100) DEFAULT NULL,
    rol VARCHAR(80) NOT NULL,
    fecha_registro DATETIME DEFAULT NULL,
    ultimo_acceso_en DATETIME DEFAULT NULL,
    nivel_loyalty VARCHAR(80) DEFAULT 'fan'
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_tiempo (
    tiempo_key BIGINT NOT NULL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TINYINT UNSIGNED NOT NULL,
    semana_anio INT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_metodo_pago (
    metodo_pago_key INT NOT NULL PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    UNIQUE KEY uq_codigo (codigo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_promocion (
    promocion_key INT NOT NULL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    precio_promo DECIMAL(12,2) DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_tipo_alerta (
    tipo_alerta_key INT NOT NULL PRIMARY KEY,
    codigo VARCHAR(80) NOT NULL,
    categoria ENUM('stock','operaciones') NOT NULL,
    severidad ENUM('critica','advertencia') NOT NULL,
    UNIQUE KEY uq_cod (codigo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_materia_prima (
    materia_prima_key INT NOT NULL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    unidad_medida VARCHAR(40) DEFAULT 'u',
    stock_minimo DECIMAL(14,2) DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_estado_pedido (
    estado_pedido_key INT NOT NULL PRIMARY KEY,
    estado_codigo VARCHAR(40) NOT NULL,
    estado_etiqueta VARCHAR(80) NOT NULL,
    orden_flujo INT NOT NULL DEFAULT 0,
    es_activo TINYINT(1) NOT NULL DEFAULT 1,
    es_completado TINYINT(1) NOT NULL DEFAULT 0,
    es_cancelado TINYINT(1) NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.bridge_producto_materia (
    producto_key INT NOT NULL,
    materia_prima_key INT NOT NULL,
    cantidad_por_unidad DECIMAL(16,8) NOT NULL DEFAULT 1,
    PRIMARY KEY (producto_key, materia_prima_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_ventas (
    venta_row_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tiempo_key BIGINT NOT NULL,
    puesto_key INT NOT NULL,
    usuario_key INT NOT NULL,
    producto_key INT NOT NULL,
    estado_pedido_key INT NOT NULL,
    metodo_pago_key INT NOT NULL,
    festival_key INT NOT NULL,
    pedido_id INT NOT NULL,
    pedido_item_id INT DEFAULT NULL,
    cantidad DECIMAL(14,4) NOT NULL DEFAULT 0,
    importe_linea DECIMAL(14,4) NOT NULL DEFAULT 0,
    coste_linea DECIMAL(14,4) NOT NULL DEFAULT 0,
    margen_linea DECIMAL(14,4) NOT NULL DEFAULT 0,
    descuento_linea DECIMAL(14,4) NOT NULL DEFAULT 0,
    promocion_key INT DEFAULT NULL,
    KEY idx_ft (tiempo_key),
    KEY idx_fp (pedido_id),
    KEY idx_ffest (festival_key),
    KEY idx_f_promo (promocion_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_operaciones (
    puesto_key INT NOT NULL,
    tiempo_key BIGINT NOT NULL,
    festival_key INT NOT NULL,
    espera_estimada_min DECIMAL(10,2) NOT NULL DEFAULT 0,
    ocupacion_actual DECIMAL(14,4) DEFAULT 0,
    ratio_ocupacion_pct DECIMAL(7,2) DEFAULT 0,
    estado_puesto VARCHAR(40) DEFAULT 'normal',
    PRIMARY KEY (puesto_key, tiempo_key),
    KEY idx_fop_festival (festival_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_alertas (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tipo_alerta_key INT NOT NULL,
    festival_key INT DEFAULT NULL,
    puesto_key INT DEFAULT NULL,
    producto_key INT DEFAULT NULL,
    tiempo_key BIGINT NOT NULL,
    mensaje TEXT,
    valor_actual DECIMAL(16,6) DEFAULT NULL,
    umbral DECIMAL(16,6) DEFAULT NULL,
    resuelta TINYINT(1) NOT NULL DEFAULT 0,
    tiempo_resolucion_min INT DEFAULT NULL,
    KEY idx_fa_open (resuelta, festival_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_inventario (
    festival_key INT NOT NULL,
    materia_prima_key INT NOT NULL,
    stock_actual DECIMAL(14,4) NOT NULL DEFAULT 0,
    consumo_hora DECIMAL(14,4) NOT NULL DEFAULT 0,
    horas_hasta_rotura DECIMAL(14,4) DEFAULT NULL,
    tiene_alerta TINYINT(1) NOT NULL DEFAULT 0,
    esta_agotado TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (festival_key, materia_prima_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_loyalty (
    usuario_key INT NOT NULL,
    festival_key INT NOT NULL,
    puntos_ganados DECIMAL(14,2) NOT NULL DEFAULT 0,
    puntos_canjeados DECIMAL(14,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (usuario_key, festival_key),
    KEY idx_fl_festival (festival_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_clv (
    usuario_key INT NOT NULL PRIMARY KEY,
    festival_key INT DEFAULT NULL,
    clv_estimado DECIMAL(14,4) DEFAULT 0,
    segmento VARCHAR(40) DEFAULT 'activo',
    num_pedidos INT DEFAULT 0,
    ticket_medio DECIMAL(14,4) DEFAULT 0,
    frecuencia_compra_semanal DECIMAL(10,6) DEFAULT 0,
    KEY idx_fc_festival (festival_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.fact_prediccion (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tiempo_key BIGINT NOT NULL,
    festival_key INT NOT NULL,
    puesto_key INT DEFAULT NULL,
    pedidos_predichos INT DEFAULT 0,
    ingresos_predichos DECIMAL(14,4) DEFAULT 0,
    confianza_pct DECIMAL(7,2) DEFAULT 75,
    es_hora_pico TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_fp_fest (festival_key, tiempo_key),
    KEY idx_fp_puesto (puesto_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function tableExists(conn, schema, name) {
  const [r] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [schema, name]
  );
  return r.length > 0;
}

async function ensureSchema(conn) {
  for (const sql of DDL_STATEMENTS) {
    await conn.query(sql);
  }
  // ampliar dim_puesto si ya existía sin columnas de mapa
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'dim_puesto'
       AND COLUMN_NAME IN ('capacidad_max','tiempo_servicio_medio','num_empleados','pos_x','pos_y')`,
    [DW]
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!(await tableExists(conn, DW, 'dim_puesto'))) return;
  if (!have.has('capacidad_max'))
    await conn.query(`ALTER TABLE \`${DW}\`.dim_puesto ADD COLUMN capacidad_max INT NULL AFTER abierto`);
  if (!have.has('tiempo_servicio_medio'))
    await conn.query(`ALTER TABLE \`${DW}\`.dim_puesto ADD COLUMN tiempo_servicio_medio INT DEFAULT 2 AFTER capacidad_max`);
  if (!have.has('num_empleados'))
    await conn.query(`ALTER TABLE \`${DW}\`.dim_puesto ADD COLUMN num_empleados INT DEFAULT 1 AFTER tiempo_servicio_medio`);
  if (!have.has('pos_x'))
    await conn.query(`ALTER TABLE \`${DW}\`.dim_puesto ADD COLUMN pos_x DECIMAL(12,6) DEFAULT NULL AFTER num_empleados`);
  if (!have.has('pos_y'))
    await conn.query(`ALTER TABLE \`${DW}\`.dim_puesto ADD COLUMN pos_y DECIMAL(12,6) DEFAULT NULL AFTER pos_x`);
}

async function truncateFactsAndDims(conn) {
  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  const tables = [
    'fact_prediccion',
    'fact_clv',
    'fact_loyalty',
    'fact_alertas',
    'fact_inventario',
    'fact_operaciones',
    'fact_ventas',
    'bridge_producto_materia',
    'dim_promocion',
    'dim_tipo_alerta',
    'dim_metodo_pago',
    'dim_estado_pedido',
    'dim_materia_prima',
    'dim_tiempo',
    'dim_producto',
    'dim_usuario',
    'dim_puesto',
    'dim_festival',
  ];
  for (const t of tables) {
    if (await tableExists(conn, DW, t)) {
      await conn.query(`TRUNCATE TABLE \`${DW}\`.\`${t}\``);
    }
  }
  await conn.query('SET FOREIGN_KEY_CHECKS=1');
}

async function execStep(conn, label, sql) {
  console.log('[→]', label);
  if (DRY) return;
  await conn.query(sql);
}

async function migrate(conn) {
  await execStep(conn, 'dim_metodo_pago (fijos)',
    `INSERT INTO \`${DW}\`.dim_metodo_pago (metodo_pago_key, codigo, nombre, tipo_canal) VALUES
     (1, 'mock', 'Pago simulado', 'online'), (2, 'stripe', 'Stripe', 'online'), (3, 'desconocido', 'Sin dato', 'desconocido')
     ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo_canal = VALUES(tipo_canal)`);

  await execStep(conn, 'dim_estado_pedido',
    `INSERT INTO \`${DW}\`.dim_estado_pedido (estado_pedido_key, estado_codigo, estado_etiqueta, orden_flujo, es_activo, es_completado, es_cancelado) VALUES
       (1, 'pendiente', 'Pendiente', 1, 1, 0, 0),
       (2, 'confirmado', 'Confirmado', 2, 1, 0, 0),
       (3, 'preparando', 'Preparando', 3, 1, 0, 0),
       (4, 'listo', 'Listo', 4, 1, 0, 0),
       (5, 'entregado', 'Entregado', 5, 0, 1, 0),
       (6, 'cancelado', 'Cancelado', 0, 0, 0, 1)`);

  await execStep(conn, 'dim_tipo_alerta (stock)',
    `INSERT INTO \`${DW}\`.dim_tipo_alerta (tipo_alerta_key, codigo, categoria, severidad) VALUES
       (1, 'stock_bajo', 'stock', 'advertencia'),
       (2, 'agotado', 'stock', 'critica'),
       (3, 'saturacion', 'operaciones', 'advertencia')`);

  await execStep(conn, 'dim_festival',
    `INSERT INTO \`${DW}\`.dim_festival (festival_key, nombre, activo)
     SELECT id, nombre, activo FROM \`${OLTP}\`.festivales`);

  {
    const [pcols] = await conn.query(`SHOW COLUMNS FROM \`${OLTP}\`.puestos`);
    const fld = new Set(pcols.map((c) => c.Field));
    const posX = fld.has('pos_x') ? 'NULLIF(p.pos_x, 0)' : 'NULL';
    const posY = fld.has('pos_y') ? 'NULLIF(p.pos_y, 0)' : 'NULL';
    if (!fld.has('pos_x') || !fld.has('pos_y')) {
      console.log('[i] OLTP sin pos_x/pos_y → dim_puesto con posiciones NULL.');
    }
    await execStep(conn, 'dim_puesto',
      `INSERT INTO \`${DW}\`.dim_puesto (
         puesto_key, festival_key, nombre, tipo, abierto,
         capacidad_max, tiempo_servicio_medio, num_empleados, pos_x, pos_y)
       SELECT
         p.id, p.festival_id, p.nombre, COALESCE(p.tipo, ''),
         IFNULL(CAST(p.abierto AS UNSIGNED), 1) & 1,
         CAST(p.capacidad_max AS UNSIGNED),
         COALESCE(p.tiempo_servicio_medio, 2),
         COALESCE(p.num_empleados, 1),
         ${posX}, ${posY}
       FROM \`${OLTP}\`.puestos p`);
  }

  await execStep(conn, 'dim_producto',
    `INSERT INTO \`${DW}\`.dim_producto (producto_key, nombre)
     SELECT id, nombre FROM \`${OLTP}\`.productos`);

  await execStep(conn, 'dim_promociones',
    `INSERT INTO \`${DW}\`.dim_promocion (promocion_key, titulo, precio_promo)
     SELECT id, titulo, precio_promo FROM \`${OLTP}\`.promociones`);

  await execStep(conn, 'dim_materias',
    `INSERT INTO \`${DW}\`.dim_materia_prima (materia_prima_key, nombre, unidad_medida, stock_minimo)
     SELECT id, nombre, COALESCE(unidad_medida, 'kg'), COALESCE(stock_minimo, 0)
     FROM \`${OLTP}\`.materias_primas`);

  await execStep(conn, 'dim_usuario',
    `INSERT INTO \`${DW}\`.dim_usuario (
       usuario_key, nombre, alias, rol,
       fecha_registro, ultimo_acceso_en, nivel_loyalty)
     SELECT
       u.id, u.nombre, NULL AS alias,
       LOWER(COALESCE(r.nombre, 'usuario')) AS rol,
       u.creado_en,
       COALESCE(u.actualizado_en, u.creado_en),
       COALESCE(l.nivel, 'fan')
     FROM \`${OLTP}\`.usuarios u
     LEFT JOIN \`${OLTP}\`.roles r ON r.id = u.rol_id
     LEFT JOIN \`${OLTP}\`.loyalty l ON l.usuario_id = u.id`);

  await execStep(conn, 'dim_tiempo desde pedidos',
    `INSERT INTO \`${DW}\`.dim_tiempo (tiempo_key, fecha, hora, semana_anio)
     SELECT DISTINCT
       (YEAR(p.creado_en) * 1000000 + MONTH(p.creado_en) * 10000 + DAY(p.creado_en) * 100 + HOUR(p.creado_en)) AS tiempo_key,
       DATE(p.creado_en) AS fecha,
       HOUR(p.creado_en) AS hora,
       YEARWEEK(p.creado_en, 3) AS semana_anio
     FROM \`${OLTP}\`.pedidos p`);

  if (await tableExists(conn, OLTP, 'producto_materias_primas')) {
    await execStep(conn, 'bridge_producto_materia',
      `INSERT INTO \`${DW}\`.bridge_producto_materia (producto_key, materia_prima_key, cantidad_por_unidad)
       SELECT producto_id, materia_prima_id, cantidad_por_unidad
       FROM \`${OLTP}\`.producto_materias_primas`);
  }
  const hasPaySessions = await tableExists(conn, OLTP, 'payment_sessions');
  const paymentExpr = hasPaySessions
    ? `COALESCE((SELECT CASE LOWER(TRIM(COALESCE(provider, 'mock')))
            WHEN 'stripe' THEN 2 ELSE 1 END
         FROM \`${OLTP}\`.payment_sessions ps WHERE ps.pedido_id = p.id
         ORDER BY ps.id DESC LIMIT 1), 1)`
    : '1';
  let piIdExpr = 'pi.id';
  try {
    const [pic] = await conn.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = '${OLTP}' AND TABLE_NAME='pedido_items' AND COLUMN_NAME='id'
       LIMIT 1`
    );
    if (!pic.length) piIdExpr = 'NULL';
  } catch {
    piIdExpr = 'NULL';
  }

  await execStep(conn, 'fact_ventas desde pedido_items',
    `INSERT INTO \`${DW}\`.fact_ventas (
       tiempo_key, puesto_key, usuario_key, producto_key,
       estado_pedido_key, metodo_pago_key, festival_key,
       pedido_id, pedido_item_id, cantidad, importe_linea,
       coste_linea, margen_linea, descuento_linea, promocion_key)
     SELECT
       (YEAR(p.creado_en) * 1000000 + MONTH(p.creado_en) * 10000
         + DAY(p.creado_en) * 100 + HOUR(p.creado_en)) AS tiempo_key,
       pu.id AS puesto_key,
       p.usuario_id AS usuario_key,
       pi.producto_id AS producto_key,
       CASE LOWER(TRIM(COALESCE(p.estado,'')))
            WHEN 'pendiente' THEN 1 WHEN 'confirmado' THEN 2 WHEN 'preparando' THEN 3
            WHEN 'listo' THEN 4 WHEN 'entregado' THEN 5 WHEN 'cancelado' THEN 6 ELSE 3 END AS estado_pedido_key,
       ${paymentExpr},
       pu.festival_id AS festival_key,
       p.id AS pedido_id,
       ${piIdExpr} AS pedido_item_id,
       pi.cantidad,
       ROUND(COALESCE(pi.importe_total, pi.cantidad * pi.precio_unitario), 4) AS importe_linea,
       ROUND(GREATEST(0, ROUND(COALESCE(pi.importe_total, pi.cantidad * pi.precio_unitario), 4) * 0.38), 4) AS coste_linea,
       ROUND(GREATEST(0, ROUND(COALESCE(pi.importe_total, pi.cantidad * pi.precio_unitario), 4)
         - ROUND(GREATEST(0, ROUND(COALESCE(pi.importe_total, pi.cantidad * pi.precio_unitario), 4) * 0.38), 4)) AS margen_linea,
       0 AS descuento_linea,
       pi.promocion_id AS promocion_key
     FROM \`${OLTP}\`.pedido_items pi
     JOIN \`${OLTP}\`.pedidos p ON p.id = pi.pedido_id
     JOIN \`${OLTP}\`.puestos pu ON pu.id = p.puesto_id`);

  await execStep(conn, 'fact_operaciones (agrupación puesto × hora pedido)',
    `INSERT INTO \`${DW}\`.fact_operaciones (
       puesto_key, tiempo_key, festival_key,
       espera_estimada_min, ocupacion_actual, ratio_ocupacion_pct, estado_puesto)
     SELECT
       pu.id AS puesto_key,
       agg.tiempo_key,
       pu.festival_id AS festival_key,
       LEAST(
         120,
         ROUND(GREATEST(0, (agg.cnt_pedidos_hora * COALESCE(pu.tiempo_servicio_medio, 2))
                         / NULLIF(GREATEST(COALESCE(pu.num_empleados, 1), 1), 0)), 2)
       ) AS espera_estimada_min,
       ROUND(agg.cnt_pedidos_hora * 18, 2) AS ocupacion_actual,
       LEAST(100,
         ROUND(100 * agg.cnt_pedidos_hora / NULLIF(GREATEST(COALESCE(pu.capacidad_max, agg.cnt_pedidos_hora, 50)), 0), 2)
       ) AS ratio_ocupacion_pct,
       IF(
         agg.cnt_pedidos_hora >= COALESCE((SELECT umbral_cola FROM \`${OLTP}\`.parametros WHERE id = 1 LIMIT 1), 5),
         'saturado','normal')
         AS estado_puesto
     FROM (
       SELECT
         ped.puesto_id,
         YEAR(ped.creado_en) * 1000000 + MONTH(ped.creado_en) * 10000
           + DAY(ped.creado_en) * 100 + HOUR(ped.creado_en) AS tiempo_key,
         COUNT(*) AS cnt_pedidos_hora
       FROM \`${OLTP}\`.pedidos ped
       GROUP BY ped.puesto_id,
         YEAR(ped.creado_en), MONTH(ped.creado_en), DAY(ped.creado_en), HOUR(ped.creado_en)
     ) AS agg
     JOIN \`${OLTP}\`.puestos pu ON pu.id = agg.puesto_id`);

  if (await tableExists(conn, OLTP, 'alertas_stock')) {
    const [acTs] = await conn.query(`SHOW COLUMNS FROM \`${OLTP}\`.alertas_stock LIKE 'creado_en'`);
    const tsRef = acTs.length ? 'COALESCE(a.creado_en, NOW())' : 'NOW()';
    await execStep(conn, 'fact_alertas ← alertas_stock',
      `INSERT INTO \`${DW}\`.fact_alertas (
         tipo_alerta_key, festival_key, puesto_key, producto_key,
         tiempo_key, mensaje, valor_actual, umbral,
         resuelta, tiempo_resolucion_min)
       SELECT
         CASE a.tipo WHEN 'stock_bajo' THEN 1 WHEN 'agotado' THEN 2 ELSE 1 END AS tipo_alerta_key,
         COALESCE((SELECT pu2.festival_id FROM \`${OLTP}\`.puestos pu2 WHERE pu2.id = a.puesto_id LIMIT 1), 1),
         a.puesto_id,
         a.producto_id AS producto_key,
         (YEAR(${tsRef}) * 1000000 + MONTH(${tsRef}) * 10000 + DAY(${tsRef}) * 100 + HOUR(${tsRef})) AS tiempo_key,
         COALESCE(a.mensaje,''),
         NULL,
         CAST(COALESCE(m.stock_minimo, 0) AS DECIMAL(16,6)) AS umbral,
         COALESCE(a.resuelta,0),
         NULL
       FROM \`${OLTP}\`.alertas_stock a
       LEFT JOIN \`${OLTP}\`.materias_primas m ON m.id = a.materia_prima_id`);
  } else {
    console.log('[!] OLTP sin alertas_stock — fact_alertas queda vacía.');
  }

  if (await tableExists(conn, OLTP, 'stock_puesto')) {
    const hasMovStock = await tableExists(conn, OLTP, 'movimientos_stock');
    if (hasMovStock) {
      await execStep(conn, 'fact_inventario desde stock_puesto (+ consumo últimos 14 días)',
        `INSERT INTO \`${DW}\`.fact_inventario (
          festival_key, materia_prima_key, stock_actual, consumo_hora,
          horas_hasta_rotura, tiene_alerta, esta_agotado)
        SELECT
          pu.festival_id AS festival_key,
          sp.materia_prima_id,
          SUM(sp.stock_actual) AS stock_actual,
          ROUND(COALESCE(MAX(cons.consumido_14d) / 336.0, 0), 6) AS consumo_hora,
          ROUND(
            CASE WHEN COALESCE(MAX(cons.consumido_14d), 0) > 0.0001
                 THEN SUM(sp.stock_actual) / NULLIF((MAX(cons.consumido_14d) / 336.0), 0)
                 ELSE NULL END
          , 4) AS horas_hasta_rotura,
          CASE WHEN SUM(sp.stock_actual) <= COALESCE(MAX(dm.stock_minimo), 0) THEN 1 ELSE 0 END,
          CASE WHEN SUM(sp.stock_actual) <= 0 THEN 1 ELSE 0 END
        FROM \`${OLTP}\`.stock_puesto sp
        JOIN \`${OLTP}\`.puestos pu ON pu.id = sp.puesto_id
        JOIN \`${DW}\`.dim_materia_prima dm ON dm.materia_prima_key = sp.materia_prima_id
        LEFT JOIN (
          SELECT ms.materia_prima_id, SUM(ms.cantidad) AS consumido_14d
          FROM \`${OLTP}\`.movimientos_stock ms
          WHERE ms.tipo IN ('venta','merma') AND ms.creado_en >= NOW() - INTERVAL 14 DAY
          GROUP BY ms.materia_prima_id
        ) AS cons ON cons.materia_prima_id = sp.materia_prima_id
        GROUP BY pu.festival_id, sp.materia_prima_id`);
    } else {
      await execStep(conn, 'fact_inventario desde stock_puesto (sin movimientos_stock)',
        `INSERT INTO \`${DW}\`.fact_inventario (
          festival_key, materia_prima_key, stock_actual, consumo_hora,
          horas_hasta_rotura, tiene_alerta, esta_agotado)
        SELECT
          pu.festival_id AS festival_key,
          sp.materia_prima_id,
          SUM(sp.stock_actual) AS stock_actual,
          0, NULL,
          CASE WHEN SUM(sp.stock_actual) <= COALESCE(MAX(dm.stock_minimo), 0) THEN 1 ELSE 0 END,
          CASE WHEN SUM(sp.stock_actual) <= 0 THEN 1 ELSE 0 END
        FROM \`${OLTP}\`.stock_puesto sp
        JOIN \`${OLTP}\`.puestos pu ON pu.id = sp.puesto_id
        JOIN \`${DW}\`.dim_materia_prima dm ON dm.materia_prima_key = sp.materia_prima_id
        GROUP BY pu.festival_id, sp.materia_prima_id`);
    }
  } else {
    console.log('[!] OLTP sin stock_puesto — fact_inventario desde materias_primas sólo.');
    await execStep(conn, 'fact_inventario desde materias_primas (solo festival por defecto 1)',
      `INSERT INTO \`${DW}\`.fact_inventario (
        festival_key, materia_prima_key, stock_actual, consumo_hora,
        horas_hasta_rotura, tiene_alerta, esta_agotado)
      SELECT DISTINCT
        1 AS festival_key,
        mp.id AS materia_prima_key,
        COALESCE(mp.stock_actual, 0) AS stock_actual,
        0, NULL,
        CASE WHEN COALESCE(mp.stock_actual, 0) <= COALESCE(mp.stock_minimo, 0) THEN 1 ELSE 0 END,
        CASE WHEN COALESCE(mp.stock_actual, 0) <= 0 THEN 1 ELSE 0 END
      FROM \`${OLTP}\`.materias_primas mp`);
  }

  if (await tableExists(conn, OLTP, 'loyalty_movimientos')) {
    await execStep(conn, 'fact_loyalty (movimientos → usuario × festival)',
      `INSERT INTO \`${DW}\`.fact_loyalty (usuario_key, festival_key, puntos_ganados, puntos_canjeados)
       SELECT
         l.usuario_id,
         COALESCE(pu.festival_id, 1) AS festival_key,
         SUM(GREATEST(0, lm.puntos)) AS puntos_ganados,
         SUM(CASE WHEN lm.puntos < 0 THEN ABS(lm.puntos) ELSE 0 END) AS puntos_canjeados
       FROM \`${OLTP}\`.loyalty_movimientos lm
       JOIN \`${OLTP}\`.loyalty l ON l.id = lm.loyalty_id
       LEFT JOIN \`${OLTP}\`.pedidos ped ON ped.id = lm.pedido_id
       LEFT JOIN \`${OLTP}\`.puestos pu ON pu.id = ped.puesto_id
       GROUP BY l.usuario_id, COALESCE(pu.festival_id, 1)`);
  }
}

async function finalizeClVyPrediccion(conn) {
  await execStep(conn, 'fact_clv (métricas por usuario desde fact_ventas)',
    `INSERT INTO \`${DW}\`.fact_clv (
       usuario_key, festival_key, clv_estimado, segmento,
       num_pedidos, ticket_medio, frecuencia_compra_semanal)
     SELECT
       fv.usuario_key,
       NULL,
       SUM(fv.importe_linea),
       CASE
         WHEN du.nivel_loyalty IN ('backstage','headliner','vip','VIP','Backstage') THEN 'VIP'
         WHEN TIMESTAMPDIFF(DAY, COALESCE(du.ultimo_acceso_en, '1970-01-01'), NOW()) > 35 THEN 'inactivo'
         ELSE COALESCE(NULLIF(TRIM(du.nivel_loyalty), ''), 'activo')
       END,
       COUNT(DISTINCT fv.pedido_id),
       ROUND(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.pedido_id), 0), 4),
       ROUND(
        COUNT(DISTINCT fv.pedido_id)
        / NULLIF(GREATEST(1 + TIMESTAMPDIFF(WEEK,
            (SELECT MIN(dt.fecha) FROM \`${DW}\`.fact_ventas f2
               JOIN \`${DW}\`.dim_tiempo dt ON dt.tiempo_key = f2.tiempo_key
             WHERE f2.usuario_key = fv.usuario_key),
            CURDATE()), 1), 0)
       , 6)
     FROM \`${DW}\`.fact_ventas fv
     JOIN \`${DW}\`.dim_usuario du ON du.usuario_key = fv.usuario_key
     GROUP BY fv.usuario_key, du.nivel_loyalty, du.ultimo_acceso_en`);

  await execStep(conn, 'vacía fact_prediccion',
    `TRUNCATE TABLE \`${DW}\`.fact_prediccion`);

  await execStep(conn, 'fact_prediccion (serie histórica = base “predicha” sobre ventas)',
    `INSERT INTO \`${DW}\`.fact_prediccion (
       tiempo_key, festival_key, puesto_key,
       pedidos_predichos, ingresos_predichos, confianza_pct, es_hora_pico)
     SELECT
       fv.tiempo_key,
       fv.festival_key,
       fv.puesto_key,
       COUNT(DISTINCT fv.pedido_id),
       SUM(fv.importe_linea),
       82.00,
       0
     FROM \`${DW}\`.fact_ventas fv
     GROUP BY fv.tiempo_key, fv.festival_key, fv.puesto_key`);

  await execStep(conn, 'marcar hora pico dentro de cada festival+tiempo_key',
    `UPDATE \`${DW}\`.fact_prediccion fp
     INNER JOIN (
       SELECT tiempo_key, festival_key, puesto_key,
         ROW_NUMBER() OVER (
           PARTITION BY festival_key, tiempo_key
           ORDER BY ingresos_predichos DESC, pedidos_predichos DESC, puesto_key
         ) AS rn
       FROM \`${DW}\`.fact_prediccion
     ) r ON fp.tiempo_key = r.tiempo_key
        AND fp.festival_key = r.festival_key
        AND (fp.puesto_key <=> r.puesto_key)
     SET fp.es_hora_pico = IF(r.rn = 1 AND fp.ingresos_predichos > 0, 1, 0)`);
}

async function main() {
  console.log(`Conectando ${connOpts.host}:${connOpts.port} | OLTP=${OLTP} → DW=${DW} | dryRun=${DRY}`);
  const conn = await mysql.createConnection(connOpts);
  try {
    await ensureSchema(conn);
    if (!DRY) await truncateFactsAndDims(conn);
    await migrate(conn);
    await finalizeClVyPrediccion(conn);
    console.log('Listo. El dashboard puede leer datos reales de queuefest_dw.');
  } catch (err) {
    console.error('[migración] Error:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
