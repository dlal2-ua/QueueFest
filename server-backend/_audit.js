const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 13307,
    user: 'admin', password: 'Proyecto_Seguro2026!',
    database: 'queuefest'
  });

  // 1. All tables + row counts
  console.log('========================================');
  console.log(' TABLAS Y CONTEO DE FILAS');
  console.log('========================================');
  const [tables] = await conn.query("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0]).filter(t => !t.startsWith('v_'));
  
  for (const t of tableNames) {
    const [[row]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    console.log(`  ${t.padEnd(30)} ${row.c} filas`);
  }

  // 2. Detailed structure of each table
  console.log('\n========================================');
  console.log(' ESTRUCTURA DE CADA TABLA');
  console.log('========================================');
  for (const t of tableNames) {
    console.log(`\n--- ${t} ---`);
    const [cols] = await conn.query(`DESCRIBE \`${t}\``);
    cols.forEach(c => {
      console.log(`  ${c.Field.padEnd(30)} ${c.Type.padEnd(50)} ${c.Null==='NO'?'NOT NULL':'NULL    '} ${c.Key||''} ${c.Default !== null ? 'DEFAULT=' + c.Default : ''}`);
    });
  }

  // 3. All existing indexes
  console.log('\n========================================');
  console.log(' INDICES EXISTENTES');
  console.log('========================================');
  for (const t of tableNames) {
    const [idxs] = await conn.query(`SHOW INDEX FROM \`${t}\``);
    if (idxs.length > 0) {
      console.log(`\n--- ${t} ---`);
      const grouped = {};
      idxs.forEach(i => {
        if (!grouped[i.Key_name]) grouped[i.Key_name] = { unique: !i.Non_unique, cols: [] };
        grouped[i.Key_name].cols.push(i.Column_name);
      });
      for (const [name, info] of Object.entries(grouped)) {
        console.log(`  ${name.padEnd(40)} (${info.cols.join(', ')}) ${info.unique ? 'UNIQUE' : ''}`);
      }
    }
  }

  // 4. Foreign keys
  console.log('\n========================================');
  console.log(' FOREIGN KEYS');
  console.log('========================================');
  const [fks] = await conn.query(`
    SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'queuefest' AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);
  let lastTable = '';
  fks.forEach(f => {
    if (f.TABLE_NAME !== lastTable) {
      console.log(`\n  ${f.TABLE_NAME}:`);
      lastTable = f.TABLE_NAME;
    }
    console.log(`    ${f.COLUMN_NAME.padEnd(25)} → ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}`);
  });

  // 5. Views
  console.log('\n========================================');
  console.log(' VISTAS');
  console.log('========================================');
  const [views] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA='queuefest'"
  );
  views.forEach(v => console.log(`  ${v.TABLE_NAME}`));

  // 6. Sample data from key tables
  console.log('\n========================================');
  console.log(' DATOS DE MUESTRA');
  console.log('========================================');

  console.log('\n--- roles ---');
  const [roles] = await conn.query('SELECT * FROM roles');
  roles.forEach(r => console.log(`  id=${r.id} nombre=${r.nombre}`));

  console.log('\n--- usuarios (sample) ---');
  const [users] = await conn.query('SELECT id, email, nombre, rol_id FROM usuarios LIMIT 10');
  users.forEach(u => console.log(`  id=${u.id} email=${u.email} nombre=${u.nombre} rol=${u.rol_id}`));

  console.log('\n--- festivales ---');
  const [fests] = await conn.query('SELECT id, nombre, activo, fecha_inicio, fecha_fin FROM festivales');
  fests.forEach(f => console.log(`  id=${f.id} ${f.nombre} activo=${f.activo} ${f.fecha_inicio}→${f.fecha_fin}`));

  console.log('\n--- puestos ---');
  const [puestos] = await conn.query('SELECT id, festival_id, nombre, tipo, abierto FROM puestos');
  puestos.forEach(p => console.log(`  id=${p.id} fest=${p.festival_id} ${p.nombre} tipo=${p.tipo} abierto=${p.abierto}`));

  console.log('\n--- productos (sample) ---');
  const [prods] = await conn.query('SELECT id, puesto_id, nombre, precio, stock, activo FROM productos LIMIT 15');
  prods.forEach(p => console.log(`  id=${p.id} puesto=${p.puesto_id} ${p.nombre} ${p.precio}EUR stock=${p.stock} activo=${p.activo}`));

  console.log('\n--- pedidos (sample) ---');
  const [peds] = await conn.query('SELECT id, usuario_id, puesto_id, estado, total, creado_en FROM pedidos ORDER BY id DESC LIMIT 10');
  peds.forEach(p => console.log(`  id=${p.id} user=${p.usuario_id} puesto=${p.puesto_id} estado=${p.estado} total=${p.total} ${p.creado_en}`));

  console.log('\n--- parametros ---');
  const [params] = await conn.query('SELECT * FROM parametros WHERE id=1');
  console.log(JSON.stringify(params[0], null, 2));

  console.log('\n--- loyalty (sample) ---');
  const [loyal] = await conn.query('SELECT * FROM loyalty LIMIT 5');
  loyal.forEach(l => console.log(`  user=${l.usuario_id} total=${l.puntos_total} nivel=${l.nivel}`));

  console.log('\n--- materias_primas ---');
  const [mp] = await conn.query('SELECT id, nombre, unidad_medida, stock_actual, stock_minimo FROM materias_primas LIMIT 10');
  mp.forEach(m => console.log(`  id=${m.id} ${m.nombre} ${m.stock_actual}${m.unidad_medida} min=${m.stock_minimo}`));

  console.log('\n--- resena_puntos_config ---');
  const [rpc] = await conn.query('SELECT * FROM resena_puntos_config');
  rpc.forEach(r => console.log(`  ${r.accion.padEnd(30)} ${r.puntos}pts activo=${r.activo}`));

  // 7. Table sizes on disk
  console.log('\n========================================');
  console.log(' TAMAÑO EN DISCO');
  console.log('========================================');
  const [sizes] = await conn.query(`
    SELECT TABLE_NAME, 
           ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 1) AS size_kb,
           TABLE_ROWS
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA='queuefest' AND TABLE_TYPE='BASE TABLE'
    ORDER BY DATA_LENGTH + INDEX_LENGTH DESC
  `);
  sizes.forEach(s => console.log(`  ${s.TABLE_NAME.padEnd(30)} ${String(s.size_kb).padStart(8)} KB  (~${s.TABLE_ROWS} rows estimated)`));

  await conn.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
