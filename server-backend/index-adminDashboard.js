/**
 * index-adminDashboard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Servidor Express para el Dashboard de Administración.
 * Base de datos: queuefest_dw  |  Puerto Express: 3001
 * TCP forward local: 127.0.0.1:12346  →  MySQL 10.0.0.5:3306
 *
 * Schema real queuefest_dw:
 *   Dimensiones : dim_festival, dim_puesto, dim_producto, dim_usuario,
 *                 dim_tiempo, dim_metodo_pago, dim_promocion, dim_tipo_alerta,
 *                 dim_materia_prima, dim_estado_pedido
 *   Hechos      : fact_ventas, fact_operaciones, fact_alertas, fact_inventario,
 *                 fact_loyalty, fact_clv, fact_prediccion
 *   Puentes     : bridge_producto_materia
 *
 * Arrancar: node index-adminDashboard.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express    = require('express');
const mysql2     = require('mysql2/promise');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const fs         = require('fs');
const net        = require('net');
const { Client } = require('ssh2');
require('dotenv').config();

// ─── Configuración ─────────────────────────────────────────────────────────

const PORT       = process.env.DW_PORT || 3001;
const LOCAL_PORT = 12346;          // distinto al 12345 del main
const SSH_HOST   = '143.47.35.13';
const SSH_USER   = 'ubuntu';
const MYSQL_HOST = '10.0.0.5';
const MYSQL_PORT = 3306;
const MYSQL_USER = 'admin';
const MYSQL_PASS = 'Proyecto_Seguro2026!';
const MYSQL_DB   = 'queuefest_dw';
const JWT_SECRET = 'queuefest_secret_2026';

// ─── App ────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

let db;

// ─── Auth middleware ─────────────────────────────────────────────────────────

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ─── Helper: filtros de período, festival y tipo de puesto ─────────────────
/**
 * Construye cláusula WHERE con los filtros globales del dashboard.
 * Alias esperados en la query:
 *   fv  → fact_ventas
 *   dt  → dim_tiempo   (JOIN requerido si periodo != 'todo')
 *   dp  → dim_puesto   (JOIN requerido si tipo_puesto está presente)
 */
function buildFilters(query, { alias = 'fv', tiempoAlias = 'dt', puestoAlias = 'dp' } = {}) {
  const clauses = [];
  const params  = [];

  const periodo = query.periodo || 'hoy';
  if (periodo === 'hoy') {
    clauses.push(`${tiempoAlias}.fecha = CURDATE()`);
  } else if (periodo === 'sem') {
    clauses.push(`${tiempoAlias}.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`);
  } else if (periodo === 'mes') {
    clauses.push(`${tiempoAlias}.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
  }
  // 'todo' → sin filtro de fecha

  if (query.festival_id) {
    clauses.push(`${alias}.festival_key = ?`);
    params.push(Number(query.festival_id));
  }

  if (query.tipo_puesto) {
    clauses.push(`${puestoAlias}.tipo = ?`);
    params.push(query.tipo_puesto);
  }

  const clause = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  return { clause, params };
}

// ─── DEBUG ──────────────────────────────────────────────────────────────────

app.get('/debug/db-info', async (req, res) => {
  try {
    const [dbRow]   = await db.query('SELECT DATABASE() AS db');
    const [hostRow] = await db.query('SELECT @@hostname AS host, @@port AS port');
    res.json({
      database: dbRow[0]?.db,
      host: hostRow[0]?.host,
      port: hostRow[0]?.port,
      message: 'Conexión a queuefest_dw correcta ✓',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  FESTIVALES  — selector del filtro global del dashboard
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/festivales', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT festival_key AS id, nombre, activo
      FROM dim_festival
      ORDER BY nombre
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 1 — RESUMEN GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/resumen', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);

    const [[row]] = await db.query(`
      SELECT
        COALESCE(SUM(fv.importe_linea), 0)                                                AS ingresos_total,
        COUNT(DISTINCT fv.pedido_id)                                                      AS pedidos_total,
        COALESCE(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.pedido_id), 0), 0)     AS ticket_medio,
        COUNT(DISTINCT fv.usuario_key)                                                    AS usuarios_activos,
        COALESCE(AVG(fo.espera_estimada_min), 0)                                          AS espera_media_min,
        COALESCE(SUM(dep.es_completado) * 100.0 / NULLIF(COUNT(*), 0), 0)                AS ratio_completados_pct,
        COALESCE(SUM(dep.es_cancelado)  * 100.0 / NULLIF(COUNT(*), 0), 0)                AS ratio_cancelados_pct,
        COUNT(DISTINCT CASE WHEN dp.tipo = 'barra'     AND dp.abierto = 1 THEN dp.puesto_key END) AS barras_activas,
        COUNT(DISTINCT CASE WHEN dp.tipo = 'foodtruck' AND dp.abierto = 1 THEN dp.puesto_key END) AS foodtrucks_activos
      FROM fact_ventas fv
      JOIN dim_tiempo        dt  ON dt.tiempo_key       = fv.tiempo_key
      JOIN dim_puesto        dp  ON dp.puesto_key       = fv.puesto_key
      JOIN dim_estado_pedido dep ON dep.estado_pedido_key = fv.estado_pedido_key
      LEFT JOIN fact_operaciones fo ON fo.puesto_key = fv.puesto_key AND fo.tiempo_key = fv.tiempo_key
      ${clause}
    `, params);

    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/ingresos-por-puesto', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);
    const [rows] = await db.query(`
      SELECT dp.nombre AS puesto_nombre, dp.tipo,
             COALESCE(SUM(fv.importe_linea), 0) AS ingresos
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      ${clause}
      GROUP BY dp.puesto_key, dp.nombre, dp.tipo
      ORDER BY ingresos DESC
      LIMIT 20
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/pedidos-por-tipo', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);
    const [rows] = await db.query(`
      SELECT dp.tipo,
             COUNT(DISTINCT fv.pedido_id)                                            AS total_pedidos,
             COUNT(DISTINCT fv.pedido_id) * 100.0
               / NULLIF((SELECT COUNT(DISTINCT fv2.pedido_id)
                         FROM fact_ventas fv2
                         JOIN dim_tiempo dt2 ON dt2.tiempo_key = fv2.tiempo_key
                         JOIN dim_puesto dp2 ON dp2.puesto_key = fv2.puesto_key
                         ${clause}), 0)                                              AS pct
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      ${clause}
      GROUP BY dp.tipo
    `, [...params, ...params]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 2 — INGRESOS Y ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/ingresos-actividad', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);

    const [[kpis]] = await db.query(`
      SELECT
        COALESCE(SUM(fv.importe_linea), 0)                                               AS ingresos_total,
        COUNT(DISTINCT fv.pedido_id)                                                     AS pedidos_total,
        COALESCE(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.pedido_id), 0), 0)    AS ticket_medio,
        COUNT(DISTINCT fv.usuario_key) * 100.0
          / NULLIF((SELECT COUNT(*) FROM dim_usuario WHERE rol = 'usuario'), 0)          AS ratio_conversion_pct
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      ${clause}
    `, params);

    const [por_hora] = await db.query(`
      SELECT dt.hora,
             COALESCE(SUM(fv.importe_linea), 0)                                          AS ingresos,
             COUNT(DISTINCT fv.pedido_id)                                                AS pedidos,
             COALESCE(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.pedido_id), 0), 0) AS ticket_medio
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      ${clause}
      GROUP BY dt.hora
      ORDER BY dt.hora
    `, params);

    const [metodos_pago] = await db.query(`
      SELECT dmp.codigo AS metodo, dmp.nombre,
             COALESCE(SUM(fv.importe_linea), 0)                                          AS total,
             COALESCE(SUM(fv.importe_linea) * 100.0
               / NULLIF((SELECT SUM(fv2.importe_linea)
                         FROM fact_ventas fv2
                         JOIN dim_tiempo dt2 ON dt2.tiempo_key = fv2.tiempo_key
                         JOIN dim_puesto dp2 ON dp2.puesto_key = fv2.puesto_key
                         ${clause}), 0), 0)                                              AS pct
      FROM fact_ventas fv
      JOIN dim_tiempo    dt  ON dt.tiempo_key         = fv.tiempo_key
      JOIN dim_puesto    dp  ON dp.puesto_key         = fv.puesto_key
      JOIN dim_metodo_pago dmp ON dmp.metodo_pago_key = fv.metodo_pago_key
      ${clause}
      GROUP BY dmp.metodo_pago_key, dmp.codigo, dmp.nombre
      ORDER BY total DESC
    `, [...params, ...params]);

    res.json({ kpis, por_hora, metodos_pago });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 3 — RENDIMIENTO POR PUESTO
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/puestos/kpis', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);
    const [[row]] = await db.query(`
      SELECT
        COUNT(DISTINCT fv.puesto_key)                                                    AS puestos_activos,
        COALESCE(AVG(fo.espera_estimada_min), 0)                                         AS espera_media_min,
        COALESCE(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.puesto_key), 0), 0)   AS ingreso_medio_puesto,
        SUM(CASE WHEN fo.estado_puesto = 'saturado' THEN 1 ELSE 0 END)                  AS saturados
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      LEFT JOIN fact_operaciones fo ON fo.puesto_key = fv.puesto_key AND fo.tiempo_key = fv.tiempo_key
      ${clause}
    `, params);
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/puestos/tabla', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);
    const sortBy = ['ingresos', 'pedidos', 'espera_min'].includes(req.query.sort_by)
      ? req.query.sort_by : 'ingresos';

    const [rows] = await db.query(`
      SELECT dp.puesto_key   AS puesto_id,
             dp.nombre,
             dp.tipo,
             dp.capacidad_max,
             COALESCE(SUM(fv.importe_linea), 0)                                          AS ingresos,
             COUNT(DISTINCT fv.pedido_id)                                                AS pedidos,
             COALESCE(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.pedido_id), 0), 0) AS ticket_medio,
             COALESCE(MAX(fo.espera_estimada_min), 0)                                    AS espera_min,
             COALESCE(MAX(fo.ocupacion_actual), 0)                                       AS ocupacion_actual,
             COALESCE(MAX(fo.ratio_ocupacion_pct), 0)                                    AS ratio_ocupacion_pct,
             COALESCE(MAX(fo.estado_puesto), 'normal')                                   AS estado
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      LEFT JOIN fact_operaciones fo ON fo.puesto_key = fv.puesto_key AND fo.tiempo_key = fv.tiempo_key
      ${clause}
      GROUP BY dp.puesto_key, dp.nombre, dp.tipo, dp.capacidad_max
      ORDER BY ${sortBy} DESC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/puestos/espera', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);
    const [rows] = await db.query(`
      SELECT dp.nombre, dp.tipo,
             COALESCE(AVG(fo.espera_estimada_min), 0) AS espera_min
      FROM fact_operaciones fo
      JOIN dim_tiempo dt ON dt.tiempo_key = fo.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fo.puesto_key
      LEFT JOIN fact_ventas fv ON fv.puesto_key = fo.puesto_key AND fv.tiempo_key = fo.tiempo_key
      ${clause.replace('fv.festival_key', 'fo.festival_key').replace('dp.tipo', 'dp.tipo')}
      GROUP BY dp.puesto_key, dp.nombre, dp.tipo
      ORDER BY espera_min DESC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 4 — PRODUCTOS Y RENTABILIDAD
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/productos', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);

    const [[kpis]] = await db.query(`
      SELECT
        COALESCE(SUM(fv.importe_linea), 0)                                               AS ingresos_total,
        COALESCE(SUM(fv.coste_linea), 0)                                                 AS coste_total,
        COALESCE(SUM(fv.margen_linea), 0)                                                AS margen_total,
        COALESCE(SUM(fv.margen_linea) * 100.0 / NULLIF(SUM(fv.importe_linea), 0), 0)    AS margen_pct,
        (SELECT dp2.nombre FROM fact_ventas fv2
           JOIN dim_tiempo dt2 ON dt2.tiempo_key = fv2.tiempo_key
           JOIN dim_puesto dpu2 ON dpu2.puesto_key = fv2.puesto_key
           JOIN dim_producto dp2 ON dp2.producto_key = fv2.producto_key
           ${clause.replace('fv.', 'fv2.').replace('dt.', 'dt2.').replace('dp.', 'dpu2.')}
           GROUP BY fv2.producto_key, dp2.nombre
           ORDER BY SUM(fv2.importe_linea) DESC LIMIT 1)                                 AS mejor_producto
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      ${clause}
    `, [...params, ...params]);

    const [lista] = await db.query(`
      SELECT dprod.nombre,
             COALESCE(SUM(fv.cantidad), 0)                                               AS unidades_vendidas,
             COALESCE(SUM(fv.importe_linea), 0)                                          AS ingresos,
             COALESCE(SUM(fv.coste_linea), 0)                                            AS coste,
             COALESCE(SUM(fv.margen_linea), 0)                                           AS margen,
             COALESCE(SUM(fv.margen_linea) * 100.0 / NULLIF(SUM(fv.importe_linea), 0), 0) AS margen_pct
      FROM fact_ventas fv
      JOIN dim_tiempo   dt    ON dt.tiempo_key    = fv.tiempo_key
      JOIN dim_puesto   dp    ON dp.puesto_key    = fv.puesto_key
      JOIN dim_producto dprod ON dprod.producto_key = fv.producto_key
      ${clause}
      GROUP BY fv.producto_key, dprod.nombre
      ORDER BY ingresos DESC
      LIMIT 30
    `, params);

    res.json({ kpis, lista });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 5 — STOCK Y OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/stock', auth, async (req, res) => {
  try {
    // fact_inventario no tiene puesto_key, solo festival_key
    const festivalFilter = req.query.festival_id ? 'WHERE fi.festival_key = ?' : '';
    const festivalParams = req.query.festival_id ? [Number(req.query.festival_id)] : [];

    const [[kpis]] = await db.query(`
      SELECT
        SUM(CASE WHEN fi.horas_hasta_rotura IS NOT NULL AND fi.horas_hasta_rotura < 3 THEN 1 ELSE 0 END) AS alertas_criticas,
        SUM(CASE WHEN fi.horas_hasta_rotura BETWEEN 3 AND 8                           THEN 1 ELSE 0 END) AS alertas_bajas,
        SUM(CASE WHEN fi.horas_hasta_rotura > 8 OR fi.horas_hasta_rotura IS NULL      THEN 1 ELSE 0 END) AS sin_alerta,
        SUM(fi.esta_agotado)                                                                              AS productos_bloqueados
      FROM fact_inventario fi
      ${festivalFilter}
    `, festivalParams);

    const [materias] = await db.query(`
      SELECT dmp.nombre,
             dmp.unidad_medida,
             fi.stock_actual,
             dmp.stock_minimo,
             fi.consumo_hora,
             fi.horas_hasta_rotura,
             fi.tiene_alerta,
             fi.esta_agotado
      FROM fact_inventario fi
      JOIN dim_materia_prima dmp ON dmp.materia_prima_key = fi.materia_prima_key
      ${festivalFilter}
      ORDER BY fi.horas_hasta_rotura ASC, dmp.nombre
      LIMIT 50
    `, festivalParams);

    res.json({ kpis, materias });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 9 — ALERTAS
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/alertas', auth, async (req, res) => {
  try {
    const festivalFilter = req.query.festival_id ? 'AND fa.festival_key = ?' : '';
    const festivalParams = req.query.festival_id ? [Number(req.query.festival_id)] : [];

    const [[kpis]] = await db.query(`
      SELECT
        SUM(CASE WHEN dta.severidad = 'critica'     AND fa.resuelta = 0 THEN 1 ELSE 0 END) AS criticas,
        SUM(CASE WHEN dta.severidad = 'advertencia' AND fa.resuelta = 0 THEN 1 ELSE 0 END) AS advertencias,
        SUM(CASE WHEN dta.categoria = 'operaciones' AND fa.resuelta = 0 THEN 1 ELSE 0 END) AS saturados,
        SUM(CASE WHEN dta.categoria = 'stock'       AND fa.resuelta = 0 THEN 1 ELSE 0 END) AS stock_bajo
      FROM fact_alertas fa
      JOIN dim_tipo_alerta dta ON dta.tipo_alerta_key = fa.tipo_alerta_key
      WHERE 1=1 ${festivalFilter}
    `, festivalParams);

    const [lista] = await db.query(`
      SELECT fa.id,
             dta.codigo      AS tipo_codigo,
             dta.categoria,
             dta.severidad,
             dp.nombre       AS puesto_nombre,
             dprod.nombre    AS producto_nombre,
             fa.mensaje,
             fa.valor_actual,
             fa.umbral,
             fa.resuelta,
             fa.tiempo_resolucion_min,
             TIMESTAMP(dt.fecha, SEC_TO_TIME(dt.hora * 3600)) AS creado_en
      FROM fact_alertas fa
      JOIN dim_tipo_alerta dta ON dta.tipo_alerta_key = fa.tipo_alerta_key
      JOIN dim_tiempo      dt  ON dt.tiempo_key        = fa.tiempo_key
      LEFT JOIN dim_puesto   dp   ON dp.puesto_key      = fa.puesto_key
      LEFT JOIN dim_producto dprod ON dprod.producto_key = fa.producto_key
      WHERE fa.resuelta = 0 ${festivalFilter}
      ORDER BY dta.severidad DESC, dt.fecha DESC, dt.hora DESC
      LIMIT 50
    `, festivalParams);

    res.json({ kpis, alertas: lista });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/alertas/count', auth, async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT COUNT(*) AS total_sin_resolver FROM fact_alertas WHERE resuelta = 0'
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/alertas/:id/resolver', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE fact_alertas SET resuelta = 1, tiempo_resolucion_min = 0 WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Alerta resuelta' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alertas/resolver-todas', auth, async (req, res) => {
  try {
    const { categoria } = req.query;
    if (categoria) {
      await db.query(`
        UPDATE fact_alertas fa
        JOIN dim_tipo_alerta dta ON dta.tipo_alerta_key = fa.tipo_alerta_key
        SET fa.resuelta = 1
        WHERE fa.resuelta = 0 AND dta.categoria = ?
      `, [categoria]);
    } else {
      await db.query(
        'UPDATE fact_alertas SET resuelta = 1 WHERE resuelta = 0'
      );
    }
    res.json({ message: 'Alertas marcadas como resueltas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 6 — USUARIOS Y COMPORTAMIENTO
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/usuarios', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);

    const [[kpis]] = await db.query(`
      SELECT
        COUNT(DISTINCT fv.usuario_key)                                                   AS activos,
        SUM(CASE WHEN du.fecha_registro >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              THEN 1 ELSE 0 END)                                                         AS nuevos,
        COALESCE(SUM(fv.importe_linea) / NULLIF(COUNT(DISTINCT fv.usuario_key), 0), 0)  AS gasto_medio,
        NULL                                                                              AS frecuencia_semanal,
        SUM(CASE WHEN du.ultimo_acceso_en < DATE_SUB(NOW(), INTERVAL 30 DAY)
              THEN 1 ELSE 0 END)                                                         AS inactivos,
        NULL                                                                              AS recurrentes,
        NULL                                                                              AS nuevos_pct_crec
      FROM fact_ventas fv
      JOIN dim_tiempo  dt ON dt.tiempo_key  = fv.tiempo_key
      JOIN dim_puesto  dp ON dp.puesto_key  = fv.puesto_key
      JOIN dim_usuario du ON du.usuario_key = fv.usuario_key
      ${clause}
    `, params);

    const [evolucion_semanal] = await db.query(`
      SELECT dt.semana_anio AS semana,
             COUNT(DISTINCT fv.usuario_key)                                              AS activos,
             SUM(CASE WHEN du.fecha_registro >= DATE_SUB(dt.fecha, INTERVAL 7 DAY)
                   THEN 1 ELSE 0 END)                                                    AS nuevos
      FROM fact_ventas fv
      JOIN dim_tiempo  dt ON dt.tiempo_key  = fv.tiempo_key
      JOIN dim_puesto  dp ON dp.puesto_key  = fv.puesto_key
      JOIN dim_usuario du ON du.usuario_key = fv.usuario_key
      ${clause}
      GROUP BY dt.semana_anio
      ORDER BY dt.semana_anio
    `, params);

    const [top_usuarios] = await db.query(`
      SELECT du.nombre, du.alias,
             COUNT(DISTINCT fv.pedido_id)             AS pedidos,
             COALESCE(SUM(fv.importe_linea), 0)       AS gasto_total
      FROM fact_ventas fv
      JOIN dim_tiempo  dt ON dt.tiempo_key  = fv.tiempo_key
      JOIN dim_puesto  dp ON dp.puesto_key  = fv.puesto_key
      JOIN dim_usuario du ON du.usuario_key = fv.usuario_key
      ${clause}
      GROUP BY fv.usuario_key, du.nombre, du.alias
      ORDER BY gasto_total DESC
      LIMIT 10
    `, params);

    res.json({ kpis, evolucion_semanal, top_usuarios });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 7 — LOYALTY
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/loyalty', auth, async (req, res) => {
  try {
    // fact_loyalty tiene festival_key directamente
    const festivalFilter = req.query.festival_id ? 'AND fl.festival_key = ?' : '';
    const festivalParams = req.query.festival_id ? [Number(req.query.festival_id)] : [];

    const [[kpis]] = await db.query(`
      SELECT
        COALESCE(SUM(fl.puntos_ganados), 0)                                              AS puntos_generados,
        COALESCE(SUM(fl.puntos_canjeados), 0)                                            AS puntos_canjeados,
        COALESCE(SUM(fl.puntos_canjeados) * 100.0
          / NULLIF(SUM(fl.puntos_ganados), 0), 0)                                        AS ratio_uso_pct,
        NULL                                                                              AS pct_pedidos_con_puntos
      FROM fact_loyalty fl
      WHERE 1=1 ${festivalFilter}
    `, festivalParams);

    const [por_festival] = await db.query(`
      SELECT df.nombre AS festival_nombre,
             COALESCE(SUM(fl.puntos_ganados), 0)   AS generados,
             COALESCE(SUM(fl.puntos_canjeados), 0) AS canjeados
      FROM fact_loyalty fl
      JOIN dim_festival df ON df.festival_key = fl.festival_key
      GROUP BY fl.festival_key, df.nombre
      ORDER BY generados DESC
    `);

    const [niveles] = await db.query(`
      SELECT du.nivel_loyalty                                   AS nivel,
             COUNT(*)                                           AS count,
             COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM dim_usuario), 0) AS pct
      FROM dim_usuario du
      GROUP BY du.nivel_loyalty
      ORDER BY count DESC
    `);

    const [top_usuarios] = await db.query(`
      SELECT du.nombre, du.alias,
             du.nivel_loyalty                                   AS nivel,
             COALESCE(SUM(fl.puntos_ganados), 0)               AS puntos_total,
             COALESCE(SUM(fl.puntos_canjeados), 0)             AS canjeados
      FROM fact_loyalty fl
      JOIN dim_usuario du ON du.usuario_key = fl.usuario_key
      WHERE 1=1 ${festivalFilter}
      GROUP BY fl.usuario_key, du.nombre, du.alias, du.nivel_loyalty
      ORDER BY puntos_total DESC
      LIMIT 10
    `, festivalParams);

    res.json({ kpis, por_festival, niveles, top_usuarios });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 8 — PROMOCIONES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/promociones', auth, async (req, res) => {
  try {
    const { clause, params } = buildFilters(req.query);

    const [[kpis]] = await db.query(`
      SELECT
        COUNT(DISTINCT fv.promocion_key)                                                 AS activas,
        SUM(CASE WHEN fv.promocion_key IS NOT NULL THEN 1 ELSE 0 END)                   AS usos_totales,
        COALESCE(SUM(CASE WHEN fv.promocion_key IS NOT NULL THEN fv.importe_linea END), 0) AS ingresos_total
      FROM fact_ventas fv
      JOIN dim_tiempo dt ON dt.tiempo_key = fv.tiempo_key
      JOIN dim_puesto dp ON dp.puesto_key = fv.puesto_key
      ${clause}
    `, params);

    const [lista] = await db.query(`
      SELECT dpr.titulo,
             dp.nombre     AS puesto_nombre,
             dp.tipo       AS tipo_puesto,
             COUNT(*)      AS usos,
             COALESCE(SUM(fv.importe_linea), 0)   AS ingresos_generados,
             COALESCE(SUM(fv.descuento_linea), 0) AS descuento_total,
             dpr.precio_promo,
             NULL AS incremento_ventas_pct,
             NULL AS impacto_margen_pct
      FROM fact_ventas fv
      JOIN dim_tiempo   dt  ON dt.tiempo_key    = fv.tiempo_key
      JOIN dim_puesto   dp  ON dp.puesto_key    = fv.puesto_key
      JOIN dim_promocion dpr ON dpr.promocion_key = fv.promocion_key
      ${clause}
      GROUP BY fv.promocion_key, dpr.titulo, dp.nombre, dp.tipo, dpr.precio_promo
      ORDER BY usos DESC
      LIMIT 20
    `, params);

    res.json({ kpis, lista });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 12 — CLV (Customer Lifetime Value)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/clv', auth, async (req, res) => {
  try {
    // fact_clv agrupa por usuario, opcionalmente filtramos por festival
    const festivalFilter = req.query.festival_id
      ? 'AND (fc.festival_key = ? OR fc.festival_key IS NULL)'
      : '';
    const festivalParams = req.query.festival_id ? [Number(req.query.festival_id)] : [];

    const [[kpis]] = await db.query(`
      SELECT
        COALESCE(AVG(fc.clv_estimado), 0)                                               AS clv_medio_global,
        SUM(CASE WHEN fc.segmento = 'VIP'      THEN 1 ELSE 0 END)                       AS usuarios_vip,
        COALESCE(AVG(CASE WHEN fc.segmento = 'VIP' THEN fc.clv_estimado END), 0)        AS clv_medio_vip,
        SUM(CASE WHEN fc.segmento = 'inactivo' THEN 1 ELSE 0 END)                       AS inactivos_recuperar
      FROM fact_clv fc
      WHERE 1=1 ${festivalFilter}
    `, festivalParams);

    const [segmentos] = await db.query(`
      SELECT fc.segmento,
             COUNT(*)              AS count,
             AVG(fc.clv_estimado)  AS clv_medio,
             COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM fact_clv fc2
               WHERE 1=1 ${festivalFilter}), 0)   AS pct_del_total
      FROM fact_clv fc
      WHERE 1=1 ${festivalFilter}
      GROUP BY fc.segmento
      ORDER BY clv_medio DESC
    `, [...festivalParams, ...festivalParams]);

    const [top_clv] = await db.query(`
      SELECT du.nombre, du.alias,
             fc.num_pedidos               AS pedidos,
             fc.ticket_medio,
             fc.frecuencia_compra_semanal AS frecuencia,
             fc.clv_estimado,
             fc.segmento
      FROM fact_clv fc
      JOIN dim_usuario du ON du.usuario_key = fc.usuario_key
      WHERE 1=1 ${festivalFilter}
      ORDER BY fc.clv_estimado DESC
      LIMIT 15
    `, festivalParams);

    res.json({ kpis, segmentos, top_clv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 10 — PREDICCIÓN DE DEMANDA
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/prediccion', auth, async (req, res) => {
  try {
    const festivalFilter = req.query.festival_id ? 'AND fp.festival_key = ?' : '';
    const tipoFilter     = req.query.tipo_puesto  ? 'AND dp.tipo = ?'       : '';
    const pjParams       = [
      ...(req.query.festival_id ? [Number(req.query.festival_id)] : []),
      ...(req.query.tipo_puesto  ? [req.query.tipo_puesto] : []),
    ];

    // Query 1: fila con la hora pico más alta (LIMIT 1, sin agregación)
    const [kipiRows] = await db.query(`
      SELECT dt.hora                   AS hora_pico,
             fp.pedidos_predichos      AS pedidos_hora_pico,
             fp.ingresos_predichos     AS ingresos_hora_pico,
             fp.confianza_pct          AS confianza_pct_pico
      FROM fact_prediccion fp
      JOIN dim_tiempo dt ON dt.tiempo_key = fp.tiempo_key
      LEFT JOIN dim_puesto dp ON dp.puesto_key = fp.puesto_key
      WHERE fp.es_hora_pico = 1 ${festivalFilter} ${tipoFilter}
      ORDER BY fp.pedidos_predichos DESC
      LIMIT 1
    `, pjParams);

    // Query 2: confianza media global sobre toda la tabla de predicciones
    const [[confRow]] = await db.query(`
      SELECT COALESCE(AVG(fp.confianza_pct), 0) AS confianza_global_pct
      FROM fact_prediccion fp
      LEFT JOIN dim_puesto dp ON dp.puesto_key = fp.puesto_key
      WHERE 1=1 ${festivalFilter} ${tipoFilter}
    `, pjParams);

    const kipiBase = kipiRows[0] || {};
    const kpis = {
      hora_pico:            kipiBase.hora_pico          ?? null,
      pedidos_hora_pico:    kipiBase.pedidos_hora_pico  ?? null,
      ingresos_hora_pico:   kipiBase.ingresos_hora_pico ?? null,
      confianza_global_pct: confRow?.confianza_global_pct ?? 0,
    };
    const [por_hora] = await db.query(`
      SELECT dt.hora,
             NULL                           AS ingresos_real,
             NULL                           AS pedidos_real,
             SUM(fp.ingresos_predichos)     AS ingresos_predichos,
             SUM(fp.pedidos_predichos)      AS pedidos_predichos,
             AVG(fp.confianza_pct)          AS confianza_pct
      FROM fact_prediccion fp
      JOIN dim_tiempo dt ON dt.tiempo_key = fp.tiempo_key
      LEFT JOIN dim_puesto dp ON dp.puesto_key = fp.puesto_key
      WHERE 1=1 ${festivalFilter} ${tipoFilter}
      GROUP BY dt.hora
      ORDER BY dt.hora
    `, pjParams);

    // fact_prediccion no tiene producto_key → agrupamos predicciones por puesto
    const [productos_top_predichos] = await db.query(`
      SELECT dp.nombre,
             COALESCE(SUM(fp.pedidos_predichos), 0) AS unidades_predichas
      FROM fact_prediccion fp
      JOIN dim_tiempo  dt ON dt.tiempo_key  = fp.tiempo_key
      LEFT JOIN dim_puesto dp ON dp.puesto_key = fp.puesto_key
      WHERE 1=1 ${festivalFilter} ${tipoFilter}
      GROUP BY fp.puesto_key, dp.nombre
      ORDER BY unidades_predichas DESC
      LIMIT 6
    `, pjParams);

    res.json({ kpis, por_hora, productos_top_predichos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECCIÓN 11 — HEATMAP DEL FESTIVAL
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/heatmap', auth, async (req, res) => {
  try {
    // Sin festival_id devolvemos vacío (el frontend muestra el mensaje de selección)
    if (!req.query.festival_id) {
      return res.json({ kpis: { zona_caliente: null, zona_fria: null, espera_zona_alta_min: null }, puestos: [] });
    }
    const festivalId = Number(req.query.festival_id);
    const tipoFilter = req.query.tipo_puesto ? 'AND dp.tipo = ?' : '';
    const extraParams = req.query.tipo_puesto ? [req.query.tipo_puesto] : [];

    const [puestos] = await db.query(`
      SELECT dp.puesto_key   AS puesto_id,
             dp.nombre,
             dp.tipo,
             dp.pos_x,
             dp.pos_y,
             COALESCE(SUM(fv.importe_linea), 0)    AS ingresos,
             COUNT(DISTINCT fv.pedido_id)           AS pedidos,
             COALESCE(MAX(fo.espera_estimada_min), 0) AS espera_min
      FROM dim_puesto dp
      LEFT JOIN fact_ventas fv      ON fv.puesto_key   = dp.puesto_key AND fv.festival_key = ?
      LEFT JOIN fact_operaciones fo ON fo.puesto_key   = dp.puesto_key AND fo.festival_key = ?
      WHERE dp.festival_key = ? ${tipoFilter}
      GROUP BY dp.puesto_key, dp.nombre, dp.tipo, dp.pos_x, dp.pos_y
      ORDER BY pedidos DESC
    `, [festivalId, festivalId, festivalId, ...extraParams]);

    // Intensidad relativa 0-100
    const maxPed = Math.max(...puestos.map(p => Number(p.pedidos)), 1);
    puestos.forEach(p => {
      p.intensidad = Math.round((Number(p.pedidos) / maxPed) * 100);
    });

    const zonaCaliente = puestos[0]?.nombre || null;
    const zonaFria     = puestos[puestos.length - 1]?.nombre || null;
    const esperaAlta   = puestos[0]?.espera_min ?? null;

    res.json({
      kpis: { zona_caliente: zonaCaliente, zona_fria: zonaFria, espera_zona_alta_min: esperaAlta },
      puestos,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  TÚNEL SSH → MySQL queuefest_dw
// ═══════════════════════════════════════════════════════════════════════════

const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
let privateKey = '';
try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8').replace(/\r\n/g, '\n');
} catch (e) {
  console.error(`[DW] WARN: No se pudo leer la llave SSH en (${privateKeyPath}):`, e.message);
}

const sshClient = new Client();

sshClient.on('ready', () => {
  console.log('[DW] Túnel SSH listo. Levantando forwarder TCP local en puerto', LOCAL_PORT, '...');

  const forwardServer = net.createServer((socket) => {
    sshClient.forwardOut(
      socket.remoteAddress,
      socket.remotePort,
      MYSQL_HOST,
      MYSQL_PORT,
      (err, stream) => {
        if (err) return socket.end();
        socket.pipe(stream).pipe(socket);
      }
    );
  });

  forwardServer.listen(LOCAL_PORT, '127.0.0.1', () => {
    console.log(`[DW] MySQL Forwarding en 127.0.0.1:${LOCAL_PORT} → ${MYSQL_HOST}:${MYSQL_PORT}`);

    db = mysql2.createPool({
      host:     '127.0.0.1',
      port:     LOCAL_PORT,
      user:     MYSQL_USER,
      password: MYSQL_PASS,
      database: MYSQL_DB,
    });

    app.listen(PORT, () => {
      console.log(`[DW] ✓ Servidor AdminDashboard en http://localhost:${PORT}`);
      console.log(`[DW] ✓ Base de datos: ${MYSQL_DB}`);
    });
  });
}).on('error', (err) => {
  console.error('[DW] Error del Túnel SSH:', err.message);
});

if (privateKey) {
  sshClient.connect({ host: SSH_HOST, port: 22, username: SSH_USER, privateKey });
} else {
  console.error('[DW] FATAL: Sin clave SSH — el servidor no puede arrancar.');
}
