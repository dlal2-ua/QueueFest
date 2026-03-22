const fs = require('fs');
const { Client } = require('ssh2');
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing SSH connection with new key...');
    const ssh = new Client();
    
    const privateKeyPath = 'C:\\Users\\Usuario\\Desktop\\Temarios_Universid\\5ºANO\\Gestión de la informacion\\BBDD\\ssh-key-2026-03-03.key';
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8').replace(/\r\n/g, '\n');

    ssh.on('ready', () => {
        console.log('[SUCCESS] SSH authentication successful!');
        
        ssh.forwardOut(
            '127.0.0.1',
            12345, 
            '10.0.0.5', 
            3306, 
            async (err, stream) => {
                if (err) {
                    console.error('[ERROR] SSH Forwarding failed:', err.message);
                    ssh.end();
                    return;
                }
                
                console.log('[SUCCESS] SSH Tunnel established. Connecting to MySQL...');
                
                try {
                    const conn = await mysql.createConnection({
                        stream: stream,
                        user: 'admin',
                        password: 'Proyecto_Seguro2026!'
                    });
                    
                    console.log('[SUCCESS] Connected to MySQL!');
                    const [rows] = await conn.execute('SHOW DATABASES;');
                    console.log('Databases:', rows.map(r => r.Database));
                    
                    await conn.end();
                } catch (mysqlErr) {
                    console.error('[ERROR] MySQL connection failed:', mysqlErr.message);
                } finally {
                    ssh.end();
                }
            }
        );
    }).on('error', (err) => {
        console.error('[ERROR] SSH Error:', err.message);
        ssh.end();
    }).connect({
        host: '143.47.35.13',
        port: 22,
        username: 'ubuntu',
        privateKey: privateKey,
        readyTimeout: 10000
    });
}

testConnection();
