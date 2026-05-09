const express = require('express');
const mysql2 = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Client } = require('ssh2');
const net = require('net');
const { createPaymentsModule } = require('./payments');
const {
  getPromotionBundle,
  getReferencePrice,
  resolvePromotionPricing,
  roundCurrency
} = require('./promotions');
require('dotenv').config();

const app = express();
app.use(cors());

const paymentsModule = createPaymentsModule({
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET
});

paymentsModule.registerWebhookRoute(app, () => db);

app.use(express.json());

//Debug temporal
app.get('/debug/uploads-check', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  const exists = fs.existsSync(uploadsPath);
  const files = exists ? fs.readdirSync(uploadsPath).slice(0, 20) : [];
  res.json({ __dirname, uploadsPath, exists, filesCount: files.length, files });
});
app.get('/debug/db-info', async (req, res) => {
  try {
    const [dbName] = await db.query('SELECT DATABASE() as db');
    const [hostInfo] = await db.query('SELECT @@hostname as host, @@port as port');
    const [countPedidos] = await db.query('SELECT COUNT(*) as total FROM pedidos');
    const [maxPedido] = await db.query('SELECT MAX(id) as max_id FROM pedidos');
    res.json({
      database: dbName[0]?.db,
      host: hostInfo[0]?.host,
      port: hostInfo[0]?.port,
      total_pedidos: countPedidos[0]?.total,
      max_pedido_id: maxPedido[0]?.max_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Servir la carpeta de fotos estáticamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
  }
}));
// Configuración de Multer para admitir hasta 5MB y sólo imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

let db; // Será inicializado tras establecer el túnel SSH
// ─── TUNEL SSH PARA BASE DE DATOS LOCAL ───
const sshClient = new Client();
const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const localMysqlForwardPort = Number(process.env.DB_TUNNEL_LOCAL_PORT || 12345);
let privateKey = '';
try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8').replace(/\r\n/g, '\n');
} catch (e) {
  console.error(`WARN: No se pudo leer la llave SSH en la ruta (${privateKeyPath}):`, e.message);
}

sshClient.on('ready', () => {
  console.log('Túnel SSH Listo. Levantando forwarder TCP local...');
  const forwardServer = net.createServer((socket) => {
    sshClient.forwardOut(
      socket.remoteAddress,
      socket.remotePort,
      '10.0.0.5',
      3306,
      (err, stream) => {
        if (err) return socket.end();
        socket.pipe(stream).pipe(socket);
      }
    );
  });

  forwardServer.listen(localMysqlForwardPort, '127.0.0.1', () => {
    console.log(`MySQL Forwarding escuchando en 127.0.0.1:${localMysqlForwardPort}`);
    db = mysql2.createPool({
      host: '127.0.0.1',
      port: localMysqlForwardPort,
      user: 'admin',
      password: 'Proyecto_Seguro2026!',
      database: 'queuefest'
    });

    // Inicializar BD y luego arrancar Express
    initDB().then(() => {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Server Express corriendo localmente en puerto ${port}`);
      });
    });
  });
}).on('error', (err) => {
  console.error('Error del Túnel SSH:', err.message);
});

// Inicia la conexión SSH
if (privateKey) {
  sshClient.connect({
    host: '143.47.35.13',
    port: 22,
    username: 'ubuntu',
    privateKey
  });
}

const JWT_SECRET = 'queuefest_secret_2026';

// ─── PUSH NOTIFICATION SETUP ───
const webpush = require('web-push');

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.warn('WARN: VAPID keys missing. Push will not work.');
} else {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:soporte@queuefest.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const WAIT_ZERO_NOTIFICATION_TYPE = 'espera_cero';
const waitTrackerByPuesto = new Map();
const waitEvaluationLocks = new Map();
const notificationMetrics = {
  generated: 0,
  deduplicated: 0,
  deduplicatedByReason: {},
  skippedByReason: {},
  pushSent: 0,
  pushFailed: 0,
  pushSkipped: 0
};

function incrementReasonCounter(target, reason) {
  target[reason] = (target[reason] || 0) + 1;
}

function metricSkip(reason) {
  incrementReasonCounter(notificationMetrics.skippedByReason, reason);
}

function metricDedup(reason) {
  notificationMetrics.deduplicated += 1;
  incrementReasonCounter(notificationMetrics.deduplicatedByReason, reason);
}

function fallbackWaitZeroMessage(puestoNombre) {
  return `La ${puestoNombre} no tiene espera ahora mismo. Aprovecha para pedir sin cola.`;
}

function parseJsonSafe(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function fetchWaitSnapshotForPuesto(puestoId) {
  const [rows] = await db.query(
    `SELECT
       p.id,
       p.nombre,
       p.tipo AS puesto_tipo,
       p.abierto,
       COALESCE(pe.total, 0) AS pedidos_activos,
       ROUND((COALESCE(pe.total, 0) * p.tiempo_servicio_medio) / GREATEST(p.num_empleados, 1)) AS espera_calculada_min
     FROM puestos p
     LEFT JOIN (
       SELECT puesto_id, COUNT(*) AS total
       FROM pedidos
       WHERE estado NOT IN ('entregado', 'cancelado')
       GROUP BY puesto_id
     ) pe ON pe.puesto_id = p.id
     WHERE p.id = ?
     LIMIT 1`,
    [puestoId]
  );
  return rows[0] || null;
}

async function seedWaitTracker() {
  try {
    const [rows] = await db.query(
      `SELECT
         p.id,
         ROUND((COALESCE(pe.total, 0) * p.tiempo_servicio_medio) / GREATEST(p.num_empleados, 1)) AS espera_calculada_min
       FROM puestos p
       LEFT JOIN (
         SELECT puesto_id, COUNT(*) AS total
         FROM pedidos
         WHERE estado NOT IN ('entregado', 'cancelado')
         GROUP BY puesto_id
       ) pe ON pe.puesto_id = p.id`
    );
    waitTrackerByPuesto.clear();
    rows.forEach((row) => {
      waitTrackerByPuesto.set(Number(row.id), {
        lastWait: Number(row.espera_calculada_min || 0),
        episodeId: null
      });
    });
    console.log('[notifications] wait tracker initialized', { puestos: rows.length });
  } catch (err) {
    console.error('[notifications] wait tracker init failed:', err.message);
  }
}

async function getTopFavoritesByUserForPuesto(puestoId) {
  const [rows] = await db.query(
    `SELECT
       pe.usuario_id,
       pr.id,
       pr.nombre,
       SUM(pi.cantidad) AS cantidad_total,
       MAX(pe.creado_en) AS ultima_compra
     FROM pedidos pe
     INNER JOIN pedido_items pi ON pi.pedido_id = pe.id
     INNER JOIN productos pr ON pr.id = pi.producto_id
     WHERE pe.puesto_id = ? AND pe.estado <> 'cancelado'
     GROUP BY pe.usuario_id, pr.id, pr.nombre
     ORDER BY pe.usuario_id ASC, cantidad_total DESC, ultima_compra DESC, pr.id ASC`,
    [puestoId]
  );

  const favoritesByUser = new Map();
  for (const row of rows) {
    const usuarioId = Number(row.usuario_id);
    if (!usuarioId || favoritesByUser.has(usuarioId)) continue;
    favoritesByUser.set(usuarioId, {
      id: Number(row.id),
      nombre: row.nombre
    });
  }

  return favoritesByUser;
}

async function getAvailableProductsMapForPuesto(puestoId, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) return new Map();

  const [rows] = await db.query(
    `SELECT id, nombre
     FROM productos
     WHERE puesto_id = ? AND activo = 1 AND stock > 0 AND id IN (?)`,
    [puestoId, productIds]
  );

  const availableProductsById = new Map();
  rows.forEach((row) => {
    availableProductsById.set(Number(row.id), {
      id: Number(row.id),
      nombre: row.nombre
    });
  });
  return availableProductsById;
}

async function getPushSubscriptionsByUsers(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return new Map();

  const [rows] = await db.query(
    `SELECT id, usuario_id, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE usuario_id IN (?)`,
    [userIds]
  );

  const subscriptionsByUser = new Map();
  rows.forEach((row) => {
    const usuarioId = Number(row.usuario_id);
    if (!usuarioId) return;
    if (!subscriptionsByUser.has(usuarioId)) {
      subscriptionsByUser.set(usuarioId, []);
    }
    subscriptionsByUser.get(usuarioId).push(row);
  });
  return subscriptionsByUser;
}

function buildWaitZeroDedupKey({ puestoId, episodeId, usuarioId }) {
  return `wait_zero:${puestoId}:${episodeId}:${usuarioId}`;
}

async function insertInAppNotification({
  usuarioId,
  puestoId,
  tipo,
  titulo,
  mensaje,
  payload,
  dedupKey
}) {
  const [result] = await db.query(
    `INSERT IGNORE INTO notificaciones_usuario
       (usuario_id, puesto_id, tipo, titulo, mensaje, leida, payload, dedup_key)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [usuarioId, puestoId, tipo, titulo, mensaje, JSON.stringify(payload || {}), dedupKey || null]
  );

  if (result.affectedRows === 0) {
    metricDedup('duplicate_dedup_key');
    return null;
  }

  return {
    id: result.insertId,
    usuario_id: usuarioId,
    puesto_id: puestoId,
    tipo,
    titulo,
    mensaje
  };
}

async function sendComplementaryPush(usuarioId, notification, preloadedSubscriptions) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    notificationMetrics.pushSkipped += 1;
    metricSkip('push_not_configured');
    return;
  }

  let subs = preloadedSubscriptions;
  if (!subs) {
    const [rows] = await db.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = ?',
      [usuarioId]
    );
    subs = rows;
  }

  if (subs.length === 0) {
    notificationMetrics.pushSkipped += 1;
    metricSkip('user_without_push_subscription');
    return;
  }

  const payload = JSON.stringify({
    title: notification.titulo,
    body: notification.mensaje,
    data: {
      notification_id: notification.id,
      puesto_id: notification.puesto_id,
      tipo: notification.tipo
    }
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        payload
      );
      notificationMetrics.pushSent += 1;
    } catch (err) {
      notificationMetrics.pushFailed += 1;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        try {
          await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        } catch (cleanupErr) {
          console.error('[notifications] push subscription cleanup failed:', cleanupErr.message);
        }
      }
    }
  }
}

async function generateWaitZeroNotifications({
  puestoId,
  puestoNombre,
  puestoTipo,
  previousWait,
  currentWait,
  episodeId,
  source
}) {
  const [users] = await db.query(
    `SELECT DISTINCT usuario_id
     FROM pedidos
     WHERE puesto_id = ? AND estado <> 'cancelado' AND usuario_id IS NOT NULL`,
    [puestoId]
  );

  if (users.length === 0) {
    metricSkip('no_users_with_history_for_puesto');
    return;
  }

  const userIds = users
    .map((row) => Number(row.usuario_id))
    .filter((usuarioId) => Number.isFinite(usuarioId) && usuarioId > 0);

  if (userIds.length === 0) {
    metricSkip('no_valid_users_for_notification');
    return;
  }

  const favoritesByUser = await getTopFavoritesByUserForPuesto(puestoId);
  const favoriteProductIds = [...new Set(
    [...favoritesByUser.values()]
      .map((favorite) => Number(favorite.id))
      .filter((productId) => Number.isFinite(productId) && productId > 0)
  )];
  const availableProductsById = await getAvailableProductsMapForPuesto(puestoId, favoriteProductIds);
  const subscriptionsByUser = await getPushSubscriptionsByUsers(userIds);

  for (const usuarioId of userIds) {
    if (!usuarioId) continue;

    const favorito = favoritesByUser.get(usuarioId) || null;
    const productoDisponible = favorito?.id
      ? availableProductsById.get(Number(favorito.id)) || null
      : null;

    if (favorito?.id) {
      if (!productoDisponible) {
        metricSkip('favorite_not_available_anymore');
      }
    } else {
      metricSkip('user_without_favorite_history');
    }

    const titulo = productoDisponible
      ? `${puestoNombre} sin espera: ${productoDisponible.nombre}`
      : `${puestoNombre} sin espera ahora`;
    const mensaje = productoDisponible
      ? `${puestoNombre} no tiene espera ahora mismo. Tu favorito ${productoDisponible.nombre} esta disponible.`
      : fallbackWaitZeroMessage(puestoNombre);

    const payload = {
      episode_id: episodeId,
      trigger: 'wait_zero',
      source,
      wait_before: previousWait,
      wait_after: currentWait,
      favorite_product_id: favorito?.id || null,
      mentioned_product_id: productoDisponible?.id || null,
      puesto_tipo: puestoTipo || null,
      triggered_at: new Date().toISOString()
    };

    const notification = await insertInAppNotification({
      usuarioId,
      puestoId,
      tipo: WAIT_ZERO_NOTIFICATION_TYPE,
      titulo,
      mensaje,
      payload,
      dedupKey: buildWaitZeroDedupKey({ puestoId, episodeId, usuarioId })
    });

    if (!notification) continue;

    notificationMetrics.generated += 1;
    await sendComplementaryPush(usuarioId, notification, subscriptionsByUser.get(usuarioId) || []);
  }

  console.log('[notifications] wait-zero summary', {
    puestoId,
    episodeId,
    generated: notificationMetrics.generated,
    deduplicated: notificationMetrics.deduplicated,
    skippedByReason: notificationMetrics.skippedByReason,
    deduplicatedByReason: notificationMetrics.deduplicatedByReason,
    pushSent: notificationMetrics.pushSent,
    pushFailed: notificationMetrics.pushFailed,
    pushSkipped: notificationMetrics.pushSkipped
  });
}

async function runEvaluateWaitZeroTriggerForPuesto(puestoId, source) {
  try {
    const snapshot = await fetchWaitSnapshotForPuesto(puestoId);
    if (!snapshot) return;

    const normalizedPuestoId = Number(snapshot.id);
    const currentWait = Number(snapshot.espera_calculada_min || 0);
    const isOpen = Number(snapshot.abierto) === 1 || snapshot.abierto === true;
    const previousState = waitTrackerByPuesto.get(normalizedPuestoId);

    if (!previousState) {
      waitTrackerByPuesto.set(normalizedPuestoId, {
        lastWait: currentWait,
        episodeId: null
      });
      return;
    }

    const previousWait = Number(previousState.lastWait || 0);

    if (!isOpen) {
      waitTrackerByPuesto.set(normalizedPuestoId, {
        lastWait: currentWait,
        episodeId: null
      });
      metricSkip('puesto_closed_no_notification');
      return;
    }

    if (previousWait > 0 && currentWait === 0) {
      const episodeId = `${normalizedPuestoId}-${Date.now()}`;
      waitTrackerByPuesto.set(normalizedPuestoId, {
        lastWait: currentWait,
        episodeId
      });
      await generateWaitZeroNotifications({
        puestoId: normalizedPuestoId,
        puestoNombre: snapshot.nombre,
        puestoTipo: snapshot.puesto_tipo,
        previousWait,
        currentWait,
        episodeId,
        source
      });
      return;
    }

    if (previousWait === 0 && currentWait > 0) {
      waitTrackerByPuesto.set(normalizedPuestoId, {
        lastWait: currentWait,
        episodeId: null
      });
      metricSkip('episode_reset_wait_rose_above_zero');
      return;
    }

    waitTrackerByPuesto.set(normalizedPuestoId, {
      lastWait: currentWait,
      episodeId: previousState.episodeId || null
    });
  } catch (err) {
    console.error('[notifications] wait-zero trigger failed:', err.message);
  }
}

async function evaluateWaitZeroTriggerForPuesto(puestoId, source) {
  const normalizedPuestoId = Number(puestoId);
  if (!normalizedPuestoId) return;

  const previousLock = waitEvaluationLocks.get(normalizedPuestoId) || Promise.resolve();
  const nextLock = previousLock
    .catch(() => { })
    .then(() => runEvaluateWaitZeroTriggerForPuesto(normalizedPuestoId, source))
    .finally(() => {
      if (waitEvaluationLocks.get(normalizedPuestoId) === nextLock) {
        waitEvaluationLocks.delete(normalizedPuestoId);
      }
    });

  waitEvaluationLocks.set(normalizedPuestoId, nextLock);
  await nextLock;
}

async function doesColumnExist(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function doesIndexExist(tableName, indexName) {
  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

const DEFAULT_LOYALTY_TIER_THRESHOLDS = {
  vip: 10000,
  headliner: 25000,
  backstage: 50000
};

const DEFAULT_REVIEW_POINTS = {
  resena_base: 50,
  comentario_texto: 20,
  estrellas_servicio: 20,
  valoracion_producto: 20
};

function normalizeLoyaltyTierThresholds(input = {}) {
  const vip = Math.max(1000, Number(input.vip ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.vip) || DEFAULT_LOYALTY_TIER_THRESHOLDS.vip);
  const headliner = Math.max(
    vip + 1000,
    Number(input.headliner ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.headliner) || DEFAULT_LOYALTY_TIER_THRESHOLDS.headliner
  );
  const backstage = Math.max(
    headliner + 1000,
    Number(input.backstage ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.backstage) || DEFAULT_LOYALTY_TIER_THRESHOLDS.backstage
  );

  return { vip, headliner, backstage };
}

async function ensureParametrosSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS parametros (
      id INT NOT NULL DEFAULT 1,
      umbral_cola INT NOT NULL DEFAULT 5,
      umbral_ventas_bajas INT NOT NULL DEFAULT 3,
      porcentaje_subida DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      porcentaje_bajada DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      pricing_dinamico_activo TINYINT(1) NOT NULL DEFAULT 1,
      promociones_activas TINYINT(1) NOT NULL DEFAULT 1,
      stock_minimo INT NOT NULL DEFAULT 10,
      loyalty_vip_threshold INT NOT NULL DEFAULT 10000,
      loyalty_headliner_threshold INT NOT NULL DEFAULT 25000,
      loyalty_backstage_threshold INT NOT NULL DEFAULT 50000,
      PRIMARY KEY (id)
    )
  `);

  if (!(await doesColumnExist('parametros', 'stock_minimo'))) {
    await db.query('ALTER TABLE parametros ADD COLUMN stock_minimo INT NOT NULL DEFAULT 10');
  }

  if (!(await doesColumnExist('parametros', 'loyalty_vip_threshold'))) {
    await db.query(`ALTER TABLE parametros ADD COLUMN loyalty_vip_threshold INT NOT NULL DEFAULT ${DEFAULT_LOYALTY_TIER_THRESHOLDS.vip}`);
  }

  if (!(await doesColumnExist('parametros', 'loyalty_headliner_threshold'))) {
    await db.query(`ALTER TABLE parametros ADD COLUMN loyalty_headliner_threshold INT NOT NULL DEFAULT ${DEFAULT_LOYALTY_TIER_THRESHOLDS.headliner}`);
  }

  if (!(await doesColumnExist('parametros', 'loyalty_backstage_threshold'))) {
    await db.query(`ALTER TABLE parametros ADD COLUMN loyalty_backstage_threshold INT NOT NULL DEFAULT ${DEFAULT_LOYALTY_TIER_THRESHOLDS.backstage}`);
  }

  await db.query(
    `INSERT INTO parametros (
      id,
      pricing_dinamico_activo,
      umbral_cola,
      porcentaje_subida,
      promociones_activas,
      stock_minimo,
      loyalty_vip_threshold,
      loyalty_headliner_threshold,
      loyalty_backstage_threshold
    )
     VALUES (1, 1, 5, 10.00, 1, 10, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      DEFAULT_LOYALTY_TIER_THRESHOLDS.vip,
      DEFAULT_LOYALTY_TIER_THRESHOLDS.headliner,
      DEFAULT_LOYALTY_TIER_THRESHOLDS.backstage
    ]
  );
}

async function ensureReviewsTableSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS resenas (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      pedido_id INT NOT NULL UNIQUE,
      usuario_id INT NOT NULL,
      puesto_id INT NOT NULL,
      estrellas_general TINYINT NOT NULL,
      comentario TEXT NULL,
      estrellas_servicio TINYINT NULL,
      estrellas_personal TINYINT NULL,
      estrellas_rapidez TINYINT NULL,
      puntos_sumados INT NOT NULL DEFAULT 0,
      ia_procesado TINYINT(1) NOT NULL DEFAULT 0,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE CASCADE,
      INDEX idx_resenas_puesto (puesto_id),
      INDEX idx_resenas_usuario (usuario_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS resenas_productos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      resena_id INT NOT NULL,
      producto_id INT NOT NULL,
      estrellas TINYINT NOT NULL,
      comentario TEXT NULL,
      origen ENUM('manual','ia') NOT NULL DEFAULT 'manual',
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_resena_producto (resena_id, producto_id),
      FOREIGN KEY (resena_id) REFERENCES resenas(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      INDEX idx_rp_producto (producto_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS resena_puntos_config (
      accion VARCHAR(50) NOT NULL PRIMARY KEY,
      puntos INT NOT NULL DEFAULT 0,
      descripcion VARCHAR(255) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1
    )
  `);

  await db.query(
    `INSERT INTO resena_puntos_config (accion, puntos, descripcion, activo) VALUES
      ('resena_base', ?, 'Por crear una resena con al menos estrellas_general', 1),
      ('comentario_texto', ?, 'Por anadir comentario de texto de al menos 10 caracteres', 1),
      ('estrellas_servicio', ?, 'Por valorar servicio, personal y rapidez', 1),
      ('valoracion_producto', ?, 'Por cada producto valorado manualmente dentro del maximo global de 5 acciones extra', 1)
     ON DUPLICATE KEY UPDATE
      puntos = VALUES(puntos),
      descripcion = VALUES(descripcion),
      activo = VALUES(activo)`,
    [
      DEFAULT_REVIEW_POINTS.resena_base,
      DEFAULT_REVIEW_POINTS.comentario_texto,
      DEFAULT_REVIEW_POINTS.estrellas_servicio,
      DEFAULT_REVIEW_POINTS.valoracion_producto
    ]
  );
}

function isValidStars(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 5;
}

function normalizeOptionalComment(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

async function getReviewPointsConfig(conn = db) {
  const [rows] = await conn.query(
    `SELECT accion, puntos
     FROM resena_puntos_config
     WHERE activo = 1
       AND accion IN ('resena_base', 'comentario_texto', 'estrellas_servicio', 'valoracion_producto')`
  );

  return rows.reduce((acc, row) => {
    acc[row.accion] = Number(row.puntos) || 0;
    return acc;
  }, { ...DEFAULT_REVIEW_POINTS });
}

async function ensureNotificationsTableSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notificaciones_usuario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      puesto_id INT NULL,
      tipo VARCHAR(64) NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      mensaje TEXT NOT NULL,
      leida TINYINT(1) NOT NULL DEFAULT 0,
      payload JSON NULL,
      dedup_key VARCHAR(255) NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE SET NULL,
      INDEX idx_notif_usuario_id (usuario_id, id)
    )
  `);

  if (!(await doesColumnExist('notificaciones_usuario', 'dedup_key'))) {
    await db.query('ALTER TABLE notificaciones_usuario ADD COLUMN dedup_key VARCHAR(255) NULL');
  }

  if (!(await doesIndexExist('notificaciones_usuario', 'idx_notif_usuario_leida_id'))) {
    await db.query('ALTER TABLE notificaciones_usuario ADD INDEX idx_notif_usuario_leida_id (usuario_id, leida, id)');
  }

  if (!(await doesIndexExist('notificaciones_usuario', 'uq_notif_dedup'))) {
    await db.query('ALTER TABLE notificaciones_usuario ADD UNIQUE KEY uq_notif_dedup (usuario_id, tipo, dedup_key)');
  }
}

async function ensurePromotionsTableSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS promociones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      puesto_id INT NOT NULL,
      producto_id INT NULL,
      titulo VARCHAR(255) NOT NULL,
      descripcion TEXT NULL,
      precio_promo DECIMAL(10,2) NOT NULL,
      tipo VARCHAR(40) NOT NULL DEFAULT 'precio_fijo',
      valor_descuento DECIMAL(10,2) NULL,
      activa TINYINT(1) DEFAULT 1,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_promociones_puesto_activa (puesto_id, activa),
      INDEX idx_promociones_producto (producto_id)
    )
  `);

  if (!(await doesColumnExist('promociones', 'producto_id'))) {
    await db.query('ALTER TABLE promociones ADD COLUMN producto_id INT NULL AFTER puesto_id');
  }

  if (!(await doesColumnExist('promociones', 'actualizado_en'))) {
    await db.query('ALTER TABLE promociones ADD COLUMN actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en');
  }

  if (!(await doesColumnExist('promociones', 'tipo'))) {
    await db.query("ALTER TABLE promociones ADD COLUMN tipo VARCHAR(40) NOT NULL DEFAULT 'precio_fijo' AFTER precio_promo");
  }

  if (!(await doesColumnExist('promociones', 'valor_descuento'))) {
    await db.query('ALTER TABLE promociones ADD COLUMN valor_descuento DECIMAL(10,2) NULL AFTER tipo');
  }

  if (!(await doesIndexExist('promociones', 'idx_promociones_puesto_activa'))) {
    await db.query('ALTER TABLE promociones ADD INDEX idx_promociones_puesto_activa (puesto_id, activa)');
  }

  if (!(await doesIndexExist('promociones', 'idx_promociones_producto'))) {
    await db.query('ALTER TABLE promociones ADD INDEX idx_promociones_producto (producto_id)');
  }

  // Backfill seguro: solo enlaza promociones antiguas cuando el puesto tiene un unico producto activo.
  await db.query(`
    UPDATE promociones pr
    INNER JOIN (
      SELECT puesto_id, MIN(id) AS producto_id
      FROM productos
      WHERE activo = 1
      GROUP BY puesto_id
      HAVING COUNT(*) = 1
    ) unico_producto ON unico_producto.puesto_id = pr.puesto_id
    SET pr.producto_id = unico_producto.producto_id
    WHERE pr.producto_id IS NULL
  `);

  await db.query(`
    UPDATE promociones
    SET tipo = 'precio_fijo'
    WHERE tipo IS NULL OR TRIM(tipo) = ''
  `);
}

function mapPromotionRow(row) {
  const mappedRow = {
    ...row,
    puesto_id: Number(row.puesto_id),
    producto_id: row.producto_id == null ? null : Number(row.producto_id),
    precio_promo: Number(row.precio_promo),
    valor_descuento: row.valor_descuento == null ? null : Number(row.valor_descuento),
    producto_precio: row.producto_precio == null ? null : Number(row.producto_precio),
    producto_precio_dinamico: row.producto_precio_dinamico == null ? null : Number(row.producto_precio_dinamico),
    activa: Boolean(row.activa),
    producto_activo: row.producto_activo == null ? null : Boolean(row.producto_activo)
  };

  try {
    const resolvedPromotion = resolvePromotionPricing({
      type: row.tipo,
      referencePrice: getReferencePrice({
        precio: row.producto_precio,
        precio_dinamico: row.producto_precio_dinamico
      }),
      fixedPrice: row.precio_promo,
      discountValue: row.valor_descuento
    });
    const bundle = getPromotionBundle(resolvedPromotion.tipo);

    mappedRow.tipo = resolvedPromotion.tipo;
    mappedRow.valor_descuento = resolvedPromotion.valor_descuento;
    mappedRow.precio_promo = resolvedPromotion.precio_total_promocion;
    mappedRow.cantidad_promocion = bundle.unitsPerApplication;
    mappedRow.cantidad_cobrada = bundle.paidUnitsPerApplication;
  } catch {
    const bundle = getPromotionBundle(row.tipo);
    mappedRow.tipo = row.tipo || 'precio_fijo';
    mappedRow.cantidad_promocion = bundle.unitsPerApplication;
    mappedRow.cantidad_cobrada = bundle.paidUnitsPerApplication;
  }

  return mappedRow;
}

async function getPromotionById(promotionId) {
  const [rows] = await db.query(
    `SELECT
       pr.id,
       pr.puesto_id,
       pr.producto_id,
       pr.titulo,
       pr.descripcion,
       pr.precio_promo,
       pr.tipo,
       pr.valor_descuento,
       pr.activa,
       pr.creado_en,
       pr.actualizado_en,
       pu.nombre AS puesto_nombre,
       pu.tipo AS puesto_tipo,
       pu.festival_id,
       prod.nombre AS producto_nombre,
       prod.precio AS producto_precio,
       prod.precio_dinamico AS producto_precio_dinamico,
       prod.activo AS producto_activo
     FROM promociones pr
     INNER JOIN puestos pu ON pu.id = pr.puesto_id
     LEFT JOIN productos prod ON prod.id = pr.producto_id
     WHERE pr.id = ?
     LIMIT 1`,
    [Number(promotionId)]
  );

  return rows[0] ? mapPromotionRow(rows[0]) : null;
}

async function listPromotions({ puestoId, festivalId, includeInactive = false, onlyPurchasable = false } = {}) {
  const where = [];
  const params = [];

  if (puestoId) {
    where.push('pr.puesto_id = ?');
    params.push(Number(puestoId));
  }

  if (festivalId) {
    where.push('pu.festival_id = ?');
    params.push(Number(festivalId));
  }

  if (!includeInactive) {
    where.push('pr.activa = 1');
  }

  if (onlyPurchasable) {
    where.push('pr.producto_id IS NOT NULL');
    where.push('prod.id IS NOT NULL');
    where.push('prod.activo = 1');
  }

  const [rows] = await db.query(
    `SELECT
       pr.id,
       pr.puesto_id,
       pr.producto_id,
       pr.titulo,
       pr.descripcion,
       pr.precio_promo,
       pr.tipo,
       pr.valor_descuento,
       pr.activa,
       pr.creado_en,
       pr.actualizado_en,
       pu.nombre AS puesto_nombre,
       pu.tipo AS puesto_tipo,
       pu.festival_id,
       prod.nombre AS producto_nombre,
       prod.precio AS producto_precio,
       prod.precio_dinamico AS producto_precio_dinamico,
       prod.activo AS producto_activo
     FROM promociones pr
     INNER JOIN puestos pu ON pu.id = pr.puesto_id
     LEFT JOIN productos prod ON prod.id = pr.producto_id
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY pr.creado_en DESC, pr.id DESC`,
    params
  );

  return rows.map(mapPromotionRow);
}

async function validatePromotionPayload({ puestoId, productoId, titulo, descripcion, precioPromo, tipo, valorDescuento }) {
  const normalizedPuestoId = Number(puestoId);
  const normalizedProductoId = Number(productoId);
  const normalizedTitle = String(titulo || '').trim();
  const normalizedDescription = descripcion == null ? null : String(descripcion).trim();

  if (!Number.isInteger(normalizedPuestoId) || normalizedPuestoId <= 0) {
    throw new Error('puesto_id invalido');
  }

  if (!Number.isInteger(normalizedProductoId) || normalizedProductoId <= 0) {
    throw new Error('producto_id invalido');
  }

  if (!normalizedTitle) {
    throw new Error('titulo requerido');
  }

  const [puestos] = await db.query(
    'SELECT id, festival_id, nombre FROM puestos WHERE id = ? LIMIT 1',
    [normalizedPuestoId]
  );

  if (puestos.length === 0) {
    throw new Error('El puesto indicado no existe');
  }

  const [productos] = await db.query(
    'SELECT id, puesto_id, nombre, precio, precio_dinamico, activo FROM productos WHERE id = ? LIMIT 1',
    [normalizedProductoId]
  );

  if (productos.length === 0) {
    throw new Error('El producto indicado no existe');
  }

  const producto = productos[0];
  if (Number(producto.puesto_id) !== normalizedPuestoId) {
    throw new Error('El producto debe pertenecer al puesto seleccionado');
  }

  if (!producto.activo) {
    throw new Error('El producto seleccionado no esta activo');
  }

  const precioReferencia = Number(producto.precio_dinamico) > 0
    ? Number(producto.precio_dinamico)
    : Number(producto.precio);
  const resolvedPromotion = resolvePromotionPricing({
    type: tipo,
    referencePrice: precioReferencia,
    fixedPrice: precioPromo,
    discountValue: valorDescuento
  });

  return {
    puesto: puestos[0],
    producto,
    values: {
      puesto_id: normalizedPuestoId,
      producto_id: normalizedProductoId,
      titulo: normalizedTitle,
      descripcion: normalizedDescription || null,
      precio_promo: roundCurrency(resolvedPromotion.precio_promo),
      tipo: resolvedPromotion.tipo,
      valor_descuento: resolvedPromotion.valor_descuento
    }
  };
}

// Asegurar que las tablas existen al arrancar
async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        endpoint VARCHAR(512) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uq_endpoint (endpoint(255))
      )
    `);
    console.log('SQL Migration push_subscriptions checked.');

    await ensureNotificationsTableSchema();
    console.log('SQL Migration notificaciones_usuario checked.');

    await ensurePromotionsTableSchema();
    console.log('SQL Migration promociones checked.');

    await ensureParametrosSchema();
    console.log('SQL Migration parametros checked.');

    await ensureReviewsTableSchema();
    console.log('SQL Migration resenas checked.');

    await paymentsModule.initDb(db);
  } catch (err) {
    console.error('DB Init Failed:', err);
  }

  // Configuración del gestor (modo auto/manual) por festival
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS gestor_config (
        festival_id INT NOT NULL,
        modo_auto TINYINT(1) DEFAULT 1,
        PRIMARY KEY (festival_id),
        FOREIGN KEY (festival_id) REFERENCES festivales(id) ON DELETE CASCADE
      )
    `);
    console.log('SQL Migration gestor_config checked.');
  } catch (err) {
    console.error('DB Init gestor_config Failed:', err);
  }

  await seedWaitTracker();
}

// Middleware para verificar tokenn
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return res.status(403).json({ error: 'No tienes permisos para esta accion' });
  }
  next();
};

paymentsModule.registerRoutes(app, auth, () => db);

// ==================== AUTH ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT u.*, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.email = ?',
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, nombre } = req.body;
  const conn = await db.getConnection();
  try {
    const hash = await bcrypt.hash(password, 10);
    await conn.beginTransaction();
    const [userResult] = await conn.query(
      'INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, 4)',
      [email, hash, nombre]
    );
    const userId = userResult.insertId;

    const [loyaltyResult] = await conn.query(
      `INSERT INTO loyalty
        (usuario_id, puntos_total, puntos_pendientes, puntos_ganados_total, puntos_canjeados_total, nivel, activo, ultimo_movimiento_en)
       VALUES (?, 1000, 0, 1000, 0, 'fan', 1, CURRENT_TIMESTAMP)`,
      [userId]
    );

    await conn.query(
      `INSERT INTO loyalty_movimientos
        (loyalty_id, pedido_id, tipo, origen, puntos, saldo_resultante, estado, descripcion, confirmado_en)
       VALUES (?, NULL, 'bonus', 'sistema', 1000, 1000, 'confirmado', 'Bonus de bienvenida', CURRENT_TIMESTAMP)`,
      [loyaltyResult.insertId]
    );

    await conn.commit();
    res.json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Endpoint para obtener perfil del usuario autenticado
app.get('/api/perfil', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT u.*, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para actualizar perfil de usuario (requiere autenticación)
app.patch('/api/perfil', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      alias,
      telefono,
      fecha_nacimiento,
      ciudad,
      idioma_preferido,
      festival_favorito,
      preferencias_dieteticas,
      alergias,
      notificaciones_push,
      notificaciones_email,
      acepta_marketing,
      avatar_url
    } = req.body;

    // Construir query dinámicamente solo con los campos proporcionados
    const updates = [];
    const values = [];

    if (alias !== undefined) {
      updates.push('alias = ?');
      values.push(alias);
    }
    if (telefono !== undefined) {
      updates.push('telefono = ?');
      values.push(telefono);
    }
    if (fecha_nacimiento !== undefined) {
      updates.push('fecha_nacimiento = ?');
      values.push(fecha_nacimiento === '' ? null : fecha_nacimiento);
    }
    if (ciudad !== undefined) {
      updates.push('ciudad = ?');
      values.push(ciudad);
    }
    if (idioma_preferido !== undefined) {
      updates.push('idioma_preferido = ?');
      values.push(idioma_preferido);
    }
    if (festival_favorito !== undefined) {
      updates.push('festival_favorito = ?');
      values.push(festival_favorito);
    }
    if (preferencias_dieteticas !== undefined) {
      updates.push('preferencias_dieteticas = ?');
      values.push(preferencias_dieteticas);
    }
    if (alergias !== undefined) {
      updates.push('alergias = ?');
      values.push(alergias);
    }
    if (notificaciones_push !== undefined) {
      updates.push('notificaciones_push = ?');
      values.push(notificaciones_push ? 1 : 0);
    }
    if (notificaciones_email !== undefined) {
      updates.push('notificaciones_email = ?');
      values.push(notificaciones_email ? 1 : 0);
    }
    if (acepta_marketing !== undefined) {
      updates.push('acepta_marketing = ?');
      values.push(acepta_marketing ? 1 : 0);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }

    // Si no hay campos para actualizar, devolver error
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    // Añadir userId al final de los valores
    values.push(userId);

    // Ejecutar la actualización
    const query = `UPDATE usuarios SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`;
    await db.query(query, values);

    // Obtener los datos actualizados del usuario
    const [rows] = await db.query(
      'SELECT u.*, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar password_hash antes de enviar
    const user = rows[0];
    delete user.password_hash;

    res.json({ message: 'Perfil actualizado correctamente', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUESTOS ====================

app.get('/api/puestos/esperas', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id,
             ROUND((COALESCE(pe.total, 0) * p.tiempo_servicio_medio) / GREATEST(p.num_empleados, 1)) AS espera_calculada_min
      FROM puestos p
      LEFT JOIN (
          SELECT puesto_id, COUNT(*) as total
          FROM pedidos
          WHERE estado NOT IN ('entregado', 'cancelado')
          GROUP BY puesto_id
      ) pe ON p.id = pe.puesto_id
      WHERE p.abierto = true
    `);
    const result = {};
    rows.forEach(r => {
      result[r.id] = Number(r.espera_calculada_min || 0);
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/puestos', async (req, res) => {
  try {
    const { festival_id, tipo } = req.query;

    let query = `
      SELECT p.*,
             ROUND((COALESCE(pe.total, 0) * p.tiempo_servicio_medio) / GREATEST(p.num_empleados, 1)) AS espera_calculada_min
      FROM puestos p
      LEFT JOIN (
          SELECT puesto_id, COUNT(*) as total
          FROM pedidos
          WHERE estado NOT IN ('entregado', 'cancelado')
          GROUP BY puesto_id
      ) pe ON p.id = pe.puesto_id
      WHERE p.abierto = true
    `;
    const params = [];

    if (festival_id) {
      // Usaremos HAVING si filtramos por agregados, pero aquí es un campo de la tabla p
      query += ' AND p.festival_id = ?';
      params.push(Number(festival_id));
    }

    if (tipo) {
      query += ' AND p.tipo = ?';
      params.push(tipo); // 'barra' o 'foodtruck'
    }

    const [rows] = await db.query(query, params);

    // Para simplificar al frontend, si no existe map, lo usamos como fallback
    const result = rows.map(r => ({
      ...r,
      tiempo_servicio_medio: Number(r.espera_calculada_min || 0) > 0 ? Number(r.espera_calculada_min) : r.tiempo_servicio_medio
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/puestos/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*,
             ROUND((COALESCE(pe.total, 0) * p.tiempo_servicio_medio) / GREATEST(p.num_empleados, 1)) AS espera_calculada_min
      FROM puestos p
      LEFT JOIN (
          SELECT puesto_id, COUNT(*) as total
          FROM pedidos
          WHERE estado NOT IN ('entregado', 'cancelado')
          GROUP BY puesto_id
      ) pe ON p.id = pe.puesto_id
      WHERE p.id = ?
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Puesto no encontrado' });

    const puesto = rows[0];
    puesto.tiempo_servicio_medio = Number(puesto.espera_calculada_min || 0) > 0 ? Number(puesto.espera_calculada_min) : puesto.tiempo_servicio_medio;

    res.json(puesto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODIFICADO: acepta ?festival_id=X para filtrar por festival (AdminScreen lo usa)
// Sin parámetro devuelve todos, igual que antes → retrocompatible
app.get('/api/admin/puestos', auth, async (req, res) => {
  try {
    const { festival_id } = req.query;

    let query = 'SELECT * FROM puestos';
    const params = [];

    if (festival_id) {
      query += ' WHERE festival_id = ?';
      params.push(Number(festival_id));
    }

    query += ' ORDER BY nombre ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/puestos', auth, async (req, res) => {
  const { festival_id, nombre, tipo, capacidad_max, num_empleados } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO puestos (festival_id, nombre, tipo, capacidad_max, num_empleados) VALUES (?, ?, ?, ?, ?)',
      [festival_id, nombre, tipo, capacidad_max, num_empleados]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/puestos/:id', auth, async (req, res) => {
  const { nombre, tipo, capacidad_max, num_empleados, abierto } = req.body;
  try {
    await db.query(
      'UPDATE puestos SET nombre = ?, tipo = ?, capacidad_max = ?, num_empleados = ?, abierto = ? WHERE id = ?',
      [nombre, tipo, capacidad_max, num_empleados, abierto, req.params.id]
    );
    await evaluateWaitZeroTriggerForPuesto(Number(req.params.id), 'admin_update_puesto');
    res.json({ message: 'Puesto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Foto Upload para Puesto
app.post('/api/admin/puestos/:id/foto', auth, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta imagen' });
  const foto_url = '/uploads/' + req.file.filename;
  try {
    await db.query('UPDATE puestos SET foto_url = ? WHERE id = ?', [foto_url, req.params.id]);
    res.json({ foto_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/puestos/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM puestos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Puesto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== PRODUCTOSss =====================

app.get('/api/puestos/:id/productos', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM productos WHERE puesto_id = ? AND activo = true',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/productos', auth, async (req, res) => {
  try {
    const { puesto_id } = req.query;
    let query = 'SELECT * FROM productos';
    const params = [];
    if (puesto_id) {
      query += ' WHERE puesto_id = ?';
      params.push(Number(puesto_id));
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/productos', auth, async (req, res) => {
  const { puesto_id, nombre, descripcion, precio, precio_dinamico, stock } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO productos (puesto_id, nombre, descripcion, precio, precio_dinamico, stock) VALUES (?, ?, ?, ?, ?, ?)',
      [puesto_id, nombre, descripcion, precio, precio_dinamico || 0, stock]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/productos/:id', auth, async (req, res) => {
  const { nombre, descripcion, precio, precio_dinamico, stock, activo } = req.body;
  try {
    await db.query(
      'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, precio_dinamico = ?, stock = ?, activo = ? WHERE id = ?',
      [nombre, descripcion, precio, precio_dinamico, stock, activo, req.params.id]
    );
    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Foto Upload para Producto
app.post('/api/admin/productos/:id/foto', auth, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta imagen' });
  const foto_url = '/uploads/' + req.file.filename;
  try {
    await db.query('UPDATE productos SET foto_url = ? WHERE id = ?', [foto_url, req.params.id]);
    res.json({ foto_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/productos/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PEDIDOS ====================

const VALID_TRANSITIONS = {
  'pendiente': ['confirmado', 'cancelado'],
  'confirmado': ['preparando', 'cancelado'],
  'preparando': ['listo', 'cancelado'],
  'listo': ['entregado', 'cancelado'],
  'entregado': [],
  'cancelado': [],
};

// Historial del usuario
app.get('/api/pedidos/mis-pedidos', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT p.*, pu.nombre as puesto_nombre FROM pedidos p JOIN puestos pu ON p.puesto_id = pu.id WHERE p.usuario_id = ? ORDER BY p.creado_en DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pedidos/:id', auth, async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const usuarioId = req.user.id;

    // 1. Obtener pedido junto con información del puesto y del usuario
    const [pedidos] = await db.query(`
      SELECT p.*, pu.nombre AS puesto_nombre, pu.tiempo_servicio_medio, u.nombre AS usuario_nombre
      FROM pedidos p
      JOIN puestos pu ON p.puesto_id = pu.id
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.id = ?
    `, [pedidoId]);

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];

    // Validar permisos de lectura (Seguridad)
    if (req.user.rol === 'usuario' && pedido.usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este pedido' });
    } else if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [pedido.puesto_id, usuarioId]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para ver los pedidos de este puesto' });
      }
    }

    // 2. Obtener items del pedido
    const [items] = await db.query(`
      SELECT
        pi.*,
        pr.nombre AS producto_nombre,
        promo.titulo AS promocion_titulo,
        promo.tipo AS promocion_tipo,
        COALESCE(promo.titulo, pr.nombre) AS item_nombre
      FROM pedido_items pi
      JOIN productos pr ON pi.producto_id = pr.id
      LEFT JOIN promociones promo ON pi.promocion_id = promo.id
      WHERE pi.pedido_id = ?
    `, [pedidoId]);

    pedido.items = items;
    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
app.post('/api/pedidos', auth, async (req, res) => {
  const { puesto_id, items, total } = req.body;
  const conn = await db.getConnection();
  try {
    // ═══ VEND-004: Comprobación Botón Pánico ═══
    const [puestoCheck] = await conn.query('SELECT abierto FROM puestos WHERE id = ?', [puesto_id]);
    if (puestoCheck.length > 0 && puestoCheck[0].abierto === 0) {
      conn.release();
      return res.status(429).json({ error: 'Cocina saturada temporalmente, inténtalo en unos minutos' });
    }
    // ═══ FIN VEND-004 ═══

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO pedidos (usuario_id, puesto_id, total) VALUES (?, ?, ?)',
      [req.user.id, puesto_id, total]
    );
    const pedidoId = result.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO pedido_items (pedido_id, producto_id, promocion_id, cantidad, precio_unitario, importe_total) VALUES (?, ?, ?, ?, ?, ?)',
        [
          pedidoId,
          item.producto_id,
          item.promocion_id ?? null,
          item.cantidad,
          item.precio_unitario,
          item.importe_total ?? roundCurrency(Number(item.precio_unitario) * Number(item.cantidad))
        ]
      );
    }
    // Sumar puntos loyalty (100 puntos por euro; 100 puntos = 1 EUR)
    const puntos = Math.round(Number(total) * 100);
    await conn.query(
      `INSERT INTO loyalty
        (usuario_id, puntos_total, puntos_pendientes, puntos_ganados_total, puntos_canjeados_total, nivel, activo, ultimo_movimiento_en)
       VALUES (?, ?, 0, ?, 0, 'fan', 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         puntos_total = puntos_total + VALUES(puntos_total),
         puntos_ganados_total = puntos_ganados_total + VALUES(puntos_ganados_total),
         ultimo_movimiento_en = CURRENT_TIMESTAMP`,
      [req.user.id, puntos, puntos]
    );
    const [loyaltyRows] = await conn.query(
      'SELECT id, puntos_total FROM loyalty WHERE usuario_id = ?',
      [req.user.id]
    );
    const loyalty = loyaltyRows[0];
    await conn.query(
      `INSERT INTO loyalty_movimientos
        (loyalty_id, pedido_id, tipo, origen, puntos, saldo_resultante, estado, descripcion, confirmado_en)
       VALUES (?, ?, 'compra', 'pedido', ?, ?, 'confirmado', ?, CURRENT_TIMESTAMP)`,
      [loyalty.id, pedidoId, puntos, loyalty.puntos_total, `Pedido #${pedidoId}`]
    );
    await conn.query(
      'UPDATE pedidos SET puntos_ganados = ? WHERE id = ?',
      [puntos, pedidoId]
    );
    await conn.commit();
    await evaluateWaitZeroTriggerForPuesto(Number(puesto_id), 'pedido_creado');
    res.json({ pedido_id: pedidoId, puntos_ganados: puntos });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==================== RESENAS ====================

app.get('/api/resenas/context', auth, async (req, res) => {
  try {
    const pedidoId = Number(req.query.pedido_id);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({ error: 'pedido_id invalido' });
    }

    const [pedidos] = await db.query(
      `SELECT p.id, p.usuario_id, p.puesto_id, p.total, p.estado, p.creado_en,
              pu.nombre AS puesto_nombre, pu.tipo AS puesto_tipo
       FROM pedidos p
       JOIN puestos pu ON pu.id = p.puesto_id
       WHERE p.id = ?
       LIMIT 1`,
      [pedidoId]
    );

    if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const pedido = pedidos[0];
    if (req.user.rol === 'usuario' && Number(pedido.usuario_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'No tienes permiso para resenar este pedido' });
    }

    const [items] = await db.query(
      `SELECT pi.producto_id, SUM(pi.cantidad) AS cantidad, pr.nombre, pr.descripcion, pr.foto_url
       FROM pedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
       WHERE pi.pedido_id = ?
       GROUP BY pi.producto_id, pr.nombre, pr.descripcion, pr.foto_url
       ORDER BY pr.nombre ASC`,
      [pedidoId]
    );

    const [reviews] = await db.query('SELECT id, puntos_sumados FROM resenas WHERE pedido_id = ? LIMIT 1', [pedidoId]);

    res.json({
      pedido,
      productos: items,
      existing_review: reviews[0] || null,
      can_review: pedido.estado !== 'cancelado' && reviews.length === 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resenas/eligibilidad/producto/:id', auth, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'producto_id invalido' });
    }

    const [orderedRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM pedidos p
       JOIN pedido_items pi ON pi.pedido_id = p.id
       WHERE p.usuario_id = ?
         AND pi.producto_id = ?
         AND p.estado <> 'cancelado'`,
      [req.user.id, productId]
    );

    const [eligibleRows] = await db.query(
      `SELECT p.id AS pedido_id, p.puesto_id, pu.nombre AS puesto_nombre, pu.tipo AS puesto_tipo, p.creado_en
       FROM pedidos p
       JOIN pedido_items pi ON pi.pedido_id = p.id
       JOIN puestos pu ON pu.id = p.puesto_id
       LEFT JOIN resenas r ON r.pedido_id = p.id
       WHERE p.usuario_id = ?
         AND pi.producto_id = ?
         AND p.estado <> 'cancelado'
         AND r.id IS NULL
       ORDER BY p.creado_en DESC
       LIMIT 1`,
      [req.user.id, productId]
    );

    const orderedCount = Number(orderedRows[0]?.total || 0);
    res.json({
      has_ordered: orderedCount > 0,
      can_review: eligibleRows.length > 0,
      pedido: eligibleRows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resenas', auth, async (req, res) => {
  try {
    const conditions = [];
    const params = [];
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    if (req.query.mine === '1' || req.query.mine === 'true') {
      conditions.push('r.usuario_id = ?');
      params.push(req.user.id);
    }

    if (req.query.puesto_id) {
      conditions.push('r.puesto_id = ?');
      params.push(Number(req.query.puesto_id));
    }

    if (req.query.pedido_id) {
      conditions.push('r.pedido_id = ?');
      params.push(Number(req.query.pedido_id));
    }

    if (req.query.producto_id) {
      conditions.push(`EXISTS (
        SELECT 1
        FROM resenas_productos rp_filter
        WHERE rp_filter.resena_id = r.id
          AND rp_filter.producto_id = ?
      )`);
      params.push(Number(req.query.producto_id));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [reviews] = await db.query(
      `SELECT r.id, r.pedido_id, r.usuario_id, r.puesto_id, r.estrellas_general, r.comentario,
              r.estrellas_servicio, r.estrellas_personal, r.estrellas_rapidez,
              r.puntos_sumados, r.creado_en,
              COALESCE(u.alias, u.nombre) AS usuario_nombre,
              pu.nombre AS puesto_nombre,
              pu.tipo AS puesto_tipo
       FROM resenas r
       JOIN usuarios u ON u.id = r.usuario_id
       JOIN puestos pu ON pu.id = r.puesto_id
       ${where}
       ORDER BY r.creado_en DESC
       LIMIT ${limit}`,
      params
    );

    if (reviews.length === 0) return res.json([]);

    const reviewIds = reviews.map((review) => review.id);
    const [productReviews] = await db.query(
      `SELECT rp.id, rp.resena_id, rp.producto_id, rp.estrellas, rp.comentario, rp.origen,
              pr.nombre AS producto_nombre, pr.foto_url
       FROM resenas_productos rp
       JOIN productos pr ON pr.id = rp.producto_id
       WHERE rp.resena_id IN (?)
       ORDER BY rp.creado_en ASC`,
      [reviewIds]
    );

    const productsByReview = productReviews.reduce((acc, row) => {
      if (!acc[row.resena_id]) acc[row.resena_id] = [];
      acc[row.resena_id].push(row);
      return acc;
    }, {});

    res.json(reviews.map((review) => ({
      ...review,
      productos: productsByReview[review.id] || []
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resenas', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const pedidoId = Number(req.body.pedido_id);
    const estrellasGeneral = Number(req.body.estrellas_general);
    const comentario = normalizeOptionalComment(req.body.comentario);
    const estrellasServicio = req.body.estrellas_servicio == null || req.body.estrellas_servicio === ''
      ? null
      : Number(req.body.estrellas_servicio);
    const estrellasPersonal = req.body.estrellas_personal == null || req.body.estrellas_personal === ''
      ? null
      : Number(req.body.estrellas_personal);
    const estrellasRapidez = req.body.estrellas_rapidez == null || req.body.estrellas_rapidez === ''
      ? null
      : Number(req.body.estrellas_rapidez);
    const productoReviews = Array.isArray(req.body.productos) ? req.body.productos : [];

    if (!Number.isInteger(pedidoId) || pedidoId <= 0) return res.status(400).json({ error: 'pedido_id invalido' });
    if (!isValidStars(estrellasGeneral)) return res.status(400).json({ error: 'estrellas_general debe estar entre 1 y 5' });
    for (const value of [estrellasServicio, estrellasPersonal, estrellasRapidez]) {
      if (value != null && !isValidStars(value)) return res.status(400).json({ error: 'Las estrellas opcionales deben estar entre 1 y 5' });
    }

    await conn.beginTransaction();

    const [pedidos] = await conn.query(
      `SELECT id, usuario_id, puesto_id, estado
       FROM pedidos
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [pedidoId]
    );

    if (pedidos.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];
    if (Number(pedido.usuario_id) !== Number(req.user.id)) {
      await conn.rollback();
      return res.status(403).json({ error: 'No puedes resenar un pedido que no es tuyo' });
    }

    if (pedido.estado === 'cancelado') {
      await conn.rollback();
      return res.status(400).json({ error: 'No se puede resenar un pedido cancelado' });
    }

    const [existing] = await conn.query('SELECT id FROM resenas WHERE pedido_id = ? LIMIT 1', [pedidoId]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Este pedido ya tiene una resena' });
    }

    const [pedidoProducts] = await conn.query(
      `SELECT DISTINCT producto_id
       FROM pedido_items
       WHERE pedido_id = ?`,
      [pedidoId]
    );
    const allowedProductIds = new Set(pedidoProducts.map((item) => Number(item.producto_id)));
    const normalizedProductReviews = [];
    const seenProductIds = new Set();

    for (const item of productoReviews) {
      const productId = Number(item.producto_id);
      const stars = Number(item.estrellas);
      const productComment = normalizeOptionalComment(item.comentario);

      if (!Number.isInteger(productId) || !allowedProductIds.has(productId) || seenProductIds.has(productId)) continue;
      if (!isValidStars(stars)) continue;

      seenProductIds.add(productId);
      normalizedProductReviews.push({
        producto_id: productId,
        estrellas: stars,
        comentario: productComment
      });
    }

    const pointsConfig = await getReviewPointsConfig(conn);
    const extraReviewActions = [
      comentario && comentario.length >= 10,
      estrellasServicio && estrellasPersonal && estrellasRapidez
    ].filter(Boolean).length;
    const paidProductReviewActions = Math.min(normalizedProductReviews.length, Math.max(0, 5 - extraReviewActions));
    const puntosSumados = pointsConfig.resena_base
      + (comentario && comentario.length >= 10 ? pointsConfig.comentario_texto : 0)
      + (estrellasServicio && estrellasPersonal && estrellasRapidez ? pointsConfig.estrellas_servicio : 0)
      + paidProductReviewActions * pointsConfig.valoracion_producto;

    const [reviewResult] = await conn.query(
      `INSERT INTO resenas
        (pedido_id, usuario_id, puesto_id, estrellas_general, comentario, estrellas_servicio, estrellas_personal, estrellas_rapidez, puntos_sumados)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pedidoId,
        req.user.id,
        pedido.puesto_id,
        estrellasGeneral,
        comentario,
        estrellasServicio,
        estrellasPersonal,
        estrellasRapidez,
        puntosSumados
      ]
    );

    for (const item of normalizedProductReviews) {
      await conn.query(
        `INSERT INTO resenas_productos (resena_id, producto_id, estrellas, comentario, origen)
         VALUES (?, ?, ?, ?, 'manual')`,
        [reviewResult.insertId, item.producto_id, item.estrellas, item.comentario]
      );
    }

    await conn.query(
      `INSERT INTO loyalty
        (usuario_id, puntos_total, puntos_pendientes, puntos_ganados_total, puntos_canjeados_total, nivel, activo, ultimo_movimiento_en)
       VALUES (?, ?, 0, ?, 0, 'fan', 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         puntos_total = puntos_total + VALUES(puntos_total),
         puntos_ganados_total = puntos_ganados_total + VALUES(puntos_ganados_total),
         ultimo_movimiento_en = CURRENT_TIMESTAMP`,
      [req.user.id, puntosSumados, puntosSumados]
    );

    const [loyaltyRows] = await conn.query(
      'SELECT id, puntos_total FROM loyalty WHERE usuario_id = ?',
      [req.user.id]
    );
    const loyalty = loyaltyRows[0];
    await conn.query(
      `INSERT INTO loyalty_movimientos
        (loyalty_id, pedido_id, tipo, origen, puntos, saldo_resultante, estado, descripcion, confirmado_en)
       VALUES (?, ?, 'resena', 'resena', ?, ?, 'confirmado', ?, CURRENT_TIMESTAMP)`,
      [loyalty.id, pedidoId, puntosSumados, loyalty.puntos_total, `Reseña pedido #${pedidoId}`]
    );

    await conn.commit();
    res.json({
      id: reviewResult.insertId,
      puntos_sumados: puntosSumados,
      productos_valorados: normalizedProductReviews.length
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// (Route mis-pedidos moved up)



// GET /api/gestor/mapa — puestos con posición y métricas en tiempo real
app.get('/api/gestor/mapa', auth, async (req, res) => {
  const { festival_id } = req.query;
  if (!festival_id) return res.status(400).json({ error: 'festival_id requerido' });
  try {
    const [rows] = await db.query(`
      SELECT
        p.id, p.nombre, p.tipo, p.abierto,
        p.pos_x, p.pos_y,
        COUNT(CASE WHEN o.estado NOT IN ('entregado','cancelado') THEN 1 END) AS pedidos_activos,
        ROUND(
          COUNT(CASE WHEN o.estado NOT IN ('entregado','cancelado') THEN 1 END)
          * p.tiempo_servicio_medio
          / GREATEST(p.num_empleados, 1)
        ) AS espera_min,
        COALESCE(SUM(CASE WHEN o.estado != 'cancelado' THEN o.total ELSE 0 END), 0) AS ingresos_hoy
      FROM puestos p
      LEFT JOIN pedidos o ON o.puesto_id = p.id
      WHERE p.festival_id = ?
      GROUP BY p.id, p.tiempo_servicio_medio, p.num_empleados
      ORDER BY p.id
    `, [festival_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gestor/heatmap
app.get('/api/gestor/heatmap', auth, async (req, res) => {
  try {
    // 0. Obtener todos los puestos abiertos para inicializar los vacíos
    const [puestos] = await db.query('SELECT id FROM puestos WHERE abierto = true');
    const result = {};
    puestos.forEach(p => {
      result[p.id] = { pedidos_activos: 0, espera_actual_min: 0, ingresos_hoy: 0 };
    });

    // 1. Pedidos activos por puesto
    const [activeOrders] = await db.query(`
      SELECT puesto_id,
             COUNT(*) AS pedidos_activos
      FROM pedidos
      WHERE estado NOT IN ('entregado', 'cancelado')
      GROUP BY puesto_id`
    );

    // 2. Tiempo de espera estimado (promedio de minutos desde creación)
    const [waitTimes] = await db.query(`
      SELECT puesto_id,
             AVG(TIMESTAMPDIFF(MINUTE, creado_en, NOW())) AS espera_actual_min
      FROM pedidos
      WHERE estado NOT IN ('entregado', 'cancelado')
      GROUP BY puesto_id`
    );

    // 3. Ingresos de hoy por puesto
    const [todayRevenue] = await db.query(`
      SELECT puesto_id,
             SUM(total) AS ingresos_hoy
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      GROUP BY puesto_id`
    );

    // Merge results
    activeOrders.forEach(r => {
      if (result[r.puesto_id]) result[r.puesto_id].pedidos_activos = r.pedidos_activos;
    });
    waitTimes.forEach(r => {
      if (result[r.puesto_id]) result[r.puesto_id].espera_actual_min = Math.round(r.espera_actual_min || 0);
    });
    todayRevenue.forEach(r => {
      if (result[r.puesto_id]) result[r.puesto_id].ingresos_hoy = Number(r.ingresos_hoy || 0);
    });

    res.json(result);
  } catch (err) {
    console.error('heatmap error', err);
    res.status(500).json({ error: err.message });
  }
});
// Operador: ver sus puestos
app.get('/api/operador/mis-puestos', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'operador') {
      return res.status(403).json({ error: 'Solo operadores' });
    }

    const [rows] = await db.query(
      `SELECT p.*
       FROM puesto_operadores po
       JOIN puestos p ON p.id = po.puesto_id
       WHERE po.usuario_id = ?
       ORDER BY p.id ASC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operador: consultar stock de materias primas de su puesto
app.get('/api/operador/stock/:puestoId', auth, async (req, res) => {
  try {
    const puestoId = Number(req.params.puestoId);

    // Verificar que el operador pertenece a este puesto (o es gestor/admin)
    if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [puestoId, req.user.id]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para ver el stock de este puesto' });
      }
    }

    const [rows] = await db.query(
      `SELECT
         sp.puesto_id,
         sp.materia_prima_id,
         mp.nombre,
         mp.unidad_medida,
         CAST(sp.stock_actual AS FLOAT) AS stock_actual,
         CAST(sp.stock_minimo AS FLOAT) AS stock_minimo,
         CAST(sp.stock_maximo AS FLOAT) AS stock_maximo,
         sp.actualizado_en,
         CASE
           WHEN sp.stock_actual <= sp.stock_minimo THEN 'critico'
           WHEN sp.stock_actual <= sp.stock_minimo * 1.5 THEN 'bajo'
           ELSE 'ok'
         END AS estado
       FROM stock_puesto sp
       JOIN materias_primas mp ON mp.id = sp.materia_prima_id
       WHERE sp.puesto_id = ?
       ORDER BY estado DESC, mp.nombre ASC`,
      [puestoId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operador: consultar stock disponible en almacén central para una materia prima
app.get('/api/operador/stock/:puestoId/almacen/:materiaPrimaId', auth, async (req, res) => {
  try {
    const puestoId = Number(req.params.puestoId);
    const materiaPrimaId = Number(req.params.materiaPrimaId);

    // Verificar pertenencia al puesto
    if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [puestoId, req.user.id]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para ver el stock de este puesto' });
      }
    }

    const [rows] = await db.query(
      'SELECT id, nombre, unidad_medida, CAST(stock_actual AS FLOAT) AS stock_disponible FROM materias_primas WHERE id = ?',
      [materiaPrimaId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Materia prima no encontrada en almacén' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operador: reabastecer una materia prima de su puesto (con TRANSACCIÓN)
// Descuenta del almacén central (materias_primas) y sube en stock_puesto.
// Si cualquier paso falla, se hace ROLLBACK y no se descuadra nada.
app.post('/api/operador/stock/:puestoId/reabastecer', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const puestoId = Number(req.params.puestoId);
    const { materia_prima_id, cantidad } = req.body;

    if (!materia_prima_id || cantidad === undefined || cantidad === null) {
      conn.release();
      return res.status(400).json({ error: 'materia_prima_id y cantidad son obligatorios' });
    }
    const cantidadNum = Number(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      conn.release();
      return res.status(400).json({ error: 'cantidad debe ser un número positivo mayor que 0' });
    }

    // Verificar que el operador pertenece a este puesto (o es gestor/admin)
    if (req.user.rol === 'operador') {
      const [ops] = await conn.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [puestoId, req.user.id]
      );
      if (ops.length === 0) {
        conn.release();
        return res.status(403).json({ error: 'No tienes permiso para reabastecer este puesto' });
      }
    }

    // ─── INICIO TRANSACCIÓN ───
    await conn.beginTransaction();

    // 1. Leer stock del almacén central (con FOR UPDATE para bloquear la fila)
    const [almacenRows] = await conn.query(
      'SELECT stock_actual FROM materias_primas WHERE id = ? FOR UPDATE',
      [materia_prima_id]
    );
    if (almacenRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Materia prima no encontrada en almacén central' });
    }

    const stockAlmacen = Number(almacenRows[0].stock_actual);
    if (stockAlmacen <= 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'No hay stock disponible en el almacén central' });
    }
    if (cantidadNum > stockAlmacen) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: `Stock insuficiente en almacén. Disponible: ${stockAlmacen}`,
        stock_disponible: stockAlmacen
      });
    }

    // 2. Leer stock actual y máximo del puesto (con FOR UPDATE)
    const [stockRows] = await conn.query(
      'SELECT stock_actual, stock_maximo FROM stock_puesto WHERE puesto_id = ? AND materia_prima_id = ? FOR UPDATE',
      [puestoId, materia_prima_id]
    );
    if (stockRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Materia prima no configurada para este puesto' });
    }

    const { stock_actual, stock_maximo } = stockRows[0];
    // Limitar la cantidad para no exceder el máximo del puesto
    const cantidadReal = Math.min(cantidadNum, Number(stock_maximo) - Number(stock_actual));
    if (cantidadReal <= 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'El puesto ya está al máximo de capacidad para esta materia prima' });
    }

    const nuevoStockPuesto = Number(stock_actual) + cantidadReal;
    const nuevoStockAlmacen = stockAlmacen - cantidadReal;

    // 3. UPDATE 1: Descontar del almacén central
    await conn.query(
      'UPDATE materias_primas SET stock_actual = ? WHERE id = ?',
      [nuevoStockAlmacen, materia_prima_id]
    );

    // 4. UPDATE 2: Subir stock del puesto
    await conn.query(
      'UPDATE stock_puesto SET stock_actual = ?, actualizado_en = NOW() WHERE puesto_id = ? AND materia_prima_id = ?',
      [nuevoStockPuesto, puestoId, materia_prima_id]
    );

    // 5. Registrar movimiento de stock para auditoría
    await conn.query(
      `INSERT INTO movimientos_stock (tipo, materia_prima_id, puesto_id_destino, cantidad, usuario_id, notas, creado_en)
       VALUES ('reposicion', ?, ?, ?, ?, ?, NOW())`,
      [materia_prima_id, puestoId, cantidadReal, req.user.id, `Reposición desde almacén central al puesto #${puestoId}`]
    );

    // ─── COMMIT ───
    await conn.commit();

    res.json({
      success: true,
      materia_prima_id: Number(materia_prima_id),
      stock_anterior_puesto: Number(stock_actual),
      cantidad_movida: cantidadReal,
      stock_nuevo_puesto: nuevoStockPuesto,
      stock_maximo_puesto: Number(stock_maximo),
      stock_anterior_almacen: stockAlmacen,
      stock_nuevo_almacen: nuevoStockAlmacen
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Operador: predicción de consumo para las próximas 5 horas
// Basada en los pedidos históricos de los últimos 7 días, agrupados por hora del día
app.get('/api/operador/stock/:puestoId/prediccion-5h', auth, async (req, res) => {
  try {
    const puestoId = Number(req.params.puestoId);

    // Verificar pertenencia al puesto
    if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [puestoId, req.user.id]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso' });
      }
    }

    const horaActual = new Date().getHours();
    // Próximas 5 horas (wrapping around midnight)
    const horasObjetivo = Array.from({ length: 5 }, (_, i) => (horaActual + i) % 24);

    // Consumo histórico por hora para cada materia prima (últimos 7 días)
    const [consumoHorario] = await db.query(
      `SELECT
         pm.materia_prima_id,
         mp.nombre,
         mp.unidad_medida,
         HOUR(p.creado_en)                              AS hora_dia,
         SUM(pi.cantidad * pm.cantidad_por_unidad)      AS consumo_hora_total,
         COUNT(DISTINCT DATE(p.creado_en))              AS dias_con_datos
       FROM pedidos p
       JOIN pedido_items pi              ON pi.pedido_id  = p.id
       JOIN producto_materias_primas pm  ON pm.producto_id = pi.producto_id
       JOIN materias_primas mp           ON mp.id = pm.materia_prima_id
       WHERE p.puesto_id = ?
         AND p.estado NOT IN ('cancelado')
         AND p.creado_en >= NOW() - INTERVAL 7 DAY
       GROUP BY pm.materia_prima_id, mp.nombre, mp.unidad_medida, HOUR(p.creado_en)
       ORDER BY pm.materia_prima_id, hora_dia`,
      [puestoId]
    );

    // Stock actual de cada MP
    const [stockRows] = await db.query(
      `SELECT sp.materia_prima_id, mp.nombre, mp.unidad_medida,
              CAST(sp.stock_actual AS FLOAT) AS stock_actual,
              CAST(sp.stock_minimo AS FLOAT) AS stock_minimo,
              CAST(sp.stock_maximo AS FLOAT) AS stock_maximo
       FROM stock_puesto sp
       JOIN materias_primas mp ON mp.id = sp.materia_prima_id
       WHERE sp.puesto_id = ?`,
      [puestoId]
    );

    // Construir mapa de consumo medio por hora por MP
    const consumoMap = {};
    for (const row of consumoHorario) {
      const id = row.materia_prima_id;
      if (!consumoMap[id]) consumoMap[id] = {};
      const diasConDatos = Math.max(Number(row.dias_con_datos), 1);
      consumoMap[id][row.hora_dia] = Number(row.consumo_hora_total) / diasConDatos;
    }

    // Para cada MP en stock, calcular predicción hora a hora
    const predicciones = stockRows.map(stock => {
      const id = stock.materia_prima_id;
      const horasData = consumoMap[id] || {};

      // Consumo promedio global (fallback si no hay dato para una hora concreta)
      const allValues = Object.values(horasData);
      const consumoMedioHora = allValues.length > 0
        ? allValues.reduce((a, b) => a + b, 0) / 24
        : 0;

      let stockSimulado = Number(stock.stock_actual);
      const horas = horasObjetivo.map((hora, idx) => {
        const consumo = horasData[hora] ?? consumoMedioHora;
        const consumoRedondeado = Math.round(consumo * 1000) / 1000;
        // El stock simulado al inicio de esta hora
        const stockInicioHora = stockSimulado;
        stockSimulado = Math.max(stockSimulado - consumo, 0);
        return {
          hora,
          offset_horas: idx,
          consumo_previsto: consumoRedondeado,
          stock_tras_hora: Math.round(stockSimulado * 1000) / 1000,
          riesgo: stockInicioHora <= stock.stock_minimo
        };
      });

      const consumoTotal5h = horas.reduce((sum, h) => sum + h.consumo_previsto, 0);
      const hayRiesgo = horas.some(h => h.riesgo) || (Number(stock.stock_actual) - consumoTotal5h) < Number(stock.stock_minimo);
      const sin_datos = consumoMedioHora === 0 && Object.keys(horasData).length === 0;

      return {
        materia_prima_id: id,
        nombre: stock.nombre,
        unidad_medida: stock.unidad_medida,
        stock_actual: Number(stock.stock_actual),
        stock_minimo: Number(stock.stock_minimo),
        stock_maximo: Number(stock.stock_maximo),
        consumo_total_5h: Math.round(consumoTotal5h * 1000) / 1000,
        hay_riesgo: hayRiesgo,
        sin_datos,
        horas
      };
    });

    // Ordenar: riesgos primero, luego sin datos, luego el resto
    predicciones.sort((a, b) => {
      if (a.hay_riesgo && !b.hay_riesgo) return -1;
      if (!a.hay_riesgo && b.hay_riesgo) return 1;
      if (a.sin_datos && !b.sin_datos) return 1;
      if (!a.sin_datos && b.sin_datos) return -1;
      return a.nombre.localeCompare(b.nombre);
    });

    res.json({
      puesto_id: puestoId,
      hora_actual: horaActual,
      horas_objetivo: horasObjetivo,
      generado_en: new Date().toISOString(),
      predicciones
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operador: predicción de agotamiento de materias primas
// Basada en el consumo real de los últimos 7 días y la concentración horaria de pedidos
app.get('/api/operador/prediccion/:puestoId', auth, async (req, res) => {
  try {
    const puestoId = Number(req.params.puestoId);

    // Verificar pertenencia al puesto
    if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [puestoId, req.user.id]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso' });
      }
    }

    // 1. Consumo total de cada MP en los últimos 7 días, desglosado por hora del día
    const [consumoHorario] = await db.query(
      `SELECT
         pm.materia_prima_id,
         mp.nombre,
         mp.unidad_medida,
         HOUR(p.creado_en)                              AS hora_dia,
         SUM(pi.cantidad * pm.cantidad_por_unidad)      AS consumo_hora_total,
         COUNT(DISTINCT DATE(p.creado_en))              AS dias_con_datos
       FROM pedidos p
       JOIN pedido_items pi              ON pi.pedido_id  = p.id
       JOIN producto_materias_primas pm  ON pm.producto_id = pi.producto_id
       JOIN materias_primas mp           ON mp.id = pm.materia_prima_id
       WHERE p.puesto_id = ?
         AND p.estado NOT IN ('cancelado')
         AND p.creado_en >= NOW() - INTERVAL 7 DAY
       GROUP BY pm.materia_prima_id, mp.nombre, mp.unidad_medida, HOUR(p.creado_en)
       ORDER BY pm.materia_prima_id, hora_dia`,
      [puestoId]
    );

    // 2. Stock actual de cada MP en este puesto
    const [stockRows] = await db.query(
      `SELECT sp.materia_prima_id, sp.stock_actual, sp.stock_minimo, sp.stock_maximo
       FROM stock_puesto sp
       WHERE sp.puesto_id = ?`,
      [puestoId]
    );

    const stockMap = {};
    stockRows.forEach(s => {
      stockMap[s.materia_prima_id] = {
        stock_actual: Number(s.stock_actual),
        stock_minimo: Number(s.stock_minimo),
        stock_maximo: Number(s.stock_maximo)
      };
    });

    // 3. Agrupar consumo por materia prima y calcular métricas
    const byMP = {};
    for (const row of consumoHorario) {
      const id = row.materia_prima_id;
      if (!byMP[id]) {
        byMP[id] = {
          materia_prima_id: id,
          nombre: row.nombre,
          unidad_medida: row.unidad_medida,
          horas: {}  // hora_dia → consumo_medio_ese_dia
        };
      }
      // Consumo medio para esa hora (promedio sobre días con datos)
      const diasConDatos = Math.max(Number(row.dias_con_datos), 1);
      byMP[id].horas[row.hora_dia] = Number(row.consumo_hora_total) / diasConDatos;
    }

    const horaActual = new Date().getHours();

    const predicciones = Object.values(byMP).map(mp => {
      const stock = stockMap[mp.materia_prima_id];
      if (!stock) return null;

      const horasData = mp.horas;  // { 0: 0.5, 13: 2.3, 20: 4.1, ... }
      const consumos = Object.values(horasData);

      // Consumo promedio por hora (sobre todas las horas del día con actividad)
      const consumoTotalDia = consumos.reduce((a, b) => a + b, 0);
      const horasConActividad = consumos.length || 1;
      const consumoPromedioHora = consumoTotalDia / 24; // distribuido sobre el día

      // Horas pico: las 3 horas con mayor consumo medio
      const sortedHoras = Object.entries(horasData)
        .sort((a, b) => Number(b[1]) - Number(a[1]));
      const horasPico = sortedHoras.slice(0, 3).map(([h]) => Number(h));
      const enHoraPico = horasPico.includes(horaActual);

      // Consumo para la hora actual (o promedio si no hay dato)
      const consumoHoraActual = horasData[horaActual] ?? consumoPromedioHora;

      // Stock disponible antes de llegar al mínimo
      const stockDisponible = Math.max(stock.stock_actual - stock.stock_minimo, 0);

      // Horas hasta mínimo al ritmo actual
      const horasHastaMinimo = consumoHoraActual > 0
        ? stockDisponible / consumoHoraActual
        : null;

      // Horas hasta mínimo al ritmo promedio (si la hora actual = 0 consumo)
      const horasHastaMinimoPromedio = consumoPromedioHora > 0
        ? stockDisponible / consumoPromedioHora
        : null;

      // Momento estimado de agotamiento (hora actual o promedio, el más conservador)
      const rateUsado = consumoHoraActual > 0 ? consumoHoraActual : consumoPromedioHora;
      let prediccionFecha = null;
      if (rateUsado > 0 && stockDisponible >= 0) {
        const msHastaMinimo = (stockDisponible / rateUsado) * 3600 * 1000;
        prediccionFecha = new Date(Date.now() + msHastaMinimo).toISOString();
      }

      return {
        materia_prima_id: mp.materia_prima_id,
        nombre: mp.nombre,
        unidad_medida: mp.unidad_medida,
        stock_actual: stock.stock_actual,
        stock_minimo: stock.stock_minimo,
        stock_maximo: stock.stock_maximo,
        consumo_promedio_hora: Math.round(consumoPromedioHora * 1000) / 1000,
        consumo_hora_actual: Math.round(consumoHoraActual * 1000) / 1000,
        consumo_total_dia: Math.round(consumoTotalDia * 100) / 100,
        horas_pico: horasPico,
        en_hora_pico: enHoraPico,
        horas_hasta_minimo: horasHastaMinimo !== null ? Math.round(horasHastaMinimo * 10) / 10 : null,
        horas_hasta_minimo_promedio: horasHastaMinimoPromedio !== null ? Math.round(horasHastaMinimoPromedio * 10) / 10 : null,
        prediccion_agotamiento: prediccionFecha,
        dias_analizados: horasConActividad > 0 ? Math.max(...Object.values(mp.horas).map(() => 1)) : 0,
        sin_datos: consumoTotalDia === 0
      };
    }).filter(Boolean);

    // Ordenar: primero los más críticos (menor horas_hasta_minimo)
    predicciones.sort((a, b) => {
      if (a.sin_datos && !b.sin_datos) return 1;
      if (!a.sin_datos && b.sin_datos) return -1;
      if (a.horas_hasta_minimo === null) return 1;
      if (b.horas_hasta_minimo === null) return -1;
      return a.horas_hasta_minimo - b.horas_hasta_minimo;
    });

    res.json({
      puesto_id: puestoId,
      hora_actual: horaActual,
      generado_en: new Date().toISOString(),
      predicciones
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/pedidos/puesto/:id', auth, async (req, res) => {
  try {
    const puestoId = Number(req.params.id);

    if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [puestoId, req.user.id]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para ver los pedidos de este puesto' });
      }
    }

    const [rows] = await db.query(
      `SELECT p.*, u.nombre as usuario_nombre
       FROM pedidos p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.puesto_id = ?
       ORDER BY p.creado_en DESC`,
      [puestoId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Vendedor: actualizar estado del pedido
app.patch('/api/pedidos/:id/estado', auth, async (req, res) => {
  try {
    const pedidoId = Number(req.params.id);
    const nuevo_estado = req.body.estado;

    const [pedidos] = await db.query('SELECT id, puesto_id, estado FROM pedidos WHERE id = ?', [pedidoId]);
    if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    const pedido = pedidos[0];

    if (req.user.rol === 'operador') {
      const [ops] = await db.query(
        'SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?',
        [pedido.puesto_id, req.user.id]
      );
      if (ops.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para modificar pedidos de este puesto' });
      }
    }

    const permitidos = VALID_TRANSITIONS[pedido.estado] || [];
    if (!permitidos.includes(nuevo_estado)) {
      return res.status(400).json({ error: `Transición inválida: ${pedido.estado} -> ${nuevo_estado}` });
    }

    await db.query('UPDATE pedidos SET estado = ? WHERE id = ?', [nuevo_estado, pedidoId]);
    await evaluateWaitZeroTriggerForPuesto(Number(pedido.puesto_id), 'pedido_estado_actualizado');

    res.json({ message: 'Estado actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==================== VEND-004: BOTÓN PÁNICO ====================

// Pausar / Reanudar / Llamar camarero
app.patch('/api/puestos/:id/panico', auth, async (req, res) => {
  const puestoId = req.params.id;
  const { accion } = req.body;

  if (!['pausar', 'reanudar', 'llamar_camarero'].includes(accion)) {
    return res.status(400).json({ error: 'Acción inválida. Usa: pausar | reanudar | llamar_camarero' });
  }

  try {
    if (accion === 'pausar') {
      await db.query('UPDATE puestos SET abierto = 0 WHERE id = ?', [puestoId]);
      await evaluateWaitZeroTriggerForPuesto(Number(puestoId), 'panico_pausar');
      return res.json({ message: 'Puesto pausado. Ya no se aceptan nuevos pedidos.' });
    }

    if (accion === 'reanudar') {
      await db.query('UPDATE puestos SET abierto = 1 WHERE id = ?', [puestoId]);
      await evaluateWaitZeroTriggerForPuesto(Number(puestoId), 'panico_reanudar');
      return res.json({ message: 'Puesto reactivado. Se aceptan nuevos pedidos.' });
    }

    if (accion === 'llamar_camarero') {
      const [puestos] = await db.query('SELECT num_empleados, capacidad_max FROM puestos WHERE id = ?', [puestoId]);
      if (puestos.length === 0) return res.status(404).json({ error: 'Puesto no encontrado' });

      const { num_empleados, capacidad_max } = puestos[0];
      if (num_empleados >= capacidad_max) {
        return res.status(403).json({
          error: 'Capacidad máxima de barra alcanzada, debes pausar pedidos',
          suggerir_pausa: true
        });
      }
      await db.query('UPDATE puestos SET num_empleados = num_empleados + 1 WHERE id = ?', [puestoId]);
      await evaluateWaitZeroTriggerForPuesto(Number(puestoId), 'panico_llamar_camarero');
      return res.json({ message: 'Camarero de apoyo llamado.', num_empleados: num_empleados + 1, capacidad_max });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Estado del puesto (para el frontend)
app.get('/api/puestos/:id/estado', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, abierto, num_empleados, capacidad_max, tiempo_servicio_medio FROM puestos WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Puesto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LOYALTY ====================

app.get('/api/loyalty', auth, async (req, res) => {
  try {
    const [paramRows] = await db.query(
      `SELECT loyalty_vip_threshold, loyalty_headliner_threshold, loyalty_backstage_threshold
       FROM parametros
       WHERE id = 1
       LIMIT 1`
    );
    const tierThresholds = normalizeLoyaltyTierThresholds({
      vip: paramRows[0]?.loyalty_vip_threshold,
      headliner: paramRows[0]?.loyalty_headliner_threshold,
      backstage: paramRows[0]?.loyalty_backstage_threshold
    });

    const [rows] = await db.query(
      `SELECT id, usuario_id, puntos_total, puntos_pendientes, puntos_ganados_total, puntos_canjeados_total,
              nivel, activo, ultimo_movimiento_en, ultimo_canje_en
       FROM loyalty
       WHERE usuario_id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({
        puntos_total: 0,
        puntos_pendientes: 0,
        puntos_ganados_total: 0,
        puntos_canjeados_total: 0,
        nivel: 'fan',
        activo: true,
        tier_thresholds: tierThresholds,
        movements: []
      });
    }

    const loyalty = rows[0];
    const [movements] = await db.query(
      `SELECT id, loyalty_id, pedido_id, tipo, origen, puntos, saldo_resultante, estado, descripcion, creado_en, confirmado_en
       FROM loyalty_movimientos
       WHERE loyalty_id = ?
       ORDER BY creado_en DESC
       LIMIT 10`,
      [loyalty.id]
    );

    res.json({
      ...loyalty,
      tier_thresholds: tierThresholds,
      movements
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== GESTOR ====================

app.get('/api/gestor/estadisticas', auth, async (req, res) => {
  try {
    const fid = req.query.festival_id ? Number(req.query.festival_id) : null;
    const byFestival = fid ? ' AND pu.festival_id = ?' : '';
    const byFestivalStand = fid ? ' AND festival_id = ?' : '';
    const args = fid ? [fid] : [];

    const [pedidos] = await db.query(
      `SELECT COUNT(*) as total, SUM(pe.total) as ingresos
       FROM pedidos pe JOIN puestos pu ON pe.puesto_id = pu.id
       WHERE DATE(pe.creado_en) = CURDATE()${byFestival}`,
      args
    );
    const [esperas] = await db.query(
      `SELECT AVG(tiempo_servicio_medio) as espera_media FROM puestos WHERE abierto = true${byFestivalStand}`,
      args
    );
    const [puestos] = await db.query(
      `SELECT COUNT(*) as abiertos FROM puestos WHERE abierto = true${byFestivalStand}`,
      args
    );
    res.json({
      pedidos_hoy: pedidos[0].total,
      ingresos_hoy: pedidos[0].ingresos || 0,
      espera_media: esperas[0].espera_media || 0,
      puestos_abiertos: puestos[0].abiertos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FESTIVALES PÚBLICOS ====================
// Sin auth — usado en la pantalla de selección de festival del usuario

app.get('/api/festivales', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, fecha_inicio, fecha_fin, activo FROM festivales WHERE activo = 1 ORDER BY fecha_inicio DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN ====================

// ── Festivales ────────────────────────────────────────────────────────────

app.get('/api/admin/festivales', auth, async (req, res) => {
  try {
    const [festivales] = await db.query('SELECT * FROM festivales ORDER BY fecha_inicio DESC');
    res.json(festivales);
  } catch (err) {
    console.error('Error al obtener los festivales:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/festivales', auth, async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, localizacion } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO festivales (nombre, fecha_inicio, fecha_fin, localizacion, creado_por) VALUES (?, ?, ?, ?, ?)',
      [nombre, fecha_inicio, fecha_fin, localizacion || null, req.user.id]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desactiva un festival (activo = 0) sin eliminarlo
app.patch('/api/admin/festivales/:id/desactivar', auth, async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE festivales SET activo = 0 WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Festival no encontrado' });
    }
    res.json({ message: 'Festival desactivado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activa un festival (activo = 1)
app.patch('/api/admin/festivales/:id/activar', auth, async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE festivales SET activo = 1 WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Festival no encontrado' });
    }
    res.json({ message: 'Festival activado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/festivales/:id', auth, async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, localizacion } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE festivales SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, localizacion = ? WHERE id = ?',
      [nombre, fecha_inicio, fecha_fin, localizacion || null, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Festival no encontrado' });
    }
    res.json({ message: 'Festival actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Foto Upload para Festival
app.post('/api/admin/festivales/:id/foto', auth, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta imagen' });
  const foto_url = '/uploads/' + req.file.filename;
  try {
    await db.query('UPDATE festivales SET foto_url = ? WHERE id = ?', [foto_url, req.params.id]);
    res.json({ foto_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/festivales/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM festivales WHERE id = ?', [req.params.id]);
    res.json({ message: 'Festival eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parámetros ────────────────────────────────────────────────────────────

app.get('/api/admin/parametros', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM parametros LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/parametros', auth, async (req, res) => {
  const {
    pricing_dinamico_activo,
    umbral_cola,
    porcentaje_subida,
    promociones_activas,
    stock_minimo,
    loyalty_vip_threshold,
    loyalty_headliner_threshold,
    loyalty_backstage_threshold
  } = req.body;
  try {
    const thresholds = normalizeLoyaltyTierThresholds({
      vip: loyalty_vip_threshold,
      headliner: loyalty_headliner_threshold,
      backstage: loyalty_backstage_threshold
    });

    await db.query(
      `INSERT INTO parametros (
         id, pricing_dinamico_activo, umbral_cola, porcentaje_subida, promociones_activas, stock_minimo,
         loyalty_vip_threshold, loyalty_headliner_threshold, loyalty_backstage_threshold
       )
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         pricing_dinamico_activo = VALUES(pricing_dinamico_activo),
         umbral_cola = VALUES(umbral_cola),
         porcentaje_subida = VALUES(porcentaje_subida),
         promociones_activas = VALUES(promociones_activas),
         stock_minimo = VALUES(stock_minimo),
         loyalty_vip_threshold = VALUES(loyalty_vip_threshold),
         loyalty_headliner_threshold = VALUES(loyalty_headliner_threshold),
         loyalty_backstage_threshold = VALUES(loyalty_backstage_threshold)`,
      [
        pricing_dinamico_activo,
        umbral_cola,
        porcentaje_subida,
        promociones_activas,
        stock_minimo,
        thresholds.vip,
        thresholds.headliner,
        thresholds.backstage
      ]
    );
    res.json({ message: 'Parámetros actualizados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Usuarios ──────────────────────────────────────────────────────────────

// Todos los usuarios (sin filtro)
app.get('/api/admin/usuarios', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT u.id, u.nombre, u.email, u.rol_id, r.nombre as rol, u.creado_en FROM usuarios u JOIN roles r ON u.rol_id = r.id ORDER BY u.creado_en DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NUEVO: Solo staff — administrador (rol_id 1), gestor (2), operador (3)
// IMPORTANTE: declarado ANTES de /api/admin/usuarios/:id para que Express
// no interprete "staff" como un parámetro dinámico :id
app.get('/api/admin/usuarios/staff', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.email, u.rol_id, r.nombre as rol, u.creado_en
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.rol_id IN (1, 2, 3)
       ORDER BY u.rol_id ASC, u.nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/usuarios', auth, async (req, res) => {
  const { email, password, nombre, rol, puesto_id } = req.body;
  const rolMap = { administrador: 1, gestor: 2, operador: 3, usuario: 4 };
  const rol_id = rolMap[rol] || 3;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, ?)',
      [email, hash, nombre, rol_id]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/usuarios/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Promociones ───────────────────────────────────────────────────────────

app.get('/api/promociones', async (req, res) => {
  try {
    const promociones = await listPromotions({
      puestoId: req.query.puesto_id,
      festivalId: req.query.festival_id,
      includeInactive: false,
      onlyPurchasable: true
    });
    res.json(promociones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gestor/promociones', auth, requireRoles('gestor', 'administrador'), async (req, res) => {
  if (!req.query.festival_id) {
    return res.status(400).json({ error: 'festival_id requerido' });
  }

  try {
    const promociones = await listPromotions({
      puestoId: req.query.puesto_id,
      festivalId: req.query.festival_id,
      includeInactive: true,
      onlyPurchasable: false
    });
    res.json(promociones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gestor/promociones', auth, requireRoles('gestor', 'administrador'), async (req, res) => {
  const { puesto_id, producto_id, titulo, descripcion, precio_promo, tipo, valor_descuento, activa } = req.body;
  try {
    const validated = await validatePromotionPayload({
      puestoId: puesto_id,
      productoId: producto_id,
      titulo,
      descripcion,
      precioPromo: precio_promo,
      tipo,
      valorDescuento: valor_descuento
    });

    const [result] = await db.query(
      `INSERT INTO promociones (puesto_id, producto_id, titulo, descripcion, precio_promo, tipo, valor_descuento, activa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.values.puesto_id,
        validated.values.producto_id,
        validated.values.titulo,
        validated.values.descripcion,
        validated.values.precio_promo,
        validated.values.tipo,
        validated.values.valor_descuento,
        activa === undefined ? 1 : (activa ? 1 : 0)
      ]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    const status = /invalido|requerido|debe|no existe|no esta activo|descuento|referencia/i.test(err.message) ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.put('/api/gestor/promociones/:id', auth, requireRoles('gestor', 'administrador'), async (req, res) => {
  try {
    const current = await getPromotionById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Promocion no encontrada' });

    const validated = await validatePromotionPayload({
      puestoId: req.body.puesto_id ?? current.puesto_id,
      productoId: req.body.producto_id ?? current.producto_id,
      titulo: req.body.titulo ?? current.titulo,
      descripcion: req.body.descripcion ?? current.descripcion,
      precioPromo: req.body.precio_promo ?? current.precio_promo,
      tipo: req.body.tipo ?? current.tipo,
      valorDescuento: req.body.valor_descuento ?? current.valor_descuento
    });

    await db.query(
      `UPDATE promociones
       SET puesto_id = ?, producto_id = ?, titulo = ?, descripcion = ?, precio_promo = ?, tipo = ?, valor_descuento = ?, activa = ?
       WHERE id = ?`,
      [
        validated.values.puesto_id,
        validated.values.producto_id,
        validated.values.titulo,
        validated.values.descripcion,
        validated.values.precio_promo,
        validated.values.tipo,
        validated.values.valor_descuento,
        req.body.activa === undefined ? (current.activa ? 1 : 0) : (req.body.activa ? 1 : 0),
        req.params.id
      ]
    );

    res.json({ message: 'Promocion actualizada' });
  } catch (err) {
    const status = /invalido|requerido|debe|no existe|no esta activo|pertenecer|descuento|referencia/i.test(err.message) ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.delete('/api/gestor/promociones/:id', auth, requireRoles('gestor', 'administrador'), async (req, res) => {
  try {
    await db.query('DELETE FROM promociones WHERE id = ?', [req.params.id]);
    res.json({ message: 'Promocion eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/promociones', auth, async (req, res) => {
  try {
    const promociones = await listPromotions({
      puestoId: req.query.puesto_id,
      festivalId: req.query.festival_id,
      includeInactive: true,
      onlyPurchasable: false
    });
    return res.json(promociones);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/promociones', auth, async (req, res) => {
  const { puesto_id, producto_id, titulo, descripcion, precio_promo, tipo, valor_descuento, activa } = req.body;
  try {
    const validated = await validatePromotionPayload({
      puestoId: puesto_id,
      productoId: producto_id,
      titulo,
      descripcion,
      precioPromo: precio_promo,
      tipo,
      valorDescuento: valor_descuento
    });

    const [result] = await db.query(
      `INSERT INTO promociones (puesto_id, producto_id, titulo, descripcion, precio_promo, tipo, valor_descuento, activa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.values.puesto_id,
        validated.values.producto_id,
        validated.values.titulo,
        validated.values.descripcion,
        validated.values.precio_promo,
        validated.values.tipo,
        validated.values.valor_descuento,
        activa === undefined ? 1 : (activa ? 1 : 0)
      ]
    );

    return res.json({ id: result.insertId });
  } catch (err) {
    if (/invalido|requerido|debe|no existe|no esta activo|descuento|referencia/i.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/promociones/:id', auth, async (req, res) => {
  try {
    const current = await getPromotionById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Promocion no encontrada' });

    const validated = await validatePromotionPayload({
      puestoId: req.body.puesto_id ?? current.puesto_id,
      productoId: req.body.producto_id ?? current.producto_id,
      titulo: req.body.titulo ?? current.titulo,
      descripcion: req.body.descripcion ?? current.descripcion,
      precioPromo: req.body.precio_promo ?? current.precio_promo,
      tipo: req.body.tipo ?? current.tipo,
      valorDescuento: req.body.valor_descuento ?? current.valor_descuento
    });

    await db.query(
      `UPDATE promociones
       SET puesto_id = ?, producto_id = ?, titulo = ?, descripcion = ?, precio_promo = ?, tipo = ?, valor_descuento = ?, activa = ?
       WHERE id = ?`,
      [
        validated.values.puesto_id,
        validated.values.producto_id,
        validated.values.titulo,
        validated.values.descripcion,
        validated.values.precio_promo,
        validated.values.tipo,
        validated.values.valor_descuento,
        req.body.activa === undefined ? (current.activa ? 1 : 0) : (req.body.activa ? 1 : 0),
        req.params.id
      ]
    );

    return res.json({ message: 'Promocion actualizada' });
  } catch (err) {
    if (/invalido|requerido|debe|no existe|no esta activo|pertenecer|descuento|referencia/i.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/promociones/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM promociones WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Promocion eliminada' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/promociones', auth, async (req, res) => {
  try {
    const { puesto_id } = req.query;
    let query = 'SELECT * FROM promociones';
    const params = [];
    if (puesto_id) {
      query += ' WHERE puesto_id = ?';
      params.push(Number(puesto_id));
    }
    query += ' ORDER BY creado_en DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/promociones', auth, async (req, res) => {
  const { puesto_id, titulo, descripcion, precio_promo, activa } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO promociones (puesto_id, titulo, descripcion, precio_promo, activa) VALUES (?, ?, ?, ?, ?)',
      [puesto_id, titulo, descripcion, precio_promo, activa ?? true]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/promociones/:id', auth, async (req, res) => {
  const { titulo, descripcion, precio_promo, activa } = req.body;
  try {
    await db.query(
      'UPDATE promociones SET titulo = ?, descripcion = ?, precio_promo = ?, activa = ? WHERE id = ?',
      [titulo, descripcion, precio_promo, activa, req.params.id]
    );
    res.json({ message: 'Promoción actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/promociones/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM promociones WHERE id = ?', [req.params.id]);
    res.json({ message: 'Promoción eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── PUSH SUBSCRIPTION ENDPOINT ───
app.get('/api/notifications/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM notificaciones_usuario
       WHERE usuario_id = ?
       ORDER BY id DESC
       LIMIT 200`,
      [req.user.id]
    );

    res.json(rows.map((row) => ({
      ...row,
      payload: parseJsonSafe(row.payload)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) return res.status(400).json({ error: 'ID de notificacion invalido' });

    const [result] = await db.query(
      `UPDATE notificaciones_usuario
       SET leida = 1
       WHERE id = ? AND usuario_id = ?`,
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificacion no encontrada' });
    }

    res.json({ message: 'Notificacion marcada como leida', id: notificationId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/public-key', (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'Push no configurado' });
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/api/notifications/subscribe', auth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  try {
    await db.query(
      `INSERT IGNORE INTO push_subscriptions (usuario_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.status(201).json({ message: 'Suscripción guardada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== GESTOR — DECISIONES AUTOMÁTICAS ====================

// ── Helpers de parámetros ────────────────────────────────────────────────────

async function getParametros() {
  try {
    const [rows] = await db.query('SELECT * FROM parametros LIMIT 1');
    const p = rows[0] || {};
    return {
      umbral_cola:             Number(p.umbral_cola)              || 5,
      umbral_ventas_bajas:     Number(p.umbral_ventas_bajas)      || 3,
      porcentaje_subida:       Number(p.porcentaje_subida)        || 10,
      porcentaje_bajada:       Number(p.porcentaje_bajada)        || 10,
      pricing_dinamico_activo: p.pricing_dinamico_activo !== 0,
      promociones_activas:     p.promociones_activas     !== 0,
    };
  } catch {
    return {
      umbral_cola: 5, umbral_ventas_bajas: 3,
      porcentaje_subida: 10, porcentaje_bajada: 10,
      pricing_dinamico_activo: true, promociones_activas: true,
    };
  }
}

// Cooldown de 15 min por tipo+puesto+producto para decisiones individuales
async function insertarSiNoPendiente(festival_id, tipo, descripcion, puesto_id = null, producto_id = null, extra = {}) {
  const [recent] = await db.query(
    `SELECT id FROM decisiones_automaticas
     WHERE festival_id = ? AND tipo = ?
       AND (puesto_id = ? OR (puesto_id IS NULL AND ? IS NULL))
       AND (producto_id = ? OR (producto_id IS NULL AND ? IS NULL))
       AND (estado = 'pendiente' OR creado_en >= (NOW() - INTERVAL 15 MINUTE))
     LIMIT 1`,
    [festival_id, tipo, puesto_id, puesto_id, producto_id, producto_id]
  );
  if (recent.length > 0) return;

  const cols = ['festival_id', 'puesto_id', 'tipo', 'descripcion'];
  const vals = [festival_id, puesto_id, tipo, descripcion];
  if (producto_id !== null) { cols.push('producto_id'); vals.push(producto_id); }
  if (extra.porcentaje !== undefined) { cols.push('porcentaje'); vals.push(extra.porcentaje); }
  if (extra.ventas_antes !== undefined) { cols.push('ventas_antes'); vals.push(extra.ventas_antes); }

  await db.query(
    `INSERT INTO decisiones_automaticas (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    vals
  );
}

// Inserta par A/B de descuento para los 2 productos más lentos de un puesto
async function insertarParAB(festival_id, puesto_id, productosLentos, pctBajada) {
  const [recent] = await db.query(
    `SELECT id FROM decisiones_automaticas
     WHERE festival_id = ? AND tipo = 'descuento_producto' AND puesto_id = ?
       AND (estado = 'pendiente' OR creado_en >= (NOW() - INTERVAL 15 MINUTE))
     LIMIT 1`,
    [festival_id, puesto_id]
  );
  if (recent.length > 0) return;

  const grupoAb = `${puesto_id}-${Date.now()}`;
  for (let i = 0; i < Math.min(productosLentos.length, 2); i++) {
    const prod = productosLentos[i];
    const variante = i === 0 ? 'A' : 'B';
    const fmtEur = (v) => parseFloat(Number(v).toFixed(2));
    const precioNuevo = fmtEur(Math.round(prod.precio * (1 - pctBajada / 100) * 100) / 100);
    await db.query(
      `INSERT INTO decisiones_automaticas
         (festival_id, puesto_id, producto_id, tipo, descripcion, grupo_ab, variante, porcentaje, ventas_antes)
       VALUES (?, ?, ?, 'descuento_producto', ?, ?, ?, ?, ?)`,
      [
        festival_id, puesto_id, prod.id,
        `Variante ${variante}: -${pctBajada}% en "${prod.nombre}" (${prod.vendidos_hoy} vendidos hoy). ${fmtEur(prod.precio)}€ → ${precioNuevo}€`,
        grupoAb, variante, -pctBajada, prod.vendidos_hoy
      ]
    );
  }
}

// Evalúa todos los puestos del festival y genera decisiones según reglas reales
async function generarDecisiones(festival_id) {
  const { umbral_cola, umbral_ventas_bajas, porcentaje_bajada, pricing_dinamico_activo, promociones_activas } = await getParametros();
  const [puestos] = await db.query('SELECT * FROM puestos WHERE festival_id = ?', [festival_id]);

  for (const puesto of puestos) {
    // Cola activa: pedidos que el operador aún no ha terminado
    const [[{ pendientes }]] = await db.query(
      `SELECT COUNT(*) as pendientes FROM pedidos
       WHERE puesto_id = ? AND estado IN ('pendiente','confirmado','preparando')`,
      [puesto.id]
    );

    // Pedidos completados hoy — indica si el festival lleva suficiente actividad
    const [[{ completados_hoy }]] = await db.query(
      `SELECT COUNT(*) as completados_hoy FROM pedidos
       WHERE puesto_id = ? AND DATE(creado_en) = CURDATE() AND estado NOT IN ('cancelado')`,
      [puesto.id]
    );

    // Regla 1: pausar pedidos (cerrar_barra) — cola saturada
    if (puesto.abierto && pendientes >= umbral_cola) {
      await insertarSiNoPendiente(
        festival_id, 'cerrar_barra',
        `Cola saturada en "${puesto.nombre}": ${pendientes} pedidos activos (umbral: ${umbral_cola}). Pausar aceptación de nuevos pedidos.`,
        puesto.id
      );
    }

    // Regla 2: reanudar pedidos (abrir_barra) — cola normalizada
    if (!puesto.abierto && pendientes < Math.floor(umbral_cola / 2)) {
      await insertarSiNoPendiente(
        festival_id, 'abrir_barra',
        `Cola normalizada en "${puesto.nombre}" (${pendientes} pedidos activos). Reanudar aceptación de pedidos.`,
        puesto.id
      );
    }

    // Regla 3: A/B descuento_producto — solo si pricing dinámico activo y ≥5 pedidos hoy
    if (pricing_dinamico_activo && completados_hoy >= 5) {
      const [ventasPorProducto] = await db.query(
        `SELECT pr.id, pr.nombre, pr.precio,
                COALESCE(SUM(pi.cantidad), 0) AS vendidos_hoy
         FROM productos pr
         LEFT JOIN pedido_items pi ON pi.producto_id = pr.id
         LEFT JOIN pedidos pe ON pe.id = pi.pedido_id
           AND DATE(pe.creado_en) = CURDATE()
           AND pe.estado NOT IN ('cancelado')
         WHERE pr.puesto_id = ? AND pr.activo = 1
         GROUP BY pr.id, pr.nombre, pr.precio
         ORDER BY vendidos_hoy ASC`,
        [puesto.id]
      );

      if (ventasPorProducto.length >= 2) {
        const maxVentas = Math.max(...ventasPorProducto.map(p => Number(p.vendidos_hoy)));
        const lentos = ventasPorProducto.filter(p => {
          const v = Number(p.vendidos_hoy);
          return v < umbral_ventas_bajas && (maxVentas === 0 || v < maxVentas * 0.3);
        }).slice(0, 2);

        if (lentos.length >= 2) {
          await insertarParAB(festival_id, puesto.id, lentos, porcentaje_bajada);
        }
      }
    }

    // Regla 4: activar_promocion — solo si promociones automáticas están activas
    if (promociones_activas) {
      const [promosInactivas] = await db.query(
        `SELECT id, titulo, producto_id FROM promociones
         WHERE puesto_id = ? AND (activa = 0 OR activa IS NULL)`,
        [puesto.id]
      );
      for (const promo of promosInactivas) {
        await insertarSiNoPendiente(
          festival_id, 'activar_promocion',
          `Promoción inactiva en "${puesto.nombre}": "${promo.titulo}". Activar para que los clientes puedan verla.`,
          puesto.id, promo.producto_id ?? null
        );
      }
    }

    // Regla 5: reposicion_stock — materia prima bajo mínimo en el puesto
    const [stockBajo] = await db.query(
      `SELECT sp.materia_prima_id, mp.nombre AS mp_nombre, mp.unidad_medida,
              ROUND(sp.stock_actual, 2) AS stock_actual,
              ROUND(sp.stock_minimo, 2) AS stock_minimo
       FROM stock_puesto sp
       JOIN materias_primas mp ON mp.id = sp.materia_prima_id
       WHERE sp.puesto_id = ? AND sp.stock_actual < sp.stock_minimo AND sp.stock_minimo > 0`,
      [puesto.id]
    );
    for (const mat of stockBajo) {
      const [recentRepo] = await db.query(
        `SELECT id FROM decisiones_automaticas
         WHERE festival_id = ? AND tipo = 'reposicion_stock' AND puesto_id = ?
           AND creado_en >= (NOW() - INTERVAL 30 MINUTE)
           AND descripcion LIKE ? LIMIT 1`,
        [festival_id, puesto.id, `%${mat.mp_nombre}%`]
      );
      if (recentRepo.length > 0) continue;
      await db.query(
        `INSERT INTO decisiones_automaticas (festival_id, puesto_id, tipo, descripcion)
         VALUES (?, ?, 'reposicion_stock', ?)`,
        [
          festival_id, puesto.id,
          (() => {
            const fmt = (v) => mat.unidad_medida === 'unidad' ? Math.floor(v) : parseFloat(v);
            return `Stock bajo en "${puesto.nombre}": ${mat.mp_nombre} tiene ${fmt(mat.stock_actual)} ${mat.unidad_medida} (mínimo: ${fmt(mat.stock_minimo)} ${mat.unidad_medida}). Reponer desde almacén central.`;
          })()
        ]
      );
    }
  }
}

// Ejecuta la acción real de una decisión aprobada/auto-ejecutada
async function ejecutarDecision(decision) {
  switch (decision.tipo) {
    case 'cerrar_barra':
      if (decision.puesto_id) {
        await db.query('UPDATE puestos SET abierto = 0 WHERE id = ?', [decision.puesto_id]);
        await evaluateWaitZeroTriggerForPuesto(Number(decision.puesto_id), 'decision_cerrar_barra');
      }
      break;

    case 'abrir_barra':
      if (decision.puesto_id) {
        await db.query('UPDATE puestos SET abierto = 1 WHERE id = ?', [decision.puesto_id]);
        await db.query(
          'UPDATE productos SET precio_dinamico = NULL WHERE puesto_id = ? AND precio_dinamico > precio',
          [decision.puesto_id]
        );
        await evaluateWaitZeroTriggerForPuesto(Number(decision.puesto_id), 'decision_abrir_barra');
      }
      break;

    case 'descuento_producto':
      if (decision.producto_id) {
        const pct = Math.abs(Number(decision.porcentaje) || 10);
        const [[prod]] = await db.query(
          'SELECT precio, categoria, nombre FROM productos WHERE id = ?',
          [decision.producto_id]
        );
        if (prod) {
          let tipo, precioPromo, valorDescuento;
          const precio = Number(prod.precio);
          switch (prod.categoria) {
            case 'bebida':
              tipo = 'tres_por_dos';
              precioPromo = parseFloat((precio * 2 / 3).toFixed(2));
              valorDescuento = null;
              break;
            case 'comida':
              tipo = 'dos_por_uno';
              precioPromo = parseFloat((precio / 2).toFixed(2));
              valorDescuento = null;
              break;
            default:
              tipo = 'descuento_porcentaje';
              precioPromo = parseFloat((precio * (1 - pct / 100)).toFixed(2));
              valorDescuento = pct;
          }
          const titulo = tipo === 'tres_por_dos' ? `3×2 en ${prod.nombre}`
            : tipo === 'dos_por_uno' ? `2×1 en ${prod.nombre}`
              : `-${pct}% en ${prod.nombre}`;

          const [existing] = await db.query(
            'SELECT id FROM promociones WHERE producto_id = ? AND activa = 1 LIMIT 1',
            [decision.producto_id]
          );
          if (existing.length > 0) {
            await db.query(
              'UPDATE promociones SET tipo=?, precio_promo=?, valor_descuento=?, titulo=? WHERE id=?',
              [tipo, precioPromo, valorDescuento, titulo, existing[0].id]
            );
          } else {
            await db.query(
              `INSERT INTO promociones (puesto_id, producto_id, titulo, descripcion, precio_promo, tipo, valor_descuento, activa)
               VALUES (?, ?, ?, 'Promoción automática', ?, ?, ?, 1)`,
              [decision.puesto_id, decision.producto_id, titulo, precioPromo, tipo, valorDescuento]
            );
          }
        }
      }
      break;

    case 'activar_promocion':
      if (decision.puesto_id) {
        if (decision.producto_id) {
          await db.query(
            'UPDATE promociones SET activa = 1 WHERE puesto_id = ? AND producto_id = ? AND activa = 0 LIMIT 1',
            [decision.puesto_id, decision.producto_id]
          );
        } else {
          await db.query(
            'UPDATE promociones SET activa = 1 WHERE puesto_id = ? AND activa = 0 ORDER BY id ASC LIMIT 1',
            [decision.puesto_id]
          );
        }
      }
      break;

    case 'reposicion_stock':
      // Solo alerta — acción manual del operador
      break;
  }
}

// Evalúa pares A/B ejecutados hace >30 min y marca ganadora
async function evaluarGanadoresAB(festival_id) {
  const [grupos] = await db.query(
    `SELECT grupo_ab FROM decisiones_automaticas
     WHERE festival_id = ? AND tipo = 'descuento_producto'
       AND estado IN ('ejecutada','aprobada')
       AND grupo_ab IS NOT NULL
       AND ganadora IS NULL
       AND creado_en <= (NOW() - INTERVAL 30 MINUTE)
     GROUP BY grupo_ab
     HAVING COUNT(*) >= 2`,
    [festival_id]
  );

  for (const { grupo_ab } of grupos) {
    const [variantes] = await db.query(
      `SELECT id, producto_id, creado_en FROM decisiones_automaticas
       WHERE festival_id = ? AND grupo_ab = ? AND tipo = 'descuento_producto'`,
      [festival_id, grupo_ab]
    );
    if (variantes.length < 2) continue;

    const resultados = await Promise.all(variantes.map(async (v) => {
      const [[{ ventas_post }]] = await db.query(
        `SELECT COALESCE(SUM(pi.cantidad), 0) AS ventas_post
         FROM pedido_items pi
         JOIN pedidos pe ON pe.id = pi.pedido_id
         WHERE pi.producto_id = ? AND pe.creado_en > ?
           AND pe.estado NOT IN ('cancelado')`,
        [v.producto_id, v.creado_en]
      );
      return { id: v.id, producto_id: v.producto_id, ventas_post: Number(ventas_post) };
    }));

    const [primero, segundo] = resultados.sort((a, b) => b.ventas_post - a.ventas_post);
    const hayGanador = primero.ventas_post > segundo.ventas_post;

    for (const r of resultados) {
      const esGanadora = hayGanador ? (r.id === primero.id ? 1 : 0) : null;
      await db.query(
        'UPDATE decisiones_automaticas SET ventas_despues = ?, ganadora = ? WHERE id = ?',
        [r.ventas_post, esGanadora, r.id]
      );
      // Desactivar promo del perdedor
      if (hayGanador && esGanadora === 0 && r.producto_id) {
        await db.query(
          'UPDATE promociones SET activa = 0 WHERE producto_id = ? AND activa = 1',
          [r.producto_id]
        );
      }
    }
  }
}

function getBotPeriodClause(period, pedidoAlias = 'pe') {
  switch (String(period || 'festival').toLowerCase()) {
    case 'hoy':
      return ` AND DATE(${pedidoAlias}.creado_en) = CURDATE()`;
    case '7d':
    case '7dias':
    case '7_dias':
      return ` AND ${pedidoAlias}.creado_en >= NOW() - INTERVAL 7 DAY`;
    case 'festival':
    default:
      return '';
  }
}

function getBotTimeBucket(period, pedidoAlias = 'pe') {
  if (String(period || '').toLowerCase() === 'hoy') {
    return {
      labelExpr: `DATE_FORMAT(${pedidoAlias}.creado_en, '%H:00')`,
      sortExpr: `DATE_FORMAT(${pedidoAlias}.creado_en, '%Y-%m-%d %H:00:00')`
    };
  }

  return {
    labelExpr: `DATE_FORMAT(${pedidoAlias}.creado_en, '%d/%m')`,
    sortExpr: `DATE(${pedidoAlias}.creado_en)`
  };
}

function normalizeBotPeriodo(period) {
  const normalized = String(period || 'festival').toLowerCase();
  if (normalized === 'hoy' || normalized === '7d' || normalized === '7dias' || normalized === '7_dias') {
    return normalized === 'hoy' ? 'hoy' : '7d';
  }
  return 'festival';
}

async function getGestorModoAuto(festivalId) {
  const [rows] = await db.query(
    'SELECT modo_auto FROM gestor_config WHERE festival_id = ?',
    [festivalId]
  );
  return rows.length > 0 ? Boolean(rows[0].modo_auto) : true;
}

async function getBotCompraDashboard(festivalId, periodo = 'festival') {
  const normalizedFestivalId = Number(festivalId);
  const normalizedPeriodo = normalizeBotPeriodo(periodo);
  const periodClause = getBotPeriodClause(normalizedPeriodo, 'pe');
  const timeBucket = getBotTimeBucket(normalizedPeriodo, 'pe');
  const modoAuto = await getGestorModoAuto(normalizedFestivalId);

  const [decisiones] = await db.query(
    `SELECT d.*,
            p.nombre AS puesto_nombre,
            pr.nombre AS producto_nombre,
            TIMESTAMPDIFF(MINUTE, d.creado_en, NOW()) AS minutos_desde_creacion
     FROM decisiones_automaticas d
     LEFT JOIN puestos p ON p.id = d.puesto_id
     LEFT JOIN productos pr ON pr.id = d.producto_id
     WHERE d.festival_id = ?
       AND d.tipo IN ('descuento_producto', 'activar_promocion')
     ORDER BY d.creado_en DESC
     LIMIT 40`,
    [normalizedFestivalId]
  );

  const [promociones] = await db.query(
    `SELECT
       promo.id,
       promo.puesto_id,
       promo.producto_id,
       promo.titulo,
       promo.descripcion,
       promo.precio_promo,
       promo.tipo,
       promo.valor_descuento,
       promo.activa,
       promo.creado_en,
       promo.actualizado_en,
       pu.nombre AS puesto_nombre,
       pu.tipo AS puesto_tipo,
       prod.nombre AS producto_nombre,
       COALESCE(perf.usos, 0) AS usos,
       COALESCE(perf.unidades_vendidas, 0) AS unidades_vendidas,
       COALESCE(perf.ingresos_generados, 0) AS ingresos_generados,
       perf.ultimo_uso,
       ab.ventas_antes,
       ab.ventas_despues,
       ab.ganadora
     FROM promociones promo
     INNER JOIN puestos pu ON pu.id = promo.puesto_id
     LEFT JOIN productos prod ON prod.id = promo.producto_id
     LEFT JOIN (
       SELECT
         pi.promocion_id,
         COUNT(*) AS usos,
         COALESCE(SUM(pi.cantidad), 0) AS unidades_vendidas,
         COALESCE(SUM(pi.importe_total), 0) AS ingresos_generados,
         MAX(pe.creado_en) AS ultimo_uso
       FROM pedido_items pi
       INNER JOIN pedidos pe ON pe.id = pi.pedido_id
       INNER JOIN puestos ppe ON ppe.id = pe.puesto_id
       WHERE pi.promocion_id IS NOT NULL
         AND ppe.festival_id = ?
         AND pe.estado NOT IN ('cancelado')
         ${periodClause}
       GROUP BY pi.promocion_id
     ) perf ON perf.promocion_id = promo.id
     LEFT JOIN (
       SELECT
         producto_id,
         MAX(ventas_antes) AS ventas_antes,
         MAX(ventas_despues) AS ventas_despues,
         MAX(ganadora) AS ganadora
       FROM decisiones_automaticas
       WHERE festival_id = ?
         AND tipo = 'descuento_producto'
         AND producto_id IS NOT NULL
       GROUP BY producto_id
     ) ab ON ab.producto_id = promo.producto_id
     WHERE pu.festival_id = ?
       AND (
         promo.descripcion LIKE '%autom%'
         OR EXISTS (
           SELECT 1
           FROM decisiones_automaticas d
           WHERE d.festival_id = pu.festival_id
             AND d.tipo IN ('descuento_producto', 'activar_promocion')
             AND (
               (d.producto_id IS NOT NULL AND d.producto_id = promo.producto_id)
               OR (d.producto_id IS NULL AND d.puesto_id = promo.puesto_id)
             )
         )
       )
     ORDER BY promo.activa DESC, ingresos_generados DESC, usos DESC, promo.actualizado_en DESC, promo.id DESC
     LIMIT 50`,
    [normalizedFestivalId, normalizedFestivalId, normalizedFestivalId]
  );

  const [serieTemporal] = await db.query(
    `SELECT
       ${timeBucket.labelExpr} AS etiqueta,
       ${timeBucket.sortExpr} AS orden,
       COUNT(*) AS usos,
       COALESCE(SUM(pi.cantidad), 0) AS unidades,
       COALESCE(SUM(pi.importe_total), 0) AS ingresos
     FROM pedido_items pi
     INNER JOIN pedidos pe ON pe.id = pi.pedido_id
     INNER JOIN promociones promo ON promo.id = pi.promocion_id
     INNER JOIN puestos pu ON pu.id = pe.puesto_id
     WHERE pi.promocion_id IS NOT NULL
       AND pu.festival_id = ?
       AND pe.estado NOT IN ('cancelado')
       ${periodClause}
       AND (
         promo.descripcion LIKE '%autom%'
         OR EXISTS (
           SELECT 1
           FROM decisiones_automaticas d
           WHERE d.festival_id = pu.festival_id
             AND d.tipo IN ('descuento_producto', 'activar_promocion')
             AND (
               (d.producto_id IS NOT NULL AND d.producto_id = promo.producto_id)
               OR (d.producto_id IS NULL AND d.puesto_id = promo.puesto_id)
             )
         )
       )
     GROUP BY etiqueta, orden
     ORDER BY orden ASC`,
    [normalizedFestivalId]
  );

  const kpis = promociones.reduce((acc, promo) => {
    acc.promos_automaticas += 1;
    acc.promos_automaticas_activas += promo.activa ? 1 : 0;
    acc.usos_promociones += Number(promo.usos || 0);
    acc.unidades_vendidas += Number(promo.unidades_vendidas || 0);
    acc.ingresos_con_promocion += Number(promo.ingresos_generados || 0);
    return acc;
  }, {
    promos_automaticas: 0,
    promos_automaticas_activas: 0,
    decisiones_pendientes: decisiones.filter((decision) => decision.estado === 'pendiente').length,
    usos_promociones: 0,
    unidades_vendidas: 0,
    ingresos_con_promocion: 0
  });

  const promocionesConUso = [...promociones]
    .filter((promo) => Number(promo.usos || 0) > 0)
    .sort((left, right) => Number(right.ingresos_generados || 0) - Number(left.ingresos_generados || 0));

  return {
    periodo: normalizedPeriodo,
    modo_auto: modoAuto,
    actualizado_en: new Date().toISOString(),
    kpis,
    mejor_promocion: promocionesConUso[0] || null,
    peor_promocion: promocionesConUso.length > 0 ? promocionesConUso[promocionesConUso.length - 1] : null,
    decisiones,
    promociones,
    serie_temporal: serieTemporal.map((row) => ({
      etiqueta: row.etiqueta,
      usos: Number(row.usos || 0),
      unidades: Number(row.unidades || 0),
      ingresos: Number(row.ingresos || 0)
    }))
  };
}

// GET /api/gestor/bot-compras/dashboard?festival_id=X&periodo=hoy|7d|festival
app.get('/api/gestor/bot-compras/dashboard', auth, async (req, res) => {
  const { festival_id, periodo } = req.query;
  if (!festival_id) return res.status(400).json({ error: 'festival_id requerido' });

  try {
    const dashboard = await getBotCompraDashboard(festival_id, periodo);
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gestor/bot-compras/evaluar
app.post('/api/gestor/bot-compras/evaluar', auth, async (req, res) => {
  const { festival_id } = req.body;
  if (!festival_id) return res.status(400).json({ error: 'festival_id requerido' });

  try {
    const normalizedFestivalId = Number(festival_id);
    await generarDecisiones(normalizedFestivalId);

    const modoAuto = await getGestorModoAuto(normalizedFestivalId);
    let ejecutadas = 0;

    if (modoAuto) {
      const [pendientes] = await db.query(
        `SELECT *
         FROM decisiones_automaticas
         WHERE festival_id = ?
           AND estado = 'pendiente'
           AND tipo != 'reposicion_stock'`,
        [normalizedFestivalId]
      );

      for (const decision of pendientes) {
        await ejecutarDecision(decision);
        await db.query('UPDATE decisiones_automaticas SET estado = ? WHERE id = ?', ['ejecutada', decision.id]);
        ejecutadas += 1;
      }
    }

    await evaluarGanadoresAB(normalizedFestivalId);

    res.json({
      message: 'Bot de compra evaluado',
      modo_auto: modoAuto,
      ejecutadas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gestor/modo-auto?festival_id=X
app.get('/api/gestor/modo-auto', auth, async (req, res) => {
  const { festival_id } = req.query;
  if (!festival_id) return res.status(400).json({ error: 'festival_id requerido' });
  try {
    const [rows] = await db.query(
      'SELECT modo_auto FROM gestor_config WHERE festival_id = ?', [festival_id]
    );
    // Si no existe aún, devolvemos modo_auto = true (automático por defecto)
    res.json({ modo_auto: rows.length > 0 ? Boolean(rows[0].modo_auto) : true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gestor/modo-auto
app.put('/api/gestor/modo-auto', auth, async (req, res) => {
  const { festival_id, activo } = req.body;
  if (festival_id === undefined || activo === undefined)
    return res.status(400).json({ error: 'festival_id y activo requeridos' });
  try {
    await db.query(
      `INSERT INTO gestor_config (festival_id, modo_auto) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE modo_auto = VALUES(modo_auto)`,
      [festival_id, activo ? 1 : 0]
    );
    res.json({ message: `Modo ${activo ? 'automático' : 'manual'} activado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gestor/decisiones?festival_id=X
app.get('/api/gestor/decisiones', auth, async (req, res) => {
  const { festival_id } = req.query;
  if (!festival_id) return res.status(400).json({ error: 'festival_id requerido' });
  try {
    // 1. Generar decisiones nuevas según reglas
    await generarDecisiones(Number(festival_id));

    // 2. Leer modo del festival
    const [configRows] = await db.query(
      'SELECT modo_auto FROM gestor_config WHERE festival_id = ?', [festival_id]
    );
    const modoAuto = configRows.length > 0 ? Boolean(configRows[0].modo_auto) : true;

    // 3. Modo automático: ejecutar todas las pendientes excepto reposicion_stock (requiere acción manual)
    if (modoAuto) {
      const [pendientes] = await db.query(
        `SELECT * FROM decisiones_automaticas WHERE festival_id = ? AND estado = 'pendiente' AND tipo != 'reposicion_stock'`,
        [festival_id]
      );
      for (const d of pendientes) {
        await ejecutarDecision(d);
        await db.query(
          `UPDATE decisiones_automaticas SET estado = 'ejecutada' WHERE id = ?`, [d.id]
        );
      }
    }

    // 4. Evaluar ganadores de pares A/B maduros (>30 min ejecutados)
    await evaluarGanadoresAB(Number(festival_id));

    // 5. Devolver decisiones con info de puesto y producto
    const [decisiones] = await db.query(
      `SELECT d.*,
              p.nombre  AS puesto_nombre,
              pr.nombre AS producto_nombre,
              TIMESTAMPDIFF(MINUTE, d.creado_en, NOW()) AS minutos_desde_creacion
       FROM decisiones_automaticas d
       LEFT JOIN puestos   p  ON p.id  = d.puesto_id
       LEFT JOIN productos pr ON pr.id = d.producto_id
       WHERE d.festival_id = ?
       ORDER BY d.creado_en DESC
       LIMIT 50`,
      [festival_id]
    );
    res.json({ decisiones, modo_auto: modoAuto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gestor/decisiones/:id/aprobar
app.post('/api/gestor/decisiones/:id/aprobar', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM decisiones_automaticas WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Decisión no encontrada' });
    const decision = rows[0];
    if (decision.estado !== 'pendiente')
      return res.status(400).json({ error: 'La decisión ya fue procesada' });

    await ejecutarDecision(decision);
    await db.query(
      `UPDATE decisiones_automaticas SET estado = 'aprobada' WHERE id = ?`, [req.params.id]
    );
    res.json({ message: 'Decisión aprobada y ejecutada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gestor/decisiones/:id/rechazar
app.post('/api/gestor/decisiones/:id/rechazar', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT estado FROM decisiones_automaticas WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Decisión no encontrada' });
    if (rows[0].estado !== 'pendiente')
      return res.status(400).json({ error: 'La decisión ya fue procesada' });

    await db.query(
      `UPDATE decisiones_automaticas SET estado = 'rechazada' WHERE id = ?`, [req.params.id]
    );
    res.json({ message: 'Decisión rechazada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gestor/stock-minimos?festival_id=X — lista puestos con sus stock_minimo por materia prima
app.get('/api/gestor/stock-minimos', auth, async (req, res) => {
  const { festival_id } = req.query;
  if (!festival_id) return res.status(400).json({ error: 'festival_id requerido' });
  try {
    // DEBUG temporal
    const [dbgPuestos] = await db.query('SELECT id, nombre, festival_id FROM puestos WHERE festival_id = ?', [festival_id]);
    const [dbgStock]   = await db.query('SELECT COUNT(*) AS cnt FROM stock_puesto WHERE puesto_id IN (SELECT id FROM puestos WHERE festival_id = ?)', [festival_id]);
    console.log(`[stock-minimos] festival_id=${festival_id} puestos=${dbgPuestos.length} stock_rows=${dbgStock[0].cnt}`, dbgPuestos.map(p=>p.nombre));

    const [rows] = await db.query(
      `SELECT p.id AS puesto_id, p.nombre AS puesto_nombre,
              sp.materia_prima_id, mp.nombre AS mp_nombre, mp.unidad_medida,
              ROUND(sp.stock_minimo, 2) AS stock_minimo,
              ROUND(sp.stock_actual, 2) AS stock_actual
       FROM puestos p
       JOIN stock_puesto sp ON sp.puesto_id = p.id
       JOIN materias_primas mp ON mp.id = sp.materia_prima_id
       WHERE p.festival_id = ?
       ORDER BY p.nombre, mp.nombre`,
      [festival_id]
    );
    // Agrupar por puesto
    const puestosMap = {};
    for (const r of rows) {
      if (!puestosMap[r.puesto_id]) {
        puestosMap[r.puesto_id] = { puesto_id: r.puesto_id, puesto_nombre: r.puesto_nombre, items: [] };
      }
      puestosMap[r.puesto_id].items.push({
        materia_prima_id: r.materia_prima_id,
        mp_nombre:        r.mp_nombre,
        unidad_medida:    r.unidad_medida,
        stock_minimo:     Number(r.stock_minimo),
        stock_actual:     Number(r.stock_actual),
      });
    }
    res.json(Object.values(puestosMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gestor/stock-minimos — actualiza stock_minimo de una materia prima en un puesto
app.put('/api/gestor/stock-minimos', auth, async (req, res) => {
  const { puesto_id, materia_prima_id, stock_minimo } = req.body;
  if (puesto_id === undefined || materia_prima_id === undefined || stock_minimo === undefined)
    return res.status(400).json({ error: 'puesto_id, materia_prima_id y stock_minimo requeridos' });
  if (Number(stock_minimo) < 0) return res.status(400).json({ error: 'stock_minimo no puede ser negativo' });
  try {
    await db.query(
      'UPDATE stock_puesto SET stock_minimo = ? WHERE puesto_id = ? AND materia_prima_id = ?',
      [Number(stock_minimo), puesto_id, materia_prima_id]
    );
    res.json({ message: 'Stock mínimo actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/operador/stock/:puestoId/reposiciones-aprobadas
app.get('/api/operador/stock/:puestoId/reposiciones-aprobadas', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, descripcion, creado_en
       FROM decisiones_automaticas
       WHERE puesto_id = ? AND tipo = 'reposicion_stock' AND estado = 'aprobada'
       ORDER BY creado_en DESC`,
      [req.params.puestoId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/operador/decisiones/:id/ejecutar — operador confirma que repuso el stock
app.post('/api/operador/decisiones/:id/ejecutar', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE decisiones_automaticas SET estado = 'ejecutada' WHERE id = ? AND tipo = 'reposicion_stock' AND estado = 'aprobada'`,
      [req.params.id]
    );
    res.json({ message: 'Reposición confirmada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nota: El app.listen() se ejecuta dentro del callback sshClient.on('ready')
