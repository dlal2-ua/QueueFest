const Stripe = require('stripe');

function createHttpError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createPaymentsModule({
  frontendUrl = 'http://localhost:5173',
  paymentProvider = 'mock',
  stripeSecretKey,
  stripeWebhookSecret
}) {
  const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

  if (paymentProvider === 'stripe' && !stripe) {
    console.warn('WARN: PAYMENT_PROVIDER=stripe pero STRIPE_SECRET_KEY no esta configurada.');
  }

  if (stripe && !stripeWebhookSecret) {
    console.warn('WARN: STRIPE_WEBHOOK_SECRET missing. El cobro Stripe no podra confirmarse por webhook.');
  }

  function ensureStripeConfigured() {
    if (!stripe) {
      throw createHttpError('Stripe no esta configurado en el servidor', 503);
    }
  }

  function toStripeAmount(amount) {
    return Math.round(Number(amount) * 100);
  }

  async function initDb(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        puesto_id INT NOT NULL,
        provider VARCHAR(30) NOT NULL,
        provider_session_id VARCHAR(255) NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'created',
        pedido_id INT NULL,
        total DECIMAL(10,2) NOT NULL,
        items_json LONGTEXT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        pagado_en TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE CASCADE
      )
    `);
    console.log('SQL Migration payment_sessions checked.');
  }

  async function validateOrderPayload(conn, puestoId, rawItems) {
    if (!Number.isInteger(Number(puestoId))) {
      throw createHttpError('Puesto invalido', 400);
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw createHttpError('El carrito esta vacio', 400);
    }

    const [puestos] = await conn.query(
      'SELECT id, nombre, abierto FROM puestos WHERE id = ?',
      [Number(puestoId)]
    );

    if (puestos.length === 0) {
      throw createHttpError('Puesto no encontrado', 404);
    }

    if (puestos[0].abierto === 0) {
      throw createHttpError('Cocina saturada temporalmente, intentalo en unos minutos', 429);
    }

    const normalizedItems = rawItems.map((item) => ({
      producto_id: Number(item.producto_id),
      cantidad: Number(item.cantidad)
    }));

    if (normalizedItems.some((item) => !Number.isInteger(item.producto_id) || !Number.isInteger(item.cantidad) || item.cantidad <= 0)) {
      throw createHttpError('Formato de carrito invalido', 400);
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.producto_id))];
    const [products] = await conn.query(
      'SELECT id, puesto_id, nombre, descripcion, precio, precio_dinamico, activo, stock FROM productos WHERE id IN (?)',
      [productIds]
    );

    const productsById = new Map(products.map((product) => [Number(product.id), product]));
    let total = 0;

    const items = normalizedItems.map((item) => {
      const product = productsById.get(item.producto_id);

      if (!product) {
        throw createHttpError(`Producto ${item.producto_id} no encontrado`, 404);
      }

      if (Number(product.puesto_id) !== Number(puestoId)) {
        throw createHttpError('Todos los productos deben pertenecer al mismo puesto', 400);
      }

      if (!product.activo) {
        throw createHttpError(`El producto ${product.nombre} ya no esta disponible`, 400);
      }

      if (product.stock != null && Number(product.stock) < item.cantidad) {
        throw createHttpError(`Stock insuficiente para ${product.nombre}`, 400);
      }

      const precioUnitario = Number(product.precio_dinamico) > 0 ? Number(product.precio_dinamico) : Number(product.precio);
      total += precioUnitario * item.cantidad;

      return {
        producto_id: Number(product.id),
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
        nombre: product.nombre,
        descripcion: product.descripcion || ''
      };
    });

    return {
      puesto: puestos[0],
      items,
      total: Number(total.toFixed(2))
    };
  }

  async function createPedidoTransaction(conn, usuarioId, puestoId, items, total) {
    const [result] = await conn.query(
      'INSERT INTO pedidos (usuario_id, puesto_id, total) VALUES (?, ?, ?)',
      [usuarioId, puestoId, total]
    );

    const pedidoId = result.insertId;

    for (const item of items) {
      await conn.query(
        'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
      );
    }

    const puntos = Math.floor(total);
    await conn.query(
      'INSERT INTO loyalty (usuario_id, puntos_total) VALUES (?, ?) ON DUPLICATE KEY UPDATE puntos_total = puntos_total + ?',
      [usuarioId, puntos, puntos]
    );

    return { pedidoId, puntos };
  }

  async function createMockOrder(db, usuarioId, puestoId, rawItems) {
    const conn = await db.getConnection();
    let transactionStarted = false;

    try {
      const validated = await validateOrderPayload(conn, puestoId, rawItems);
      await conn.beginTransaction();
      transactionStarted = true;
      const result = await createPedidoTransaction(conn, usuarioId, puestoId, validated.items, validated.total);
      await conn.commit();

      return {
        provider: 'mock',
        payment_status: 'paid',
        pedido_id: result.pedidoId,
        puntos_ganados: result.puntos,
        total: validated.total
      };
    } catch (err) {
      if (transactionStarted) {
        await conn.rollback();
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  async function markPaymentSessionStatus(db, providerSessionId, status) {
    if (!db) return;

    await db.query(
      'UPDATE payment_sessions SET status = ? WHERE provider_session_id = ? AND pedido_id IS NULL',
      [status, providerSessionId]
    );
  }

  async function finalizeStripePayment(db, sessionId, providedSession = null) {
    ensureStripeConfigured();

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        'SELECT * FROM payment_sessions WHERE provider = ? AND provider_session_id = ? FOR UPDATE',
        ['stripe', sessionId]
      );

      if (rows.length === 0) {
        throw createHttpError('Sesion de pago no encontrada', 404);
      }

      const paymentSession = rows[0];

      if (paymentSession.pedido_id) {
        await conn.commit();
        return {
          status: paymentSession.status,
          pedido_id: paymentSession.pedido_id
        };
      }

      const stripeSession = providedSession || await stripe.checkout.sessions.retrieve(sessionId);
      const status = stripeSession.payment_status === 'paid' ? 'paid' : (stripeSession.status || 'open');

      await conn.query(
        'UPDATE payment_sessions SET status = ? WHERE id = ?',
        [status, paymentSession.id]
      );

      if (stripeSession.payment_status !== 'paid') {
        await conn.commit();
        return { status, pedido_id: null };
      }

      const items = JSON.parse(paymentSession.items_json);
      const result = await createPedidoTransaction(
        conn,
        paymentSession.usuario_id,
        paymentSession.puesto_id,
        items,
        Number(paymentSession.total)
      );

      await conn.query(
        'UPDATE payment_sessions SET status = ?, pedido_id = ?, pagado_en = NOW() WHERE id = ?',
        ['paid', result.pedidoId, paymentSession.id]
      );

      await conn.commit();

      return {
        status: 'paid',
        pedido_id: result.pedidoId,
        puntos_ganados: result.puntos
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  function registerWebhookRoute(app, getDb) {
    app.post('/api/stripe/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
      if (!stripe || !stripeWebhookSecret) {
        return res.status(503).json({ error: 'Stripe webhook no configurado' });
      }

      const signature = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
      } catch (err) {
        console.error('Webhook Stripe rechazado:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        const db = getDb();
        if (!db) {
          throw createHttpError('Base de datos no inicializada', 503);
        }

        if (event.type === 'checkout.session.completed') {
          await finalizeStripePayment(db, event.data.object.id, event.data.object);
        } else if (event.type === 'checkout.session.expired') {
          await markPaymentSessionStatus(db, event.data.object.id, 'expired');
        }

        res.json({ received: true });
      } catch (err) {
        console.error('Error procesando webhook Stripe:', err);
        res.status(err.statusCode || 500).json({ error: 'Error procesando webhook Stripe' });
      }
    });
  }

  function registerRoutes(app, auth, getDb) {
    app.get('/api/payments/config', auth, async (req, res) => {
      res.json({
        provider: paymentProvider,
        mock_enabled: true,
        stripe_enabled: paymentProvider === 'stripe' && !!stripe
      });
    });

    app.post('/api/payments/create', auth, async (req, res) => {
      try {
        const db = getDb();
        if (!db) {
          throw createHttpError('Base de datos no inicializada', 503);
        }

        const puestoId = Number(req.body.puesto_id);
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const requestedProvider = req.body.provider === 'stripe' ? 'stripe' : 'mock';

        if (requestedProvider === 'mock' || paymentProvider !== 'stripe') {
          const result = await createMockOrder(db, req.user.id, puestoId, items);
          return res.status(201).json(result);
        }

        ensureStripeConfigured();

        const conn = await db.getConnection();

        try {
          const validated = await validateOrderPayload(conn, puestoId, items);
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            locale: 'es',
            success_url: `${frontendUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/payment?checkout_cancelled=1`,
            line_items: validated.items.map((item) => ({
              quantity: item.cantidad,
              price_data: {
                currency: 'eur',
                unit_amount: toStripeAmount(item.precio_unitario),
                product_data: {
                  name: item.nombre,
                  description: item.descripcion || undefined
                }
              }
            })),
            metadata: {
              usuario_id: String(req.user.id),
              puesto_id: String(puestoId)
            }
          });

          await conn.query(
            `INSERT INTO payment_sessions (usuario_id, puesto_id, provider, provider_session_id, status, total, items_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user.id,
              puestoId,
              'stripe',
              session.id,
              session.payment_status || session.status || 'open',
              validated.total,
              JSON.stringify(validated.items)
            ]
          );

          res.status(201).json({
            provider: 'stripe',
            payment_status: session.payment_status || session.status || 'open',
            checkout_url: session.url,
            session_id: session.id
          });
        } finally {
          conn.release();
        }
      } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
      }
    });

    app.get('/api/payments/session/:sessionId', auth, async (req, res) => {
      try {
        const db = getDb();
        if (!db) {
          throw createHttpError('Base de datos no inicializada', 503);
        }

        const { sessionId } = req.params;
        const [rows] = await db.query(
          'SELECT * FROM payment_sessions WHERE provider = ? AND provider_session_id = ? AND usuario_id = ?',
          ['stripe', sessionId, req.user.id]
        );

        if (rows.length === 0) {
          return res.status(404).json({ error: 'Sesion de pago no encontrada' });
        }

        let paymentSession = rows[0];

        if (stripe && !paymentSession.pedido_id && !['paid', 'expired'].includes(paymentSession.status)) {
          await finalizeStripePayment(db, sessionId);
          const [freshRows] = await db.query(
            'SELECT * FROM payment_sessions WHERE provider = ? AND provider_session_id = ? AND usuario_id = ?',
            ['stripe', sessionId, req.user.id]
          );
          paymentSession = freshRows[0];
        }

        res.json({
          provider: paymentSession.provider,
          status: paymentSession.status,
          pedido_id: paymentSession.pedido_id,
          total: Number(paymentSession.total)
        });
      } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
      }
    });
  }

  return {
    initDb,
    registerWebhookRoute,
    registerRoutes
  };
}

module.exports = {
  createPaymentsModule
};
