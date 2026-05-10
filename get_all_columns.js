const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '10.0.0.5', port: 3306,
    user: 'admin', password: 'Proyecto_Seguro2026!',
    database: 'queuefest_dw'
  });

  try {
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    const schema = {};
    for (const t of tableNames) {
      const [columns] = await conn.query(`SHOW COLUMNS FROM ${t}`);
      schema[t] = columns.map(c => c.Field);
    }
    
    console.log(JSON.stringify(schema, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await conn.end();
  }
}

main();
