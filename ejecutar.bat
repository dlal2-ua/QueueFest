@echo off
setlocal
cd /d "%~dp0"

echo =========================================================
echo       QueueFest - Frontend + Backend (API + Admin)
echo =========================================================
echo.

cd /d "%~dp0"
start "QueueFest - Frontend" cmd /k npm run dev

cd /d "%~dp0server-backend"
start "QueueFest - Backend API" cmd /k node index.js
start "QueueFest - Admin Dashboard" cmd /k node .\index-adminDashboard.js

echo Ventanas abiertas: frontend (npm run dev), API (index.js), admin (index-adminDashboard.js).
echo Puedes cerrar esta ventana.
endlocal
