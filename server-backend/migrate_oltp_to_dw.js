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
    festival_key       INT          NOT NULL PRIMARY KEY,
    festival_id_origen INT          NOT NULL,
    nombre             VARCHAR(255) NOT NULL,
    fecha_inicio       DATE         NOT NULL,
    fecha_fin          DATE         NOT NULL,
    localizacion       VARCHAR(100) DEFAULT NULL,
    duracion_dias      INT          NOT NULL DEFAULT 1,
    activo             TINYINT(1)   NOT NULL DEFAULT 1,
    foto_url           VARCHAR(500) DEFAULT NULL,
    modo_auto          TINYINT(1)   DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_puesto (
    puesto_key            INT          NOT NULL PRIMARY KEY,
    puesto_id_origen      INT          NOT NULL,
    festival_key          INT          NOT NULL,
    nombre                VARCHAR(255) NOT NULL,
    tipo                  VARCHAR(80)  NOT NULL,
    abierto               TINYINT(1)   NOT NULL DEFAULT 1,
    capacidad_max         INT          DEFAULT NULL,
    tiempo_servicio_medio INT          DEFAULT 2,
    num_empleados         INT          DEFAULT 1,
    pos_x                 DECIMAL(12,6) DEFAULT NULL,
    pos_y                 DECIMAL(12,6) DEFAULT NULL,
    foto_url              VARCHAR(500) DEFAULT NULL,
    KEY idx_dp_festival (festival_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_producto (
    producto_key        INT           NOT NULL PRIMARY KEY,
    producto_id_origen  INT           NOT NULL,
    puesto_key          INT           NOT NULL,
    nombre              VARCHAR(255)  NOT NULL,
    descripcion         TEXT          DEFAULT NULL,
    precio_base         DECIMAL(10,2) NOT NULL DEFAULT 0,
    coste_estimado      DECIMAL(10,2) DEFAULT 0,
    margen_estimado_pct DECIMAL(5,2)  DEFAULT 0,
    stock_actual        INT           DEFAULT 100,
    activo              TINYINT(1)    DEFAULT 1,
    foto_url            VARCHAR(500)  DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_usuario (
    usuario_key             INT          NOT NULL PRIMARY KEY,
    usuario_id_origen       INT          NOT NULL,
    nombre                  VARCHAR(100) NOT NULL,
    alias                   VARCHAR(50)  DEFAULT NULL,
    email                   VARCHAR(255) NOT NULL,
    rol                     VARCHAR(20)  NOT NULL,
    ciudad                  VARCHAR(100) DEFAULT NULL,
    telefono                VARCHAR(20)  DEFAULT NULL,
    fecha_nacimiento        DATE         DEFAULT NULL,
    fecha_registro          DATE         NOT NULL,
    idioma_preferido        VARCHAR(10)  DEFAULT 'es',
    preferencias_dieteticas TEXT         DEFAULT NULL,
    alergias                TEXT         DEFAULT NULL,
    acepta_marketing        TINYINT(1)   DEFAULT 0,
    notificaciones_push     TINYINT(1)   DEFAULT 1,
    notificaciones_email    TINYINT(1)   DEFAULT 0,
    nivel_loyalty           VARCHAR(30)  DEFAULT 'fan',
    segmento_clv            VARCHAR(30)  DEFAULT NULL,
    ultimo_acceso_en        TIMESTAMP    NULL DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS \`${DW}\`.dim_tiempo (
    tiempo_key       INT         NOT NULL PRIMARY KEY,
    fecha            DATE        NOT NULL,
    anio             INT         NOT NULL,
    trimestre        INT         NOT NULL,
    mes              INT         NOT NULL,
    dia              INT         NOT NULL,
    hora             INT         NOT NULL,
    dia_semana       VARCHAR(15) NOT NULL,
    franja_horaria   VARCHAR(20) NOT NULL,
    es_fin_de_semana TINYINT(1)  NOT NULL DEFAULT 0,
    semana_anio      INT         NOT NULL,
    nombre_mes       VARCHAR(20) NOT NULL
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
    promocion_key       INT           NOT NULL PRIMARY KEY,
    promocion_id_origen INT           NOT NULL,
    puesto_key          INT           NOT NULL,
    titulo              VARCHAR(255)  NOT NULL,
    descripcion         TEXT          DEFAULT NULL,
    precio_promo        DECIMAL(10,2) NOT NULL DEFAULT 0,
    activa              TINYINT(1)    DEFAULT 1,
    creado_en           TIMESTAMP     NULL DEFAULT NULL
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
    materia_prima_key       INT           NOT NULL PRIMARY KEY,
    materia_prima_id_origen INT           NOT NULL,
    nombre                  VARCHAR(120)  NOT NULL,
    unidad_medida           VARCHAR(10)   DEFAULT 'u',
    costo_unitario          DECIMAL(10,2) DEFAULT 0,
    activo                  TINYINT(1)    DEFAULT 1
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
       (6, 'cancelado', 'Cancelado', 0, 0, 0, 1)
     ON DUPLICATE KEY UPDATE
       estado_etiqueta=VALUES(estado_etiqueta), orden_flujo=VALUES(orden_flujo),
       es_activo=VALUES(es_activo), es_completado=VALUES(es_completado), es_cancelado=VALUES(es_cancelado)`);

  await execStep(conn, 'dim_tipo_alerta (stock)',
    `INSERT INTO \`${DW}\`.dim_tipo_alerta (tipo_alerta_key, codigo, categoria, severidad) VALUES
       (1, 'stock_bajo', 'stock', 'advertencia'),
       (2, 'agotado', 'stock', 'critica'),
       (3, 'saturacion', 'operaciones', 'advertencia')
     ON DUPLICATE KEY UPDATE
       categoria=VALUES(categoria), severidad=VALUES(severidad)`);

  await execStep(conn, 'dim_festival',
    `INSERT INTO \`${DW}\`.dim_festival (festival_key, festival_id_origen, nombre, fecha_inicio, fecha_fin, localizacion, duracion_dias, activo, foto_url)
     SELECT id, id, nombre, fecha_inicio, fecha_fin, localizacion,
            DATEDIFF(fecha_fin, fecha_inicio) + 1, activo, foto_url
     FROM \`${OLTP}\`.festivales
     ON DUPLICATE KEY UPDATE
       festival_id_origen=VALUES(festival_id_origen), nombre=VALUES(nombre),
       fecha_inicio=VALUES(fecha_inicio), fecha_fin=VALUES(fecha_fin),
       localizacion=VALUES(localizacion), duracion_dias=VALUES(duracion_dias),
       activo=VALUES(activo), foto_url=VALUES(foto_url)`);

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
         puesto_key, puesto_id_origen, festival_key, nombre, tipo, abierto,
         capacidad_max, tiempo_servicio_medio, num_empleados, pos_x, pos_y)
       SELECT
         p.id, p.id, p.festival_id, p.nombre, COALESCE(p.tipo, ''),
         IFNULL(CAST(p.abierto AS UNSIGNED), 1) & 1,
         CAST(p.capacidad_max AS UNSIGNED),
         COALESCE(p.tiempo_servicio_medio, 2),
         COALESCE(p.num_empleados, 1),
         ${posX}, ${posY}
       FROM \`${OLTP}\`.puestos p
       ON DUPLICATE KEY UPDATE
         puesto_id_origen=VALUES(puesto_id_origen), festival_key=VALUES(festival_key),
         nombre=VALUES(nombre), tipo=VALUES(tipo), abierto=VALUES(abierto),
         capacidad_max=VALUES(capacidad_max), tiempo_servicio_medio=VALUES(tiempo_servicio_medio),
         num_empleados=VALUES(num_empleados), pos_x=VALUES(pos_x), pos_y=VALUES(pos_y)`);
  }

  await execStep(conn, 'dim_producto',
    `INSERT INTO \`${DW}\`.dim_producto (producto_key, producto_id_origen, puesto_key, nombre, descripcion, precio_base, stock_actual, activo, foto_url)
     SELECT id, id, puesto_id, nombre, descripcion, precio, COALESCE(stock, 100), COALESCE(activo, 1), foto_url
     FROM \`${OLTP}\`.productos
     ON DUPLICATE KEY UPDATE
       producto_id_origen=VALUES(producto_id_origen), puesto_key=VALUES(puesto_key),
       nombre=VALUES(nombre), descripcion=VALUES(descripcion),
       precio_base=VALUES(precio_base), stock_actual=VALUES(stock_actual),
       activo=VALUES(activo), foto_url=VALUES(foto_url)`);

  await execStep(conn, 'dim_promociones',
    `INSERT INTO \`${DW}\`.dim_promocion (promocion_key, promocion_id_origen, puesto_key, titulo, descripcion, precio_promo, activa, creado_en)
     SELECT id, id, puesto_id, titulo, descripcion, precio_promo, COALESCE(activa, 1), creado_en
     FROM \`${OLTP}\`.promociones
     ON DUPLICATE KEY UPDATE
       promocion_id_origen=VALUES(promocion_id_origen), puesto_key=VALUES(puesto_key),
       titulo=VALUES(titulo), descripcion=VALUES(descripcion),
       precio_promo=VALUES(precio_promo), activa=VALUES(activa), creado_en=VALUES(creado_en)`);

  await execStep(conn, 'dim_materias',
    `INSERT INTO \`${DW}\`.dim_materia_prima (materia_prima_key, materia_prima_id_origen, nombre, unidad_medida, costo_unitario, activo)
     SELECT id, id, nombre, COALESCE(unidad_medida, 'kg'), COALESCE(costo_unitario, 0), COALESCE(activo, 1)
     FROM \`${OLTP}\`.materias_primas
     ON DUPLICATE KEY UPDATE
       materia_prima_id_origen=VALUES(materia_prima_id_origen), nombre=VALUES(nombre),
       unidad_medida=VALUES(unidad_medida), costo_unitario=VALUES(costo_unitario), activo=VALUES(activo)`);

  await execStep(conn, 'dim_usuario',
    `INSERT INTO \`${DW}\`.dim_usuario (
       usuario_key, usuario_id_origen, nombre, alias, email, rol,
       ciudad, telefono, fecha_nacimiento, fecha_registro, idioma_preferido,
       preferencias_dieteticas, alergias, acepta_marketing,
       notificaciones_push, notificaciones_email, nivel_loyalty, ultimo_acceso_en)
     SELECT
       u.id, u.id, u.nombre, u.alias, u.email,
       LOWER(COALESCE(r.nombre, 'usuario')) AS rol,
       u.ciudad, u.telefono, u.fecha_nacimiento,
       DATE(u.creado_en) AS fecha_registro,
       COALESCE(u.idioma_preferido, 'es'),
       u.preferencias_dieteticas, u.alergias,
       COALESCE(u.acepta_marketing, 0),
       COALESCE(u.notificaciones_push, 1),
       COALESCE(u.notificaciones_email, 0),
       COALESCE(l.nivel, 'fan'),
       u.ultimo_acceso_en
     FROM \`${OLTP}\`.usuarios u
     LEFT JOIN \`${OLTP}\`.roles r ON r.id = u.rol_id
     LEFT JOIN \`${OLTP}\`.loyalty l ON l.usuario_id = u.id
     ON DUPLICATE KEY UPDATE
       usuario_id_origen=VALUES(usuario_id_origen), nombre=VALUES(nombre),
       alias=VALUES(alias), email=VALUES(email), rol=VALUES(rol),
       ciudad=VALUES(ciudad), telefono=VALUES(telefono),
       fecha_nacimiento=VALUES(fecha_nacimiento), fecha_registro=VALUES(fecha_registro),
       idioma_preferido=VALUES(idioma_preferido), preferencias_dieteticas=VALUES(preferencias_dieteticas),
       alergias=VALUES(alergias), acepta_marketing=VALUES(acepta_marketing),
       notificaciones_push=VALUES(notificaciones_push), notificaciones_email=VALUES(notificaciones_email),
       nivel_loyalty=VALUES(nivel_loyalty), ultimo_acceso_en=VALUES(ultimo_acceso_en)`);

  await execStep(conn, 'dim_tiempo desde pedidos',
    `INSERT INTO \`${DW}\`.dim_tiempo (tiempo_key, fecha, anio, trimestre, mes, dia, hora, dia_semana, franja_horaria, es_fin_de_semana, semana_anio, nombre_mes)
     SELECT DISTINCT
       (YEAR(p.creado_en) * 1000000 + MONTH(p.creado_en) * 10000 + DAY(p.creado_en) * 100 + HOUR(p.creado_en)) AS tiempo_key,
       DATE(p.creado_en) AS fecha,
       YEAR(p.creado_en) AS anio,
       QUARTER(p.creado_en) AS trimestre,
       MONTH(p.creado_en) AS mes,
       DAY(p.creado_en) AS dia,
       HOUR(p.creado_en) AS hora,
       ELT(DAYOFWEEK(p.creado_en),'domingo','lunes','martes','miércoles','jueves','viernes','sábado') AS dia_semana,
       CASE
         WHEN HOUR(p.creado_en) BETWEEN 6  AND 11 THEN 'mañana'
         WHEN HOUR(p.creado_en) BETWEEN 12 AND 16 THEN 'mediodía'
         WHEN HOUR(p.creado_en) BETWEEN 17 AND 20 THEN 'tarde'
         ELSE 'noche'
       END AS franja_horaria,
       IF(DAYOFWEEK(p.creado_en) IN (1,7), 1, 0) AS es_fin_de_semana,
       YEARWEEK(p.creado_en, 3) AS semana_anio,
       ELT(MONTH(p.creado_en),'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre') AS nombre_mes
     FROM \`${OLTP}\`.pedidos p
     ON DUPLICATE KEY UPDATE
       fecha=VALUES(fecha), anio=VALUES(anio), trimestre=VALUES(trimestre),
       mes=VALUES(mes), dia=VALUES(dia), hora=VALUES(hora),
       dia_semana=VALUES(dia_semana), franja_horaria=VALUES(franja_horaria),
       es_fin_de_semana=VALUES(es_fin_de_semana), semana_anio=VALUES(semana_anio),
       nombre_mes=VALUES(nombre_mes)`);

  if (await tableExists(conn, OLTP, 'producto_materias_primas')) {
    await execStep(conn, 'bridge_producto_materia',
      `INSERT INTO \`${DW}\`.bridge_producto_materia (producto_key, materia_prima_key, cantidad_por_unidad)
       SELECT producto_id, materia_prima_id, cantidad_por_unidad
       FROM \`${OLTP}\`.producto_materias_primas
       ON DUPLICATE KEY UPDATE cantidad_por_unidad=VALUES(cantidad_por_unidad)`);
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
       tiempo_key, festival_key, puesto_key, usuario_key, producto_key,
       estado_pedido_key, metodo_pago_key, promocion_key,
       pedido_id, pedido_item_id, cantidad, precio_unitario,
       importe_linea, descuento_linea, total_pedido,
       coste_linea, margen_linea)
     SELECT
       (YEAR(p.creado_en) * 1000000 + MONTH(p.creado_en) * 10000
         + DAY(p.creado_en) * 100 + HOUR(p.creado_en)) AS tiempo_key,
       pu.festival_id AS festival_key,
       pu.id AS puesto_key,
       p.usuario_id AS usuario_key,
       pi.producto_id AS producto_key,
       CASE LOWER(TRIM(COALESCE(p.estado,'')))
            WHEN 'pendiente' THEN 1 WHEN 'confirmado' THEN 2 WHEN 'preparando' THEN 3
            WHEN 'listo' THEN 4 WHEN 'entregado' THEN 5 WHEN 'cancelado' THEN 6 ELSE 3 END AS estado_pedido_key,
       ${paymentExpr},
       pi.promocion_id AS promocion_key,
       p.id AS pedido_id,
       COALESCE(${piIdExpr}, 0) AS pedido_item_id,
       pi.cantidad,
       COALESCE(pi.precio_unitario, 0) AS precio_unitario,
       ROUND(COALESCE(pi.importe_total, pi.cantidad * COALESCE(pi.precio_unitario, 0)), 2) AS importe_linea,
       0 AS descuento_linea,
       COALESCE(p.total, ROUND(pi.cantidad * COALESCE(pi.precio_unitario, 0), 2), 0) AS total_pedido,
       ROUND(GREATEST(0, COALESCE(pi.importe_total, pi.cantidad * COALESCE(pi.precio_unitario, 0)) * 0.38), 2) AS coste_linea,
       ROUND(GREATEST(0, COALESCE(pi.importe_total, pi.cantidad * COALESCE(pi.precio_unitario, 0))
         - GREATEST(0, COALESCE(pi.importe_total, pi.cantidad * COALESCE(pi.precio_unitario, 0)) * 0.38)), 2) AS margen_linea
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
       ROUND(agg.cnt_pedidos_hora * 18, 0) AS ocupacion_actual,
       LEAST(100,
         ROUND(100 * agg.cnt_pedidos_hora / NULLIF(COALESCE(pu.capacidad_max, agg.cnt_pedidos_hora, 50), 0), 2)
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
         YEAR(ped.creado_en) * 1000000 + MONTH(ped.creado_en) * 10000
           + DAY(ped.creado_en) * 100 + HOUR(ped.creado_en)
     ) AS agg
     JOIN \`${OLTP}\`.puestos pu ON pu.id = agg.puesto_id
     ON DUPLICATE KEY UPDATE
       festival_key=VALUES(festival_key),
       espera_estimada_min=VALUES(espera_estimada_min),
       ocupacion_actual=VALUES(ocupacion_actual),
       ratio_ocupacion_pct=VALUES(ratio_ocupacion_pct),
       estado_puesto=VALUES(estado_puesto)`);

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
          tiempo_key, festival_key, materia_prima_key, stock_actual, stock_minimo, consumo_hora,
          horas_hasta_rotura, tiene_alerta, esta_agotado)
        SELECT
          (YEAR(NOW()) * 1000000 + MONTH(NOW()) * 10000 + DAY(NOW()) * 100 + HOUR(NOW())) AS tiempo_key,
          pu.festival_id AS festival_key,
          sp.materia_prima_id,
          SUM(sp.stock_actual) AS stock_actual,
          COALESCE(MAX(sp.stock_minimo), 0) AS stock_minimo,
          ROUND(COALESCE(MAX(cons.consumido_14d) / 336.0, 0), 2) AS consumo_hora,
          ROUND(
            CASE WHEN COALESCE(MAX(cons.consumido_14d), 0) > 0.0001
                 THEN SUM(sp.stock_actual) / NULLIF((MAX(cons.consumido_14d) / 336.0), 0)
                 ELSE NULL END
          , 1) AS horas_hasta_rotura,
          CASE WHEN SUM(sp.stock_actual) <= COALESCE(MAX(sp.stock_minimo), 0) THEN 1 ELSE 0 END,
          CASE WHEN SUM(sp.stock_actual) <= 0 THEN 1 ELSE 0 END
        FROM \`${OLTP}\`.stock_puesto sp
        JOIN \`${OLTP}\`.puestos pu ON pu.id = sp.puesto_id
        LEFT JOIN (
          SELECT ms.materia_prima_id, SUM(ms.cantidad) AS consumido_14d
          FROM \`${OLTP}\`.movimientos_stock ms
          WHERE ms.tipo IN ('venta','merma') AND ms.creado_en >= NOW() - INTERVAL 14 DAY
          GROUP BY ms.materia_prima_id
        ) AS cons ON cons.materia_prima_id = sp.materia_prima_id
        GROUP BY pu.festival_id, sp.materia_prima_id
        ON DUPLICATE KEY UPDATE
          stock_actual=VALUES(stock_actual), stock_minimo=VALUES(stock_minimo),
          consumo_hora=VALUES(consumo_hora), horas_hasta_rotura=VALUES(horas_hasta_rotura),
          tiene_alerta=VALUES(tiene_alerta), esta_agotado=VALUES(esta_agotado)`);
    } else {
      await execStep(conn, 'fact_inventario desde stock_puesto (sin movimientos_stock)',
        `INSERT INTO \`${DW}\`.fact_inventario (
          tiempo_key, festival_key, materia_prima_key, stock_actual, stock_minimo, consumo_hora,
          horas_hasta_rotura, tiene_alerta, esta_agotado)
        SELECT
          (YEAR(NOW()) * 1000000 + MONTH(NOW()) * 10000 + DAY(NOW()) * 100 + HOUR(NOW())) AS tiempo_key,
          pu.festival_id AS festival_key,
          sp.materia_prima_id,
          SUM(sp.stock_actual) AS stock_actual,
          COALESCE(MAX(sp.stock_minimo), 0) AS stock_minimo,
          0, NULL,
          CASE WHEN SUM(sp.stock_actual) <= COALESCE(MAX(sp.stock_minimo), 0) THEN 1 ELSE 0 END,
          CASE WHEN SUM(sp.stock_actual) <= 0 THEN 1 ELSE 0 END
        FROM \`${OLTP}\`.stock_puesto sp
        JOIN \`${OLTP}\`.puestos pu ON pu.id = sp.puesto_id
        GROUP BY pu.festival_id, sp.materia_prima_id
        ON DUPLICATE KEY UPDATE
          stock_actual=VALUES(stock_actual), stock_minimo=VALUES(stock_minimo),
          tiene_alerta=VALUES(tiene_alerta), esta_agotado=VALUES(esta_agotado)`);
    }
  } else {
    console.log('[!] OLTP sin stock_puesto — fact_inventario desde materias_primas sólo.');
    await execStep(conn, 'fact_inventario desde materias_primas (solo festival por defecto 1)',
      `INSERT INTO \`${DW}\`.fact_inventario (
        tiempo_key, festival_key, materia_prima_key, stock_actual, stock_minimo, consumo_hora,
        horas_hasta_rotura, tiene_alerta, esta_agotado)
      SELECT DISTINCT
        (YEAR(NOW()) * 1000000 + MONTH(NOW()) * 10000 + DAY(NOW()) * 100 + HOUR(NOW())) AS tiempo_key,
        1 AS festival_key,
        mp.id AS materia_prima_key,
        COALESCE(mp.stock_actual, 0) AS stock_actual,
        COALESCE(mp.stock_minimo, 0) AS stock_minimo,
        0, NULL,
        CASE WHEN COALESCE(mp.stock_actual, 0) <= COALESCE(mp.stock_minimo, 0) THEN 1 ELSE 0 END,
        CASE WHEN COALESCE(mp.stock_actual, 0) <= 0 THEN 1 ELSE 0 END
      FROM \`${OLTP}\`.materias_primas mp
      ON DUPLICATE KEY UPDATE
        stock_actual=VALUES(stock_actual), stock_minimo=VALUES(stock_minimo),
        tiene_alerta=VALUES(tiene_alerta), esta_agotado=VALUES(esta_agotado)`);
  }

  if (await tableExists(conn, OLTP, 'loyalty_movimientos')) {
    await execStep(conn, 'fact_loyalty (movimientos por fila)',
      `INSERT INTO \`${DW}\`.fact_loyalty (
         tiempo_key, festival_key, puesto_key, usuario_key,
         movimiento_id_origen, pedido_id, tipo_movimiento, origen,
         puntos, puntos_ganados, puntos_canjeados, saldo_resultante, estado)
       SELECT
         (YEAR(lm.creado_en) * 1000000 + MONTH(lm.creado_en) * 10000 + DAY(lm.creado_en) * 100 + HOUR(lm.creado_en)) AS tiempo_key,
         COALESCE(pu.festival_id, 1) AS festival_key,
         pu.id AS puesto_key,
         l.usuario_id,
         lm.id AS movimiento_id_origen,
         lm.pedido_id,
         lm.tipo AS tipo_movimiento,
         lm.origen,
         lm.puntos,
         GREATEST(0, lm.puntos) AS puntos_ganados,
         CASE WHEN lm.puntos < 0 THEN ABS(lm.puntos) ELSE 0 END AS puntos_canjeados,
         lm.saldo_resultante,
         COALESCE(lm.estado, 'confirmado')
       FROM \`${OLTP}\`.loyalty_movimientos lm
       JOIN \`${OLTP}\`.loyalty l ON l.id = lm.loyalty_id
       LEFT JOIN \`${OLTP}\`.pedidos ped ON ped.id = lm.pedido_id
       LEFT JOIN \`${OLTP}\`.puestos pu  ON pu.id  = ped.puesto_id`);
  }
}

async function finalizeClVyPrediccion(conn) {
  await execStep(conn, 'fact_clv (métricas por usuario desde fact_ventas)',
    `INSERT INTO \`${DW}\`.fact_clv (
       usuario_key, festival_key, gasto_total, segmento,
       num_pedidos, ticket_medio, frecuencia_compra_semanal,
       clv_estimado, dias_como_cliente, dias_desde_ultima_compra)
     SELECT
       fv.usuario_key,
       NULL AS festival_key,
       ROUND(SUM(fv.importe_linea), 2) AS gasto_total,
       CASE
         WHEN du.nivel_loyalty IN ('backstage','headliner','vip','VIP','Backstage') THEN 'VIP'
         WHEN TIMESTAMPDIFF(DAY, COALESCE(du.ultimo_acceso_en, '1970-01-01'), NOW()) > 35 THEN 'inactivo'
         ELSE COALESCE(NULLIF(TRIM(du.nivel_loyalty), ''), 'activo')
       END AS segmento,
       COUNT(DISTINCT fv.pedido_id) AS num_pedidos,
       ROUND(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.pedido_id), 0), 2) AS ticket_medio,
       ROUND(
        COUNT(DISTINCT fv.pedido_id)
        / NULLIF(GREATEST(1 + TIMESTAMPDIFF(WEEK,
            (SELECT MIN(dt.fecha) FROM \`${DW}\`.fact_ventas f2
               JOIN \`${DW}\`.dim_tiempo dt ON dt.tiempo_key = f2.tiempo_key
             WHERE f2.usuario_key = fv.usuario_key),
            CURDATE()), 1), 0)
       , 2) AS frecuencia_compra_semanal,
       ROUND(SUM(fv.importe_linea) * 1.5, 2) AS clv_estimado,
       GREATEST(0, TIMESTAMPDIFF(DAY, du.fecha_registro, CURDATE())) AS dias_como_cliente,
       GREATEST(0, TIMESTAMPDIFF(DAY, COALESCE(du.ultimo_acceso_en, du.fecha_registro), CURDATE())) AS dias_desde_ultima_compra
     FROM \`${DW}\`.fact_ventas fv
     JOIN \`${DW}\`.dim_usuario du ON du.usuario_key = fv.usuario_key
     GROUP BY fv.usuario_key, du.nivel_loyalty, du.ultimo_acceso_en, du.fecha_registro
     ON DUPLICATE KEY UPDATE
       gasto_total=VALUES(gasto_total), segmento=VALUES(segmento),
       num_pedidos=VALUES(num_pedidos), ticket_medio=VALUES(ticket_medio),
       frecuencia_compra_semanal=VALUES(frecuencia_compra_semanal),
       clv_estimado=VALUES(clv_estimado),
       dias_como_cliente=VALUES(dias_como_cliente),
       dias_desde_ultima_compra=VALUES(dias_desde_ultima_compra)`);

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
