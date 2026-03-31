# Proyecto QueueFest (Frontend + Backend)

Aplicación Full-Stack para gestión de pedidos y filas en eventos, compuesta por un **Frontend en React (Vite)** y un **Backend en Node.js (Express) con túnel TCP/SSH** para la base de datos MySQL desplegada en Oracle VM (143.47.35.13).

---

## 🚀 Instalación y Arranque Rápido (Windows)

Hemos preparado un script para hacer toda la instalación y arranque con **1 solo clic**:

1. Haz doble clic en el script **arrancar.bat** (situado en la raíz del proyecto).
2. El script se encargará automáticamente de:
   - Instalar dependencias del frontend (pnpm).
   - Instalar dependencias del backend (npm).
   - Generar las claves VAPID para notificaciones Push automáticas.
   - Levantar el frontend en una ventana web.
   - Levantar el backend en el puerto 3000.

⚠️ **IMPORTANTE ANTES DE ARRANCAR: CONFIGURAR LA LLAVE SSH DE BASE DE DATOS** ⚠️
Para que el Backend pueda conectarse a la Base de Datos, necesitas configurarle tu llave SSH.

1. Abre el archivo: server-backend/index.js
2. Localiza la línea donde se define privateKeyPath (sobre la línea 17).
3. Cámbiala para que apunte a la ruta ABSOLUTA REAL de tu ordenador. Por ejemplo:
   const privateKeyPath = 'C:\\Usuari\\Juan\\ssh-key-2026-03-03.key';
   *(Recuerda usar la doble barra inversa en las rutas en Windows)*

---

## 🛠️ Levantamiento Manual (si el script no te sirve)

### 1. Frontend (React/Vite)
Desde la raíz del proyecto:
pnpm install
pnpm run dev

### 2. Backend (Node/Express)
Abre otra terminal exclusiva para el backend:
cd server-backend
npm install
npx web-push generate-vapid-keys --format dotenv > .env
node index.js

### 3. Pagos del rol usuario
El proyecto soporta ahora dos modos de pago para desarrollo:

- `PAYMENT_PROVIDER=mock`: crea pedidos gratis sin salir de la app.
- `PAYMENT_PROVIDER=stripe`: usa Stripe Checkout.

Para que Stripe siga siendo gratuito en desarrollo, usa siempre claves `test`:

```env
PAYMENT_PROVIDER=stripe
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Si no quieres depender de Stripe mientras desarrollas, deja:

```env
PAYMENT_PROVIDER=mock
FRONTEND_URL=http://localhost:5173
```

Con Stripe en modo test puedes hacer pedidos completos sin cobros reales.
