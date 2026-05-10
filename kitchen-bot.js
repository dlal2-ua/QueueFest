#!/usr/bin/env node
/*
 * QueueFest Bot Cocina (Kitchen)
 *
 * Uso:
 *   node kitchen-bot.js --festival 1
 *   node kitchen-bot.js --festival 2 --interval 10 --verbose
 *
 * Parámetros:
 *   --festival <id>      ID del festival
 *   --interval <segs>    Segundos entre ticks (default: 5)
 *   --verbose            Log detallado
 *   --dry-run            Solo leer, no escribir
 *
 * Controles:
 *   [ESPACIO]  Pausar / Reanudar
 *   [Ctrl+C]   Detener
 *
 * Comportamiento:
 *  - Hace polling de pedidos no terminales en TODOS los puestos del festival
 *    (incluso los cerrados: `abierto = 0` solo bloquea pedidos NUEVOS, no
 *    impide despachar los que ya estaban en la cola).
 *  - Cada tick avanza, por puesto y por estado, los K pedidos más antiguos al
 *    siguiente estado, donde K = num_empleados del puesto.
 *  - Procesa los estados en orden inverso (listo→entregado primero) para que
 *    cada pedido avance como máximo un estado por tick.
 *  - Funciona para cualquier pedido (los del bot comprador y los reales).
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql2 from 'mysql2/promise';
import fs from 'fs';
import net from 'net';
import { Client } from 'ssh2';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'server-backend', '.env') });

// ─── Arg parsing ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const has = (flag) => args.includes(flag);

const FESTIVAL_ID = Number(get('--festival'));
if (!FESTIVAL_ID) {
    console.error('\n❌  Especifica un festival: node kitchen-bot.js --festival <id>\n');
    process.exit(1);
}

const TICK_INTERVAL_MS = (Number(get('--interval')) || 5) * 1000;
const VERBOSE = has('--verbose');
const DRY_RUN = has('--dry-run');

// Estados a avanzar, en ORDEN INVERSO. Procesar de atrás hacia delante evita
// que un pedido recién creado salte varios estados en un mismo tick.
const TRANSICIONES = [
    { from: 'listo',      to: 'entregado',  emoji: '🎉' },
    { from: 'preparando', to: 'listo',      emoji: '🔔' },
    { from: 'confirmado', to: 'preparando', emoji: '👨‍🍳' },
    { from: 'pendiente',  to: 'confirmado', emoji: '✅' },
];

// ─── Logging ──────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-ES');
const log = (emoji, msg, detail = '') =>
    console.log(`${ts()}  ${emoji}  ${msg}${detail ? '  →  ' + detail : ''}`);
const verb = (msg) => VERBOSE && console.log(`    ↳ ${msg}`);

// ─── Estado global ────────────────────────────────────────────────────────────
let paused = false;
let db;
const stats = {
    ticks: 0,
    avances: 0,
    entregados: 0,
    porEstado: { confirmado: 0, preparando: 0, listo: 0, entregado: 0 },
};

// ─── DB connection via túnel SSH ──────────────────────────────────────────────
const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const tunnelPort = Number(process.env.BOT_TUNNEL_PORT || 12346);

function buildPool() {
    return mysql2.createPool({
        host: '127.0.0.1',
        port: tunnelPort,
        user: 'admin',
        password: 'Proyecto_Seguro2026!',
        database: 'queuefest',
        waitForConnections: true,
        connectionLimit: 5,
    });
}

function isTunnelOpen(port, host = '127.0.0.1', timeoutMs = 600) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let done = false;
        const finish = (ok) => { if (done) return; done = true; socket.destroy(); resolve(ok); };
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
        socket.connect(port, host);
    });
}

async function connectDB() {
    if (await isTunnelOpen(tunnelPort)) {
        console.log(`🔌  Reutilizando túnel existente en 127.0.0.1:${tunnelPort}`);
        db = buildPool();
        return;
    }

    let privateKey;
    try {
        privateKey = fs.readFileSync(privateKeyPath, 'utf8').replace(/\r\n/g, '\n');
    } catch (e) {
        throw new Error(`No se pudo leer la clave SSH en "${privateKeyPath}": ${e.message}`);
    }

    return new Promise((resolve, reject) => {
        const sshClient = new Client();
        const forwardServer = net.createServer((socket) => {
            sshClient.forwardOut(
                socket.remoteAddress, socket.remotePort,
                '10.0.0.5', 3306,
                (err, stream) => { if (err) return socket.end(); socket.pipe(stream).pipe(socket); }
            );
        });

        sshClient.on('ready', () => {
            forwardServer.listen(tunnelPort, '127.0.0.1', () => {
                console.log(`🔌  Túnel SSH listo (127.0.0.1:${tunnelPort} → 10.0.0.5:3306)`);
                db = buildPool();
                resolve();
            });
        }).on('error', reject);

        sshClient.connect({ host: '143.47.35.13', port: 22, username: 'ubuntu', privateKey });
    });
}

// ─── Captura de teclas (ESPACIO para pausar/reanudar) ─────────────────────────
function setupKeyboard() {
    if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', (str, key) => {
            if (key && key.ctrl && key.name === 'c') {
                console.log('\n\n🛑  Bot detenido por el usuario.\n');
                process.exit(0);
            }
            if (key && key.name === 'space') {
                paused = !paused;
                if (paused) console.log(`\n${ts()}  ⏸️   COCINA PAUSADA — Pulsa [ESPACIO] para reanudar\n`);
                else        console.log(`\n${ts()}  ▶️   COCINA REANUDADA\n`);
            }
        });
    } else {
        console.log('⚠️  Terminal no interactiva — pausa con ESPACIO no disponible');
    }
}

// ─── Avance de un estado en un puesto ─────────────────────────────────────────
async function avanzarEstadoPuesto(puesto, transicion) {
    const k = Math.max(1, Number(puesto.num_empleados) || 1);

    const [candidatos] = await db.query(
        `SELECT id FROM pedidos
         WHERE puesto_id = ? AND estado = ?
         ORDER BY creado_en ASC
         LIMIT ?`,
        [puesto.id, transicion.from, k]
    );

    if (candidatos.length === 0) return 0;

    if (DRY_RUN) {
        verb(`[DRY] ${puesto.nombre}: ${candidatos.length} pedido(s) ${transicion.from} → ${transicion.to}`);
        return candidatos.length;
    }

    const ids = candidatos.map(c => c.id);
    const [res] = await db.query(
        `UPDATE pedidos SET estado = ? WHERE id IN (?) AND estado = ?`,
        [transicion.to, ids, transicion.from]
    );

    if (res.affectedRows > 0) {
        stats.avances += res.affectedRows;
        stats.porEstado[transicion.to] = (stats.porEstado[transicion.to] || 0) + res.affectedRows;
        if (transicion.to === 'entregado') stats.entregados += res.affectedRows;
        log(transicion.emoji, `${puesto.nombre}`, `${res.affectedRows} pedido(s) ${transicion.from} → ${transicion.to} [#${ids.join(', #')}]`);
    }
    return res.affectedRows;
}

// ─── Tick principal ───────────────────────────────────────────────────────────
async function tick() {
    if (paused) return;
    stats.ticks++;

    // Importante: NO filtramos por `abierto = 1`. Un puesto cerrado por el
    // botón pánico o por la regla `cerrar_barra` no acepta pedidos nuevos,
    // pero la cocina sigue despachando los que ya tenía pendientes. Si no
    // los avanzáramos, la regla `abrir_barra` (que necesita la cola por debajo
    // de umbral/2) nunca se dispararía y el puesto quedaría bloqueado.
    const [puestos] = await db.query(
        `SELECT id, nombre, num_empleados, abierto FROM puestos
         WHERE festival_id = ?`,
        [FESTIVAL_ID]
    );

    if (puestos.length === 0) {
        verb('No hay puestos en este tick');
        return;
    }

    let totalTick = 0;
    for (const puesto of puestos) {
        for (const transicion of TRANSICIONES) {
            try {
                totalTick += await avanzarEstadoPuesto(puesto, transicion);
            } catch (e) {
                verb(`Error en ${puesto.nombre} ${transicion.from}→${transicion.to}: ${e.message}`);
            }
        }
    }

    if (totalTick === 0) verb(`Tick #${stats.ticks}: nada que avanzar`);

    if (stats.ticks % 12 === 0) mostrarResumen();
}

function mostrarResumen() {
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│          🍳  RESUMEN COCINA                                 │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Ticks: ${String(stats.ticks).padEnd(6)}  Avances totales: ${String(stats.avances).padEnd(6)}  Entregados: ${String(stats.entregados).padEnd(6)}│`);
    console.log(`│  Por estado: confirmado=${stats.porEstado.confirmado}  preparando=${stats.porEstado.preparando}  listo=${stats.porEstado.listo}  entregado=${stats.porEstado.entregado}`.padEnd(62) + '│');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log(`  ${paused ? '⏸️  PAUSADO' : '▶️  ACTIVO'}  │  [ESPACIO] Pausar/Reanudar  │  [Ctrl+C] Salir\n`);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       QueueFest Bot Cocina  🍳🤖                         ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Controles:                                              ║');
    console.log('║    [ESPACIO]  →  Pausar / Reanudar                       ║');
    console.log('║    [Ctrl+C]   →  Detener                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`  Festival ID : ${FESTIVAL_ID}`);
    console.log(`  Tick        : cada ${TICK_INTERVAL_MS / 1000}s`);
    console.log(`  Modo        : ${DRY_RUN ? '🧪 DRY RUN' : '💾 ESCRITURA'}`);
    console.log(`  Capacidad   : K = num_empleados por estado y puesto en cada tick`);
    console.log(`  Orden       : listo→entregado, preparando→listo, confirmado→preparando, pendiente→confirmado`);
    console.log('');

    setupKeyboard();

    console.log('🔌  Conectando a la base de datos...');
    await connectDB();
    console.log('✅  Conexión establecida\n');

    const [fests] = await db.query('SELECT id, nombre FROM festivales WHERE id = ?', [FESTIVAL_ID]);
    if (fests.length === 0) {
        console.error(`❌  Festival #${FESTIVAL_ID} no encontrado.`);
        const [todos] = await db.query('SELECT id, nombre FROM festivales ORDER BY id');
        console.log('Festivales disponibles:');
        todos.forEach(f => console.log(`  [${f.id}] ${f.nombre}`));
        process.exit(1);
    }
    log('🎪', `Festival: ${fests[0].nombre}`);
    console.log('🚀  Cocina iniciada. Pulsa [ESPACIO] para pausar/reanudar.\n');

    const loop = async () => {
        try {
            await tick();
        } catch (err) {
            log('💥', 'Error en tick', err.message);
        }
        setTimeout(loop, TICK_INTERVAL_MS);
    };
    loop();
}

process.on('SIGINT', () => {
    console.log('\n\n🛑  Cocina detenida.');
    console.log(`📊  Resumen: ${stats.ticks} ticks · ${stats.avances} avances · ${stats.entregados} entregados\n`);
    process.exit(0);
});

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
