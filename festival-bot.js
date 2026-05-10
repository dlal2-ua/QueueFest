#!/usr/bin/env node
/*
 * QueueFest Bot Comprador v2
 *
 * Uso:
 *   node festival-bot.js --festival 1
 *   node festival-bot.js --festival 2 --speed fast --verbose
 *
 * Parámetros:
 *   --festival  <id>   ID del festival
 *   --speed    <mode> slow | normal | fast  (default: normal)
 *   --verbose          Log detallado de cada acción
 *   --dry-run          Solo leer datos, no escribir nada
 *
 * Controles:
 *   [ESPACIO]  Pausar / Reanudar el bot
 *   [Ctrl+C]   Detener completamente
 *
 * Comportamiento:
 *  - Crea pedidos con productos activos del puesto (NO avanza estados — eso lo hace kitchen-bot.js)
 *  - Prefiere productos con promoción activa (70% probabilidad)
 *  - Si la cola del puesto está alta, espera más entre pedidos
 *  - Si el puesto está cerrado, no ordena nada
 *  - Si el stock de materias primas es bajo, lo muestra como factor
 *  - Muestra un dashboard de factores que afectan al bot
 *
 * Nota: el avance de estados (pendiente→confirmado→...→entregado) lo gestiona
 * kitchen-bot.js como un proceso independiente, para que también avancen los
 * pedidos creados por usuarios reales desde la app.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql2 from 'mysql2/promise';
import fs from 'fs';
import net from 'net';
import { Client } from 'ssh2';
import readline from 'readline';

// Cargar .env desde server-backend/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'server-backend', '.env') });

// ─── Arg parsing ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const has = (flag) => args.includes(flag);

const FESTIVAL_ID = Number(get('--festival'));
if (!FESTIVAL_ID) {
    console.error('\n❌  Especifica un festival: node festival-bot.js --festival <id>\n');
    process.exit(1);
}

const SPEED = get('--speed') || 'normal';
const VERBOSE = has('--verbose');
const DRY_RUN = has('--dry-run');

// Ritmo de llegada de clientes (ms entre clientes) según velocidad
const ARRIVAL_INTERVAL_MS = { slow: 2500, normal: 1000, fast: 400 }[SPEED] || 1000;

// Si la cola del puesto elegido supera este umbral, el cliente se va sin comprar
const COLA_ABANDONO = 8;

// Refrescar dashboard cada N clientes (ticks)
const DASHBOARD_REFRESH = 30;

// Pesos del scoring de atracción
const SCORE_PROMO_BOOST = 0.6;       // +60% por promo activa
const SCORE_QUEUE_PENALTY = 0.3;     // ÷ (1 + 0.3·cola)
const SCORE_PRICE_BASE = 1.5;        // 1.5 - ratio_precio
const SCORE_STOCK_VACIO = 0.7;       // × 0.7 si hay materias primas agotadas

// Flujo de estados (referencia)
const ESTADO_FLOW = ['pendiente', 'confirmado', 'preparando', 'listo', 'entregado'];

// ─── Logging ──────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-ES');
const log = (emoji, msg, detail = '') =>
    console.log(`${ts()}  ${emoji}  ${msg}${detail ? '  →  ' + detail : ''}`);
const verb = (msg) => VERBOSE && console.log(`    ↳ ${msg}`);

// ─── Estado global ────────────────────────────────────────────────────────────
let paused = false;
let puestos = [];
let userIds = [];
let tick = 0;
let db;

// Estadísticas del bot
const stats = {
    pedidosCreados: 0,
    clientesPerdidos: 0,    // se fueron sin comprar (cola llena, sin productos)
    totalVentas: 0,
    ticksEjecutados: 0,
    pausas: 0,
};

// Factores que afectan al bot por puesto
let factoresPuesto = new Map();

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
    // Si el admin dashboard (u otro proceso) ya tiene el túnel abierto en
    // 127.0.0.1:tunnelPort, lo reutilizamos en lugar de abrir uno propio.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Captura de teclas (ESPACIO para pausar/reanudar) ─────────────────────────
function setupKeyboard() {
    if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', (str, key) => {
            // Ctrl+C para salir
            if (key && key.ctrl && key.name === 'c') {
                console.log('\n\n🛑  Bot detenido por el usuario.\n');
                process.exit(0);
            }
            // Espacio para pausar/reanudar
            if (key && key.name === 'space') {
                paused = !paused;
                stats.pausas++;
                if (paused) {
                    console.log(`\n${ts()}  ⏸️   BOT PAUSADO — Pulsa [ESPACIO] para reanudar\n`);
                } else {
                    console.log(`\n${ts()}  ▶️   BOT REANUDADO — Continuando desde donde se quedó\n`);
                }
            }
        });
    } else {
        console.log('⚠️  Terminal no interactiva — pausa con ESPACIO no disponible');
    }
}

// ─── Datos ────────────────────────────────────────────────────────────────────
async function ensureUsers() {
    const [rows] = await db.query('SELECT id FROM usuarios LIMIT 50');
    userIds = rows.map(r => r.id);
}

async function recargarPuestos() {
    const [rows] = await db.query(
        'SELECT id, nombre, abierto, num_empleados, capacidad_max, tiempo_servicio_medio FROM puestos WHERE festival_id = ?',
        [FESTIVAL_ID]
    );
    puestos = rows;
}

// ─── Análisis de factores que afectan al bot ──────────────────────────────────
async function analizarFactores(puesto) {
    const factores = [];

    // 1. Estado del puesto
    if (!puesto.abierto) {
        factores.push({ icono: '🔴', factor: 'CERRADO', efecto: 'No se compra', impacto: 'bloqueante' });
        factoresPuesto.set(puesto.id, factores);
        return factores;
    }
    factores.push({ icono: '🟢', factor: 'Abierto', efecto: 'Acepta pedidos', impacto: 'positivo' });

    // 2. Cola actual
    const [[{ cola }]] = await db.query(
        `SELECT COUNT(*) AS cola FROM pedidos
         WHERE puesto_id = ? AND estado IN ('pendiente','confirmado','preparando')`,
        [puesto.id]
    );
    if (cola >= COLA_ABANDONO) {
        factores.push({ icono: '🔴', factor: `Cola saturada (${cola})`, efecto: `≥${COLA_ABANDONO} → clientes abandonan`, impacto: 'bloqueante' });
    } else if (cola >= 4) {
        factores.push({ icono: '🟡', factor: `Cola alta (${cola})`, efecto: 'Penaliza score → menos clientes', impacto: 'negativo' });
    } else {
        factores.push({ icono: '🟢', factor: `Cola normal (${cola})`, efecto: 'Score sin penalización', impacto: 'positivo' });
    }

    // 3. Productos disponibles
    const [prods] = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN pr.stock IS NOT NULL AND pr.stock <= 5 THEN 1 ELSE 0 END) AS stock_bajo
         FROM productos pr WHERE pr.puesto_id = ? AND pr.activo = 1`,
        [puesto.id]
    );
    if (prods[0].total === 0) {
        factores.push({ icono: '🔴', factor: 'Sin productos', efecto: 'No hay qué comprar', impacto: 'bloqueante' });
    } else {
        if (prods[0].stock_bajo > 0) {
            factores.push({ icono: '🟡', factor: `${prods[0].stock_bajo} producto(s) stock bajo`, efecto: 'Menos variedad', impacto: 'negativo' });
        }
        factores.push({ icono: '🟢', factor: `${prods[0].total} producto(s) activos`, efecto: 'Pool de compra disponible', impacto: 'positivo' });
    }

    // 4. Promociones activas
    const [[{ promos }]] = await db.query(
        `SELECT COUNT(*) AS promos FROM promociones WHERE puesto_id = ? AND activa = 1`,
        [puesto.id]
    );
    if (promos > 0) {
        factores.push({ icono: '🎟️', factor: `${promos} promo(s) activas`, efecto: '70% probabilidad de elegir promo', impacto: 'positivo' });
    } else {
        factores.push({ icono: '⚪', factor: 'Sin promociones', efecto: 'Compra a precio normal', impacto: 'neutral' });
    }

    // 5. Precios dinámicos
    const [[{ dinamicos }]] = await db.query(
        `SELECT COUNT(*) AS dinamicos FROM productos
         WHERE puesto_id = ? AND activo = 1 AND precio_dinamico IS NOT NULL AND precio_dinamico != precio`,
        [puesto.id]
    );
    if (dinamicos > 0) {
        factores.push({ icono: '📈', factor: `${dinamicos} precio(s) dinámico(s)`, efecto: 'Precios ajustados por demanda', impacto: 'variable' });
    }

    // 6. Stock de materias primas
    const [stockBajo] = await db.query(
        `SELECT mp.nombre, sp.stock_actual, sp.stock_minimo
         FROM stock_puesto sp
         JOIN materias_primas mp ON mp.id = sp.materia_prima_id
         WHERE sp.puesto_id = ? AND sp.stock_actual <= sp.stock_minimo AND sp.stock_actual > 0`,
        [puesto.id]
    );
    const [stockAgotado] = await db.query(
        `SELECT mp.nombre
         FROM stock_puesto sp
         JOIN materias_primas mp ON mp.id = sp.materia_prima_id
         WHERE sp.puesto_id = ? AND sp.stock_actual <= 0`,
        [puesto.id]
    );
    if (stockAgotado.length > 0) {
        factores.push({ icono: '🔴', factor: `${stockAgotado.length} materia(s) agotada(s)`, efecto: stockAgotado.map(s => s.nombre).join(', '), impacto: 'negativo' });
    }
    if (stockBajo.length > 0) {
        factores.push({ icono: '🟡', factor: `${stockBajo.length} materia(s) stock bajo`, efecto: stockBajo.map(s => `${s.nombre}: ${s.stock_actual}/${s.stock_minimo}`).join(', '), impacto: 'alerta' });
    }

    factoresPuesto.set(puesto.id, factores);
    return factores;
}

// ─── Mostrar dashboard de factores ────────────────────────────────────────────
function mostrarDashboard() {
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│          📊  DASHBOARD DE FACTORES DEL BOT                     │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│  📦 Pedidos creados: ${String(stats.pedidosCreados).padEnd(6)} │  💰 Ventas: ${String(stats.totalVentas.toFixed(2) + '€').padEnd(10)} │  🚶 Perdidos: ${String(stats.clientesPerdidos).padEnd(4)}│`);
    console.log(`│  👥 Clientes simulados: ${String(stats.ticksEjecutados).padEnd(38)}│`);
    console.log('├─────────────────────────────────────────────────────────────────┤');

    for (const puesto of puestos) {
        const factores = factoresPuesto.get(puesto.id) || [];
        console.log(`│  🏪 ${puesto.nombre.padEnd(57)}│`);
        for (const f of factores) {
            const line = `   ${f.icono} ${f.factor}: ${f.efecto}`;
            console.log(`│  ${line.padEnd(61)}│`);
        }
        console.log('│                                                                 │');
    }
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log(`  ${paused ? '⏸️  PAUSADO' : '▶️  ACTIVO'}  │  [ESPACIO] Pausar/Reanudar  │  [Ctrl+C] Salir\n`);
}

// ─── Cola de un puesto ────────────────────────────────────────────────────────
async function getCola(puestoId) {
    const [[{ cola }]] = await db.query(
        `SELECT COUNT(*) AS cola FROM pedidos
         WHERE puesto_id = ? AND estado IN ('pendiente','confirmado','preparando')`,
        [puestoId]
    );
    return Number(cola);
}

// ─── Obtener productos disponibles ────────────────────────────────────────────
async function getProductos(puestoId) {
    const [rows] = await db.query(
        `SELECT
       pr.id, pr.nombre, pr.precio, pr.precio_dinamico, pr.stock,
       COALESCE(po.precio_promo, NULL) AS precio_promo,
       (po.id IS NOT NULL) AS tiene_promo
     FROM productos pr
     LEFT JOIN promociones po ON po.producto_id = pr.id AND po.activa = 1
     WHERE pr.puesto_id = ? AND pr.activo = 1 AND (pr.stock IS NULL OR pr.stock > 0)
     ORDER BY tiene_promo DESC, pr.id ASC
     LIMIT 30`,
        [puestoId]
    );
    return rows;
}

// ─── Scoring de atracción de un puesto ────────────────────────────────────────
// Devuelve un nº positivo: cuanto mayor, más probable que un cliente lo elija.
async function calcularScore(puesto) {
    let score = 1.0;

    // 1. Promociones activas → boost (palanca principal del gestor)
    const [[{ promos }]] = await db.query(
        'SELECT COUNT(*) AS promos FROM promociones WHERE puesto_id = ? AND activa = 1',
        [puesto.id]
    );
    score *= 1 + SCORE_PROMO_BOOST * Number(promos);

    // 2. Precio dinámico medio respecto al base (ratio < 1 → atrae más)
    const [[{ ratio }]] = await db.query(
        `SELECT COALESCE(AVG(COALESCE(precio_dinamico, precio) / NULLIF(precio, 0)), 1) AS ratio
         FROM productos WHERE puesto_id = ? AND activo = 1`,
        [puesto.id]
    );
    const r = Number(ratio) || 1;
    score *= Math.max(0.2, SCORE_PRICE_BASE - r);

    // 3. Cola actual → penaliza (la gente real evita esperar)
    const cola = await getCola(puesto.id);
    score /= 1 + SCORE_QUEUE_PENALTY * cola;

    // 4. Materias primas agotadas → menos variedad, menos atractivo
    const [[{ agotadas }]] = await db.query(
        'SELECT COUNT(*) AS agotadas FROM stock_puesto WHERE puesto_id = ? AND stock_actual <= 0',
        [puesto.id]
    );
    if (Number(agotadas) > 0) score *= SCORE_STOCK_VACIO;

    return { score: Math.max(0.01, score), cola };
}

// Selección por ruleta ponderada
function elegirPonderado(scored) {
    const total = scored.reduce((s, p) => s + p.score, 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of scored) {
        r -= p.score;
        if (r <= 0) return p;
    }
    return scored[scored.length - 1];
}

// ─── Llegada de un cliente ────────────────────────────────────────────────────
async function simularCliente() {
    if (paused) return;
    tick++;
    stats.ticksEjecutados++;

    // Refrescar dashboard cada N clientes
    if (tick % DASHBOARD_REFRESH === 1) {
        await recargarPuestos();
        for (const p of puestos) await analizarFactores(p);
        mostrarDashboard();
    }

    // Solo puestos abiertos en este momento (releído de BD: respeta el botón pánico)
    const [puestosAbiertos] = await db.query(
        'SELECT id, nombre, num_empleados FROM puestos WHERE festival_id = ? AND abierto = 1',
        [FESTIVAL_ID]
    );
    if (puestosAbiertos.length === 0) {
        verb('No hay puestos abiertos — cliente no compra');
        return;
    }

    // Score de cada puesto
    const scored = [];
    for (const p of puestosAbiertos) {
        const { score, cola } = await calcularScore(p);
        scored.push({ ...p, score, cola });
    }

    // Elegir destino
    const elegido = elegirPonderado(scored);
    if (!elegido) return;

    // Cliente abandona si la cola es ya inviable
    if (elegido.cola >= COLA_ABANDONO) {
        stats.clientesPerdidos++;
        verb(`Cliente abandona ${elegido.nombre}: cola ${elegido.cola} ≥ ${COLA_ABANDONO}`);
        return;
    }

    // Productos del puesto elegido
    const prods = await getProductos(elegido.id);
    if (prods.length === 0) {
        stats.clientesPerdidos++;
        verb(`Cliente abandona ${elegido.nombre}: sin productos`);
        return;
    }

    const conPromo = prods.filter(p => p.tiene_promo);
    const pool = (conPromo.length > 0 && Math.random() < 0.70) ? conPromo : prods;

    const numItems = randInt(1, Math.min(3, pool.length));
    const seleccion = [...pool].sort(() => Math.random() - 0.5).slice(0, numItems);

    let total = 0;
    const items = seleccion.map(p => {
        const qty = randInt(1, 2);
        const precio = p.precio_promo
            ? Number(p.precio_promo)
            : Number(p.precio_dinamico || p.precio);
        total += precio * qty;
        return { producto_id: p.id, cantidad: qty, precio_unitario: precio, tiene_promo: !!p.tiene_promo };
    });

    if (DRY_RUN) {
        verb(`[DRY] Cliente → ${elegido.nombre}: ${items.length} ítem(s), ${total.toFixed(2)}€ (score=${elegido.score.toFixed(2)})`);
        return;
    }

    const userId = rand(userIds);
    const [res] = await db.query(
        `INSERT INTO pedidos (usuario_id, puesto_id, estado, total, creado_en)
         VALUES (?, ?, 'pendiente', ?, NOW())`,
        [userId, elegido.id, total.toFixed(2)]
    );
    const pedidoId = res.insertId;

    for (const item of items) {
        await db.query(
            'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
            [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
        );
    }
    await descontarMateriaPrima(elegido.id, items);

    stats.pedidosCreados++;
    stats.totalVentas += total;

    const promos = items.filter(i => i.tiene_promo).length;
    log('🛒',
        `Cliente → ${elegido.nombre} #${pedidoId}`,
        `${items.length} ít · ${total.toFixed(2)}€` +
        (promos > 0 ? ` · 🎟️ ${promos}` : '') +
        ` · cola=${elegido.cola} · score=${elegido.score.toFixed(2)}`
    );
}

async function descontarMateriaPrima(puestoId, items) {
    for (const item of items) {
        const [mps] = await db.query(
            `SELECT pm.materia_prima_id, pm.cantidad_por_unidad
       FROM producto_materias_primas pm
       WHERE pm.producto_id = ?`,
            [item.producto_id]
        );
        for (const mp of mps) {
            const consumo = Number(mp.cantidad_por_unidad) * item.cantidad;
            await db.query(
                `UPDATE stock_puesto
         SET stock_actual = GREATEST(stock_actual - ?, 0), actualizado_en = NOW()
         WHERE puesto_id = ? AND materia_prima_id = ?`,
                [consumo, puestoId, mp.materia_prima_id]
            );
        }
    }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       QueueFest Bot Comprador v2  🛒🤖                   ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Controles:                                              ║');
    console.log('║    [ESPACIO]  →  Pausar / Reanudar bot                   ║');
    console.log('║    [Ctrl+C]  →  Detener completamente                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`  Festival ID : ${FESTIVAL_ID}`);
    console.log(`  Velocidad   : ${SPEED}  (un cliente cada ${ARRIVAL_INTERVAL_MS}ms)`);
    console.log(`  Modo        : ${DRY_RUN ? '🧪 DRY RUN' : '💾 ESCRITURA'}`);
    console.log(`  Modelo      : 1 cliente llega → elige puesto (ruleta ponderada) → elige productos`);
    console.log(`  Abandono    : Si la cola del puesto elegido ≥ ${COLA_ABANDONO}, el cliente se va`);
    console.log(`  Estados     : ${ESTADO_FLOW.join(' → ')}  (los avanza kitchen-bot.js)`);
    console.log('');

    // Configurar captura de teclas
    setupKeyboard();

    console.log('🔌  Conectando a la base de datos...');
    await connectDB();
    console.log('✅  Conexión establecida\n');

    // Verificar festival
    const [fests] = await db.query('SELECT id, nombre FROM festivales WHERE id = ?', [FESTIVAL_ID]);
    if (fests.length === 0) {
        console.error(`❌  Festival #${FESTIVAL_ID} no encontrado.`);
        const [todos] = await db.query('SELECT id, nombre FROM festivales ORDER BY id');
        console.log('Festivales disponibles:');
        todos.forEach(f => console.log(`  [${f.id}] ${f.nombre}`));
        process.exit(1);
    }
    log('🎪', `Festival: ${fests[0].nombre}`);

    await ensureUsers();
    await recargarPuestos();

    if (puestos.length === 0) {
        log('⚠️', 'Sin puestos en el festival. Créalos primero en el admin.');
        process.exit(0);
    }
    log('📋', `Puestos: ${puestos.map(p => p.nombre).join(', ')}`);

    // Analizar factores iniciales
    for (const puesto of puestos) {
        await analizarFactores(puesto);
    }
    mostrarDashboard();

    console.log('🚀  Bot iniciado. Pulsa [ESPACIO] para pausar/reanudar.\n');

    // Loop principal: un cliente llega cada ARRIVAL_INTERVAL_MS y decide
    const clientLoop = async () => {
        try {
            await simularCliente();
        } catch (err) {
            log('💥', 'Error simulando cliente', err.message);
        }
        setTimeout(clientLoop, ARRIVAL_INTERVAL_MS);
    };
    clientLoop();
}

process.on('SIGINT', () => {
    console.log('\n\n🛑  Bot detenido.');
    console.log(`📊  Resumen final: ${stats.pedidosCreados} pedidos creados, ${stats.totalVentas.toFixed(2)}€ en ventas, ${stats.clientesPerdidos} clientes perdidos\n`);
    process.exit(0);
});

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
