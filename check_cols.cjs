const fs = require('fs');
const { Client } = require('ssh2');
const mysql = require('mysql2/promise');

async function checkTable() {
    const ssh = new Client();
    const privateKey = fs.readFileSync('C:\\Users\\Usuario\\Desktop\\Temarios_Universid\\5ºANO\\Gestión de la informacion\\BBDD\\ssh-key-2026-03-03.key', 'utf8').replace(/\r\n/g, '\n');

    ssh.on('ready', () => {
        ssh.forwardOut('127.0.0.1', 12345, '10.0.0.5', 3306, async (err, stream) => {
            if (err) return ssh.end();
            try {
                const conn = await mysql.createConnection({ stream, user: 'admin', password: 'Proyecto_Seguro2026!', database: 'queuefest' });
                const [rows] = await conn.execute('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name="productos"');
                const cols = rows.map(r => r.COLUMN_NAME).join(',');
                console.log('COLS=' + cols);
                await conn.end();
            } finally { ssh.end(); }
        });
    }).connect({ host: '143.47.35.13', port: 22, username: 'ubuntu', privateKey });
}
checkTable();
