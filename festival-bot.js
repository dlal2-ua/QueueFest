#!/usr/bin/env node
/**
 * festival-bot.js — Bot comprador para QueueFest
 *
 * Uso:
 *   node festival-bot.js --festival 1
 *   node festival-bot.js --festival 2 --speed fast --verbose
 *
 * Parámetros:
 *   --festival  <id>   ID del festival (obligatorio)
 *   --speed     <mode> slow | normal | fast  (default: normal)
 *   --verbose          Log detallado de cada acción
 *   --dry-run          Solo leer datos, no escribir nada
 *
 * Comportamiento:
 *  - Crea pedidos con productos activos del puesto
 *  - Prefiere productos con promoción activa
 *  - Si la cola del puesto está alta, espera más entre pedidos (sensible a colas)
 *  - Si el puesto está cerrado, no ordena nada
 *  - Las decisiones de precios y promociones las gestiona la app; el bot solo compra
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql2 from 'mysql2/promise';
import fs from 'fs';
import net from 'net';
import { Client } from 'ssh2';

// Cargar .env desde server-backend/ (donde están SSH_PRIVATE_KEY_PATH, etc.)
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

// Umbral de cola: si hay más pedidos pendientes que este número, el bot espera
const COLA_UMBRAL_PAUSE = 8;   // ≥ este número → no compra en ese puesto
const COLA_UMBRAL_SLOW = 4;   // ≥ este número → compra con más pausa
const COLA_SLOW_FACTOR = 2.5; // multiplicador de pausa cuando la cola está alta

// ─── Logging ──────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-ES');
const log = (emoji, msg, detail = '') =>
    console.log(`${ts()}  ${emoji}  ${msg}${detail ? '  →  ' + detail : ''}`);
const verb = (msg) => VERBOSE && console.log(`    ↳ ${msg}`);

// ─── DB connection — siempre via túnel SSH (igual que el backend) ─────────────
const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const tunnelPort = Number(process.env.BOT_TUNNEL_PORT || 12346);
let db;

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

// ─── Estado ───────────────────────────────────────────────────────────────────
let puestos = [];
let userIds = [];
let tick = 0;

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

// ─── Leer cola de un puesto ───────────────────────────────────────────────────
async function getCola(puestoId) {
    const [[{ cola }]] = await db.query(
        `SELECT COUNT(*) AS cola
     FROM pedidos
     WHERE puesto_id = ? AND estado IN ('pendiente','confirmado','preparando')`,
        [puestoId]
    );
    return Number(cola);
}

// ─── Obtener productos disponibles, priorizando los que tienen promo activa ───
async function getProductos(puestoId) {
    // Trae todos los productos activos con su precio y si tienen promo activa
    const [rows] = await db.query(
        `SELECT
       pr.id,
       pr.nombre,
       pr.precio,
       pr.precio_dinamico,
       pr.stock,
       COALESCE(po.precio_promo, NULL) AS precio_promo,
       (po.id IS NOT NULL)             AS tiene_promo
     FROM productos pr
     LEFT JOIN promociones po
       ON po.producto_id = pr.id AND po.activa = 1
     WHERE pr.puesto_id = ? AND pr.activo = 1 AND (pr.stock IS NULL OR pr.stock > 0)
     ORDER BY tiene_promo DESC, pr.id ASC
     LIMIT 30`,
        [puestoId]
    );
    return rows;
}

// ─── Crear un pedido ──────────────────────────────────────────────────────────
async function crearPedido(puesto) {
    // 1. Comprobar cola
    const cola = await getCola(puesto.id);

    if (cola >= COLA_UMBRAL_PAUSE) {
        verb(`[${puesto.nombre}] Cola saturada (${cola} pedidos) — esperando`);
        return { skip: true, delay: 0 };
    }

    // 2. Obtener productos disponibles
    const prods = await getProductos(puesto.id);
    if (prods.length === 0) {
        verb(`[${puesto.nombre}] Sin productos activos`);
        return { skip: true, delay: 0 };
    }

    // 3. Separar promociados de normales y decidir de qué grupo elegir
    const conPromo = prods.filter(p => p.tiene_promo);
    const sinPromo = prods.filter(p => !p.tiene_promo);

    // 70% chance de elegir un producto con promo si hay alguno disponible
    let pool;
    if (conPromo.length > 0 && Math.random() < 0.70) {
        pool = conPromo;
        verb(`[${puesto.nombre}] Eligiendo de ${conPromo.length} producto(s) con promo`);
    } else {
        pool = prods;
    }

    // 4. Seleccionar entre 1 y 3 ítems únicos del pool
    const numItems = randInt(1, Math.min(3, pool.length));
    const seleccion = [...pool].sort(() => Math.random() - 0.5).slice(0, numItems);

    // 5. Calcular total (usa precio_promo si existe, si no precio_dinamico, si no precio)
    let total = 0;
    const items = seleccion.map(p => {
        const qty = randInt(1, 2);
        const precio = p.precio_promo
            ? Number(p.precio_promo)
            : Number(p.precio_dinamico || p.precio);
        total += precio * qty;
        return { producto_id: p.id, cantidad: qty, precio_unitario: precio, tiene_promo: !!p.tiene_promo };
    });

    // 6. Insertar pedido
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

        // Descontar stock de materias primas si existen vínculos
        await descontarMateriaPrima(puesto.id, items);

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

    // Si la cola está en zona "lenta", devuelve una pausa extra
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

// ─── Main loop ─────────────────────────────────────────────────────────────────
async function runTick() {
    tick++;

    // Recargar puestos cada 15 ticks
    if (tick % 15 === 1) await recargarPuestos();

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
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║       QueueFest Bot Comprador  🛒                 ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    console.log(`  Festival ID : ${FESTIVAL_ID}`);
    console.log(`  Velocidad   : ${SPEED}  (tick base: ${BASE_TICK}ms)`);
    console.log(`  Modo        : ${DRY_RUN ? '🧪 DRY RUN' : '💾 ESCRITURA'}`);
    console.log(`  Cola pausa  : ≥ ${COLA_UMBRAL_PAUSE} pedidos pendientes → espera`);
    console.log(`  Cola lento  : ≥ ${COLA_UMBRAL_SLOW} pedidos pendientes → ritmo ×${COLA_SLOW_FACTOR}`);
    console.log('');

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
    console.log('\n🚀  Bot iniciado. Ctrl+C para detener.\n');

    const loop = async () => {
        const extra = await runTick();
        const next = BASE_TICK + extra;
        verb(`Próximo tick en ${next}ms`);
        setTimeout(loop, next);
    };
    loop();
}

process.on('SIGINT', () => { console.log('\n\n🛑  Bot detenido.\n'); process.exit(0); });

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
