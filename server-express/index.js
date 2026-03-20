const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la base de datos (Placeholders para Oracle VM)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'queuefest'
};

let pool;

// Inicializar pool de conexiones
async function initDB() {
    pool = await mysql.createPool(dbConfig);
    console.log('Conectado a MySQL');
}

// Middleware de autenticación (JWT)
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No autorizado' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ============================================================
// RUTAS DE PEDIDOS (APP-005)
// ============================================================

const VALID_TRANSITIONS = {
    'pendiente': ['confirmado', 'cancelado'],
    'confirmado': ['preparando', 'cancelado'],
    'preparando': ['listo', 'cancelado'],
    'listo': ['entregado', 'cancelado'],
    'entregado': [],
    'cancelado': [],
};

// GET /api/pedidos/:id - Detalle completo de un pedido
app.get('/api/pedidos/:id', authMiddleware, async (req, res) => {
    try {
        const pedidoId = req.params.id;
        const usuarioId = req.user.id;

        // 1. Obtener pedido junto con información del puesto
        const [pedidos] = await pool.execute(`
            SELECT p.*, pu.nombre AS puesto_nombre, pu.tiempo_servicio_medio
            FROM pedidos p
            JOIN puestos pu ON p.puesto_id = pu.id
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
            const [ops] = await pool.execute('SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?', [pedido.puesto_id, usuarioId]);
            if (ops.length === 0) {
                return res.status(403).json({ error: 'No tienes permiso para ver los pedidos de este puesto' });
            }
        }

        // 2. Obtener items del pedido
        const [items] = await pool.execute(`
            SELECT pi.*, pr.nombre AS producto_nombre
            FROM pedido_items pi
            JOIN productos pr ON pi.producto_id = pr.id
            WHERE pi.pedido_id = ?
        `, [pedidoId]);

        pedido.items = items;

        res.json(pedido);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// PATCH /api/pedidos/:id/estado - Actualizar estado (Operador)
app.patch('/api/pedidos/:id/estado', authMiddleware, async (req, res) => {
    try {
        if (req.user.rol === 'usuario') {
            return res.status(403).json({ error: 'Solo personal autorizado puede cambiar el estado' });
        }

        const pedidoId = req.params.id;
        const { estado: nuevoEstado } = req.body;

        // Validar que el nuevo estado sea válido
        const estadosValidos = ['pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado'];
        if (!estadosValidos.includes(nuevoEstado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        // Obtener estado actual
        const [pedidos] = await pool.execute('SELECT estado, puesto_id FROM pedidos WHERE id = ?', [pedidoId]);
        if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

        const pedido = pedidos[0];
        const estadoActual = pedido.estado;

        // Validar permisos del operador para el puesto específico
        if (req.user.rol === 'operador') {
            const [ops] = await pool.execute('SELECT id FROM puesto_operadores WHERE puesto_id = ? AND usuario_id = ?', [pedido.puesto_id, req.user.id]);
            if (ops.length === 0) {
                return res.status(403).json({ error: 'No puedes gestionar pedidos de este puesto' });
            }
        }

        // Validar transición
        if (!VALID_TRANSITIONS[estadoActual]?.includes(nuevoEstado)) {
            return res.status(400).json({
                error: `Transición de estado no permitida: ${estadoActual} -> ${nuevoEstado}`
            });
        }

        // Actualizar
        await pool.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [nuevoEstado, pedidoId]);

        res.json({ message: 'Estado actualizado', id: pedidoId, nuevoEstado });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// GET /api/pedidos/mis-pedidos - Historial del usuario
app.get('/api/pedidos/mis-pedidos', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT p.*, pu.nombre AS puesto_nombre
            FROM pedidos p
            JOIN puestos pu ON p.puesto_id = pu.id
            WHERE p.usuario_id = ?
            ORDER BY p.creado_en DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST /api/pedidos - Crear un pedido
app.post('/api/pedidos', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { puesto_id, items, total } = req.body;
        const usuario_id = req.user.id;

        // 1. Insertar pedido
        const [resPedido] = await connection.execute(
            'INSERT INTO pedidos (usuario_id, puesto_id, total, estado) VALUES (?, ?, ?, "pendiente")',
            [usuario_id, puesto_id, total]
        );
        const pedidoId = resPedido.insertId;

        // 2. Insertar items
        for (const item of items) {
            await connection.execute(
                'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
            );
        }

        await connection.commit();
        res.status(201).json({ id: pedidoId, message: 'Pedido creado con éxito' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al crear pedido' });
    } finally {
        connection.release();
    }
});

// Arrancar servidor
const PORT = process.env.PORT || 3000;
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
});
