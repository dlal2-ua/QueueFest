
// ============================================================================
// En resumen: Sirve para "fotografiar" la estructura de la base de datos 
// y tenerla documentada localmente en un archivo JSON.
// ============================================================================

const fs = require('fs');
const { Client } = require('ssh2');
const mysql = require('mysql2/promise');

async function checkSchema() {
    const ssh = new Client();
    const privateKey = fs.readFileSync('C:\\Users\\Usuario\\Desktop\\Temarios_Universid\\5ºANO\\Gestión de la informacion\\BBDD\\ssh-key-2026-03-03.key', 'utf8').replace(/\r\n/g, '\n');

    ssh.on('ready', () => {
        ssh.forwardOut('127.0.0.1', 12345, '10.0.0.5', 3306, async (err, stream) => {
            if (err) return ssh.end();
            try {
                const conn = await mysql.createConnection({ stream, user: 'admin', password: 'Proyecto_Seguro2026!', database: 'queuefest' });
                const [tables] = await conn.execute('SHOW TABLES');
                let schema = {};
                for (let row of tables) {
                    const tableName = Object.values(row)[0];
                    const [cols] = await conn.execute(`DESCRIBE ${tableName};`);
                    schema[tableName] = cols.map(c => `${c.Field} (${c.Type})`);
                }
                fs.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
                console.log('Schema saved to schema_dump.json');
                await conn.end();
            } catch (e) {
                console.error(e);
            } finally { ssh.end(); }
        });
    }).connect({ host: '143.47.35.13', port: 22, username: 'ubuntu', privateKey });
}
checkSchema();



