#!/bin/bash

echo "========================================================="
echo "      Iniciando aplicacion QueueFest (Frontend + Backend)"
echo "========================================================="
echo ""

echo "[1/3] Instalando dependencias del Frontend (pnpm)"
pnpm install

echo ""
echo "[2/3] Instalando dependencias del Backend (npm)"
cd server-backend || exit
npm install

echo ""
echo "[3/3] Generando claves VAPID para notificaciones Push si no existen"
if [ ! -f .env ]; then
    echo "Creando archivo .env con claves VAPID generadas automaticamente..."
    npx web-push generate-vapid-keys --format dotenv > .env
fi
cd ..

echo ""
echo "========================================================="
echo " Todo instalado. Levantando servicios en segundo plano..."
echo " Asegurate de haber configurado la ruta de la llave SSH "
echo " en el archivo server-backend/index.js antes de continuar."
echo "========================================================="
read -p "Presiona Enter para continuar..."

# Arrancar el backend en segundo plano (&)
echo "Iniciando Backend..."
(cd server-backend && node index.js) &
BACKEND_PID=$!

# Arrancar el frontend en segundo plano (&)
echo "Iniciando Frontend..."
pnpm run dev &
FRONTEND_PID=$!

echo ""
echo "Servicios arrancados:"
echo "- Frontend: http://localhost:5174/ (o el puerto que asigne Vite)"
echo "- Backend: http://localhost:3000/"
echo ""
echo "========================================================="
echo " Ambos servicios están corriendo en esta misma terminal."
echo " Para DETENER todo, simplemente presiona Ctrl + C."
echo "========================================================="

# Esto asegura que si presionas Ctrl+C, se cierren tanto el backend como el frontend
trap "echo 'Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# Mantener el script corriendo para ver los logs de ambos servicios
wait