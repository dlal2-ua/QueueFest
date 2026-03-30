@echo off
echo =========================================================
echo       Iniciando aplicacion QueueFest (Frontend + Backend)
echo =========================================================

echo.
echo [1/3] Instalando dependencias del Frontend (pnpm)
call pnpm install

echo.
echo [2/3] Instalando dependencias del Backend (npm)
cd server-backend
call npm install

echo.
echo [3/3] Generando claves VAPID para notificaciones Push si no existen
if not exist .env (
    echo Creando archivo .env con claves VAPID generadas automaticamente...
    call npx web-push generate-vapid-keys --format dotenv > .env
    echo. >> .env
    echo SSH_PRIVATE_KEY_PATH=PON TU RUTA A LA CLAVE PRIVADA QUE PASO EL ALE: DJ BOBO>> .env
)
cd ..

echo.
echo =========================================================
echo  Todo instalado. Levantando servicios en segundo plano...
echo  Asegurate de haber configurado la ruta de la llave SSH 
echo  en el archivo server-backend/.env antes de continuar.
echo =========================================================
pause

:: Arrancar el backend en una nueva ventana
start "Backend QueueFest" cmd /c "cd server-backend && node index.js && pause"

:: Arrancar el frontend en la ventana actual (o en otra nueva)
start "Frontend QueueFest" cmd /c "pnpm run dev && pause"

echo.
echo Servicios arrancados:
echo - Frontend: http://localhost:5174/ (o el puerto que asigne Vite)
echo - Backend: http://localhost:3000/
echo.
echo Puedes cerrar esta ventana.
