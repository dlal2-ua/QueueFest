const mysql = require('mysql2/promise');

const OLTP = 'queuefest';
const DW = 'queuefest_dw';

async function sync() {
  const conn = await mysql.createConnection({
    host: '10.0.0.5', port: 3306, user: 'admin', password: 'Proyecto_Seguro2026!'
  });
  
  try {
    // dim_festival
    await conn.query(`
      INSERT INTO ${DW}.dim_festival (festival_key, festival_id_origen, nombre, fecha_inicio, fecha_fin, localizacion, duracion_dias, activo, foto_url, modo_auto)
      SELECT id, id, nombre, fecha_inicio, fecha_fin, 'Sede', DATEDIFF(fecha_fin, fecha_inicio)+1, activo, NULL, 1 FROM ${OLTP}.festivales
      ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), activo=VALUES(activo)
    `);

    // dim_puesto
    await conn.query(`
      INSERT INTO ${DW}.dim_puesto (puesto_key, puesto_id_origen, festival_key, nombre, tipo, capacidad_max, num_empleados, tiempo_servicio_medio, abierto, pos_x, pos_y, foto_url)
      SELECT id, id, festival_id, nombre, COALESCE(tipo, 'barra'), capacidad_max, num_empleados, tiempo_servicio_medio, abierto, pos_x, pos_y, NULL
      FROM ${OLTP}.puestos
      ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), abierto=VALUES(abierto)
    `);

    // dim_producto
    await conn.query(`
      INSERT INTO ${DW}.dim_producto (producto_key, producto_id_origen, puesto_key, nombre, descripcion, precio_base, coste_estimado, margen_estimado_pct, stock_actual, activo, foto_url)
      SELECT id, id, puesto_id, nombre, '', precio, precio*0.38, 62, stock, activo, NULL
      FROM ${OLTP}.productos
      ON DUPLICATE KEY UPDATE precio_base=VALUES(precio_base), stock_actual=VALUES(stock_actual), activo=VALUES(activo)
    `);

    // dim_usuario
    await conn.query(`
      INSERT INTO ${DW}.dim_usuario (usuario_key, usuario_id_origen, nombre, alias, email, rol, ciudad, telefono, fecha_nacimiento, fecha_registro, idioma_preferido, preferencias_dieteticas, alergias, acepta_marketing, notificaciones_push, notificaciones_email, nivel_loyalty, segmento_clv, ultimo_acceso_en)
      SELECT u.id, u.id, u.nombre, NULL, u.email, COALESCE(r.nombre, 'usuario'), NULL, NULL, NULL, u.creado_en, u.idioma_preferido, NULL, NULL, u.acepta_marketing, u.notificaciones_push, u.notificaciones_email, COALESCE(l.nivel, 'fan'), 'activo', u.actualizado_en
      FROM ${OLTP}.usuarios u
      LEFT JOIN ${OLTP}.roles r ON r.id = u.rol_id
      LEFT JOIN ${OLTP}.loyalty l ON l.usuario_id = u.id
      ON DUPLICATE KEY UPDATE nivel_loyalty=VALUES(nivel_loyalty), ultimo_acceso_en=VALUES(ultimo_acceso_en)
    `);

    // fact_ventas
    const [maxIdRow] = await conn.query(`SELECT MAX(pedido_item_id) as m FROM ${DW}.fact_ventas`);
    const maxId = maxIdRow[0].m || 0;

    if (maxId >= 0) {
      await conn.query(`
        INSERT INTO ${DW}.fact_ventas (tiempo_key, festival_key, puesto_key, producto_key, usuario_key, estado_pedido_key, metodo_pago_key, promocion_key, pedido_id, pedido_item_id, cantidad, precio_unitario, precio_dinamico_aplicado, precio_promo_aplicado, importe_linea, descuento_linea, total_pedido, coste_linea, margen_linea, puntos_loyalty_ganados, puntos_loyalty_canjeados)
        SELECT 
          (YEAR(p.creado_en) * 1000000 + MONTH(p.creado_en) * 10000 + DAY(p.creado_en) * 100 + HOUR(p.creado_en)) AS tiempo_key,
          pu.festival_id AS festival_key,
          pu.id AS puesto_key,
          pi.producto_id AS producto_key,
          p.usuario_id AS usuario_key,
          CASE LOWER(TRIM(COALESCE(p.estado,'')))
            WHEN 'pendiente' THEN 1 WHEN 'confirmado' THEN 2 WHEN 'preparando' THEN 3
            WHEN 'listo' THEN 4 WHEN 'entregado' THEN 5 WHEN 'cancelado' THEN 6 ELSE 1 END AS estado_pedido_key,
          1 AS metodo_pago_key,
          NULL AS promocion_key,
          p.id AS pedido_id,
          pi.id AS pedido_item_id,
          pi.cantidad,
          pi.precio_unitario,
          NULL, NULL,
          ROUND(pi.cantidad * pi.precio_unitario, 4), 0,
          p.total,
          ROUND(pi.cantidad * pi.precio_unitario * 0.38, 4),
          ROUND(pi.cantidad * pi.precio_unitario * 0.62, 4),
          0, 0
        FROM ${OLTP}.pedido_items pi
        JOIN ${OLTP}.pedidos p ON p.id = pi.pedido_id
        JOIN ${OLTP}.puestos pu ON pu.id = p.puesto_id
        WHERE pi.id > ?
      `, [maxId]);
    }

    // Update fact_ventas order states for existing lines safely
    await conn.query(`
      UPDATE ${DW}.fact_ventas fv
      JOIN ${OLTP}.pedidos p ON fv.pedido_id = p.id
      SET fv.estado_pedido_key = CASE LOWER(TRIM(COALESCE(p.estado,'')))
          WHEN 'pendiente' THEN 1 WHEN 'confirmado' THEN 2 WHEN 'preparando' THEN 3
          WHEN 'listo' THEN 4 WHEN 'entregado' THEN 5 WHEN 'cancelado' THEN 6 ELSE 1 END
      WHERE fv.pedido_id >= (SELECT COALESCE(MAX(pedido_id), 0) - 2000 FROM (SELECT MAX(pedido_id) as pedido_id FROM ${DW}.fact_ventas) AS tmp)
    `);

    // fact_operaciones
    await conn.query(`
      INSERT INTO ${DW}.fact_operaciones (tiempo_key, festival_key, puesto_key, pedidos_activos, pedidos_completados_hora, pedidos_cancelados_hora, espera_estimada_min, num_empleados_activos, ingresos_acumulados, ingresos_hora, ticket_medio_hora, ocupacion_actual, ratio_ocupacion_pct, puesto_abierto, estado_puesto, alertas_stock_activas, productos_bloqueados, decisiones_pendientes, decisiones_ejecutadas)
      SELECT 
        (YEAR(NOW()) * 1000000 + MONTH(NOW()) * 10000 + DAY(NOW()) * 100 + HOUR(NOW())) AS tiempo_key,
        pu.festival_id,
        pu.id,
        0, 0, 0, 0, pu.num_empleados, 0, 0, 0, 0, 0, pu.abierto, 'normal', 0, 0, 0, 0
      FROM ${OLTP}.puestos pu
      ON DUPLICATE KEY UPDATE puesto_abierto=VALUES(puesto_abierto)
    `);

    console.log(`[OK] Sync ran successfully at ${new Date().toISOString()}`);

  } catch(e) {
    console.error(`[ERROR] Sync failed at ${new Date().toISOString()}:`, e.message);
  } finally {
    await conn.end();
  }
}

async function loop() {
  const start = Date.now();
  await sync();
  const elapsed = Date.now() - start;
  const next = Math.max(0, 1000 - elapsed);
  setTimeout(loop, next);
}

console.log('Starting Realtime DW Sync Daemon (1 second interval)...');
loop();
