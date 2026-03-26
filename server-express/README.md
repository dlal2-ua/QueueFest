# Backend Express - QueueFest

Este es el backend profesional adaptado para el despliegue en el servidor Oracle VM (`143.47.35.13`).

## Requisitos
- Node.js v18+
- MySQL Server

## Instalación
1. Copia esta carpeta al servidor.
2. Instala dependencias: `npm install`
3. Configura las variables de entorno (puedes usar un `.env` o variables de sistema):
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET`
   - `PORT` (por defecto 3000)

## Endpoints Implementados (APP-005)
- `GET /api/pedidos/:id`: Obtiene detalle completo (items + puesto).
- `PATCH /api/pedidos/:id/estado`: Actualización controlada de estados.
- `GET /api/pedidos/mis-pedidos`: Historial personal.
- `POST /api/pedidos`: Creación transaccional de pedidos.
