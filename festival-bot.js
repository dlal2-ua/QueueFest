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
 *  - Crea pedidos con productos activos del puesto
 *  - Avanza estados de pedidos cada 5 segundos (pendiente→confirmado→preparando→listo→entregado)
 *  - Prefiere productos con promoción activa (70% probabilidad)
 *  - Si la cola del puesto está alta, espera más entre pedidos
 *  - Si el puesto está cerrado, no ordena nada
 *  - Si el stock de materias primas es bajo, lo muestra como factor
 *  - Muestra un dashboard de factores que afectan al bot
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

// Intervalo base en ms entre ticks según velocidad
const BASE_TICK = { slow: 8000, normal: 3500, fast: 1200 }[SPEED] || 3500;
const STATE_TICK = 5000; // Avance de estados cada 5 segundos

// Umbrales de cola
const COLA_UMBRAL_PAUSE = 8;
const COLA_UMBRAL_SLOW = 4;
const COLA_SLOW_FACTOR = 2.5;

// Flujo de estados de pedidos
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
    pedidosAvanzados: 0,
    pedidosEntregados: 0,
    pedidosCancelados: 0,
    totalVentas: 0,
    ticksEjecutados: 0,
    pausas: 0,
};

// Factores que afectan al bot por puesto
let factoresPuesto = new Map();

// ─── DB connection via túnel SSH ──────────────────────────────────────────────
const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const tunnelPort = Number(process.env.BOT_TUNNEL_PORT || 12346);

async function connectDB() {
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
                db = mysql2.createPool({
                    host: '127.0.0.1',
                    port: tunnelPort,
                    user: 'admin',
                    password: 'Proyecto_Seguro2026!',
                    database: 'queuefest',
                    waitForConnections: true,
                    connectionLimit: 5,
                });
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
        'SELECT id, nombre, abierto FROM puestos WHERE festival_id = ?',
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
    if (cola >= COLA_UMBRAL_PAUSE) {
        factores.push({ icono: '🔴', factor: `Cola saturada (${cola})`, efecto: `≥${COLA_UMBRAL_PAUSE} → no compra`, impacto: 'bloqueante' });
    } else if (cola >= COLA_UMBRAL_SLOW) {
        factores.push({ icono: '🟡', factor: `Cola alta (${cola})`, efecto: `Ritmo ×${COLA_SLOW_FACTOR} más lento`, impacto: 'ralentiza' });
    } else {
        factores.push({ icono: '🟢', factor: `Cola normal (${cola})`, efecto: 'Ritmo normal', impacto: 'neutral' });
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
    console.log(`│  📦 Pedidos creados: ${String(stats.pedidosCreados).padEnd(6)} │  ⏩ Avanzados: ${String(stats.pedidosAvanzados).padEnd(6)} │  ✅ Entregados: ${String(stats.pedidosEntregados).padEnd(4)}│`);
    console.log(`│  💰 Ventas totales:  ${String(stats.totalVentas.toFixed(2) + '€').padEnd(6)} │  🔄 Ticks: ${String(stats.ticksEjecutados).padEnd(9)} │  ⏸️  Pausas: ${String(stats.pausas).padEnd(6)}│`);
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

// ─── Crear un pedido ──────────────────────────────────────────────────────────
async function crearPedido(puesto) {
    const cola = await getCola(puesto.id);

    if (cola >= COLA_UMBRAL_PAUSE) {
        verb(`[${puesto.nombre}] Cola saturada (${cola} pedidos) — esperando`);
        return { skip: true, delay: 0 };
    }

    const prods = await getProductos(puesto.id);
    if (prods.length === 0) {
        verb(`[${puesto.nombre}] Sin productos activos`);
        return { skip: true, delay: 0 };
    }

    const conPromo = prods.filter(p => p.tiene_promo);
    let pool;
    if (conPromo.length > 0 && Math.random() < 0.70) {
        pool = conPromo;
        verb(`[${puesto.nombre}] Eligiendo de ${conPromo.length} producto(s) con promo`);
    } else {
        pool = prods;
    }

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

    if (!DRY_RUN) {
        const userId = rand(userIds);
        const [res] = await db.query(
            `INSERT INTO pedidos (usuario_id, puesto_id, estado, total, creado_en)
       VALUES (?, ?, 'pendiente', ?, NOW())`,
            [userId, puesto.id, total.toFixed(2)]
        );
        const pedidoId = res.insertId;

        for (const item of items) {
            await db.query(
                'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
            );
        }

        // Descontar stock de materias primas
        await descontarMateriaPrima(puesto.id, items);

        stats.pedidosCreados++;
        stats.totalVentas += total;

        const promos = items.filter(i => i.tiene_promo).length;
        log(
            '🛒',
            `Pedido #${pedidoId} en ${puesto.nombre}`,
            `${items.length} ítem(s) · ${total.toFixed(2)}€` +
            (promos > 0 ? ` · 🎟️ ${promos} con promo` : '') +
            ` · cola=${cola}`
        );
    } else {
        verb(`[DRY] Pedido en ${puesto.nombre}: ${items.length} ítem(s) · ${total.toFixed(2)}€`);
    }

    return { skip: false, delay: cola >= COLA_UMBRAL_SLOW ? BASE_TICK * (COLA_SLOW_FACTOR - 1) : 0 };
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

// ─── Avanzar estados de pedidos cada 5 segundos ──────────────────────────────
async function avanzarEstados() {
    if (paused || DRY_RUN) return;

    let totalAvanzados = 0;

    // Para cada estado no terminal, avanzar al siguiente
    for (let i = 0; i < ESTADO_FLOW.length - 1; i++) {
        const estadoActual = ESTADO_FLOW[i];
        const estadoSiguiente = ESTADO_FLOW[i + 1];

        // Avanzar los pedidos más antiguos de este estado (máximo 3 por tick para simular realismo)
        const [rows] = await db.query(
            `SELECT id, puesto_id FROM pedidos
             WHERE estado = ? AND puesto_id IN (SELECT id FROM puestos WHERE festival_id = ?)
             ORDER BY creado_en ASC
             LIMIT 4`,
            [estadoActual, FESTIVAL_ID]
        );

        for (const pedido of rows) {
            await db.query(
                'UPDATE pedidos SET estado = ? WHERE id = ?',
                [estadoSiguiente, pedido.id]
            );
            totalAvanzados++;

            if (estadoSiguiente === 'entregado') {
                stats.pedidosEntregados++;
            }

            const emoji = {
                'confirmado': '✅',
                'preparando': '👨‍🍳',
                'listo': '🔔',
                'entregado': '🎉',
            }[estadoSiguiente];

            log(emoji, `Pedido #${pedido.id}`, `${estadoActual} → ${estadoSiguiente}`);
        }
    }

    if (totalAvanzados > 0) {
        stats.pedidosAvanzados += totalAvanzados;
        verb(`${totalAvanzados} pedido(s) avanzados de estado`);
    }
}

// ─── Main loop ─────────────────────────────────────────────────────────────────
async function runTick() {
    if (paused) return 0;

    tick++;
    stats.ticksEjecutados++;

    // Recargar puestos y analizar factores cada 10 ticks
    if (tick % 10 === 1) {
        await recargarPuestos();
        for (const puesto of puestos) {
            await analizarFactores(puesto);
        }
        mostrarDashboard();
    }

    if (puestos.length === 0) {
        log('⚠️', 'No hay puestos en este festival');
        return 0;
    }

    let extraDelay = 0;

    for (const puesto of puestos) {
        if (!puesto.abierto) {
            verb(`[${puesto.nombre}] Cerrado — no se compra`);
            continue;
        }

        try {
            const result = await crearPedido(puesto);
            if (result.delay > 0) extraDelay = Math.max(extraDelay, result.delay);
        } catch (err) {
            log('💥', `Error en ${puesto.nombre}`, err.message);
        }
    }

    return extraDelay;
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
    console.log(`  Velocidad   : ${SPEED}  (tick base: ${BASE_TICK}ms)`);
    console.log(`  Modo        : ${DRY_RUN ? '🧪 DRY RUN' : '💾 ESCRITURA'}`);
    console.log(`  Cola pausa  : ≥ ${COLA_UMBRAL_PAUSE} pedidos pendientes → espera`);
    console.log(`  Cola lento  : ≥ ${COLA_UMBRAL_SLOW} pedidos pendientes → ritmo ×${COLA_SLOW_FACTOR}`);
    console.log(`  Estados     : ${ESTADO_FLOW.join(' → ')}`);
    console.log(`  Avance      : Cada ${STATE_TICK / 1000}s se avanzan estados de pedidos`);
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

    // Loop principal: crear pedidos
    const orderLoop = async () => {
        try {
            const extra = await runTick();
            const next = BASE_TICK + extra;
            verb(`Próximo tick en ${next}ms`);
            setTimeout(orderLoop, next);
        } catch (err) {
            log('💥', 'Error en tick principal', err.message);
            setTimeout(orderLoop, BASE_TICK);
        }
    };

    // Loop secundario: avanzar estados cada 5 segundos
    const stateLoop = async () => {
        try {
            await avanzarEstados();
        } catch (err) {
            log('💥', 'Error avanzando estados', err.message);
        }
        setTimeout(stateLoop, STATE_TICK);
    };

    // Iniciar ambos loops
    orderLoop();
    setTimeout(stateLoop, STATE_TICK); // Primera ejecución tras 5s
}

process.on('SIGINT', () => {
    console.log('\n\n🛑  Bot detenido.');
    console.log(`📊  Resumen final: ${stats.pedidosCreados} pedidos creados, ${stats.pedidosEntregados} entregados, ${stats.totalVentas.toFixed(2)}€ en ventas\n`);
    process.exit(0);
});

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
