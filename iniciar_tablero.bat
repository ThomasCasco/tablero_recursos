@echo off
title Tablero Monitor Recursos IMSA
echo.
echo ========================================
echo  TABLERO MONITOR RECURSOS IMSA
echo ========================================
echo.

cd /d "%~dp0"

echo 📦 Verificando dependencias...
if not exist "node_modules" (
    echo ⚠️  Instalando dependencias por primera vez...
    npm install
    if errorlevel 1 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

echo.
echo 🚀 Iniciando servidor con PM2...
npm run pm2:start

if errorlevel 1 (
    echo.
    echo ❌ Error iniciando el servidor
    echo 🔍 Verificando si PM2 está instalado...
    pm2 --version >nul 2>&1
    if errorlevel 1 (
        echo ⚠️  PM2 no está instalado. Instalando...
        npm install -g pm2
        echo ✅ PM2 instalado. Reintentando...
        npm run pm2:start
    )
)

echo.
echo ✅ Servidor iniciado exitosamente!
echo.
echo 🌐 Acceso local: http://localhost:5490
echo 🏢 Acceso intranet: http://[IP-SERVIDOR]:5490
echo.
echo 📊 Para ver logs: npm run pm2:logs
echo 🔄 Para reiniciar: npm run pm2:restart
echo 🛑 Para detener: npm run pm2:stop
echo.
pause 