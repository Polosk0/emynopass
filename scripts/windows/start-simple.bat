@echo off
title FileShare - Demarrage Simple
color 0B
chcp 65001 >nul

echo.
echo [96m  ███████╗██╗██╗     ███████╗███████╗██╗  ██╗ █████╗ ██████╗ ███████╗[0m
echo [96m  ██╔════╝██║██║     ██╔════╝██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝[0m
echo [96m  █████╗  ██║██║     █████╗  ███████╗███████║███████║██████╔╝█████╗  [0m
echo [96m  ██╔══╝  ██║██║     ██╔══╝  ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  [0m
echo [96m  ██║     ██║███████╗███████╗███████║██║  ██║██║  ██║██║  ██║███████╗[0m
echo [96m  ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝[0m
echo.
echo [92m                    🚀 DÉMARRAGE RAPIDE 🚀[0m
echo.
echo ========================================================================

:: Aller à la racine du projet
cd /d "%~dp0..\.."

:: Vérifier qu'on est bien dans le bon dossier
if not exist "package.json" (
    echo [91m❌ Erreur: Impossible de trouver la racine du projet[0m
    echo [93m   Script exécuté depuis: %CD%[0m
    pause
    exit /b 1
)

:: Vérifications rapides
echo [94m🔍 Vérifications...[0m
node --version >nul 2>&1
if errorlevel 1 (
    echo [91m❌ Node.js requis![0m
    pause & exit /b 1
)

docker --version >nul 2>&1
if errorlevel 1 (
    echo [91m❌ Docker requis![0m
    pause & exit /b 1
)

echo [92m✅ Prérequis OK![0m
echo.

:: Configuration automatique
if not exist .env (
    echo [93m🔧 Configuration initiale...[0m
    npm install >nul 2>&1
    node scripts/setup-env.js
)

:: Installation des dépendances si nécessaire
if not exist node_modules (
    echo [93m📦 Installation dépendances racine...[0m
    npm install
)

if not exist backend\node_modules (
    echo [93m📦 Installation dépendances backend...[0m
    cd backend && npm install && cd ..
)

if not exist frontend\node_modules (
    echo [93m📦 Installation dépendances frontend...[0m
    cd frontend && npm install && cd ..
)

:: Démarrer Docker
echo [94m🐳 Docker...[0m
docker-compose up -d database redis >nul 2>&1
timeout /t 15 /nobreak >nul

:: Base de données
echo [94m🗄️ Base de données...[0m
cd backend
npx prisma generate >nul 2>&1
npx prisma migrate dev --name init >nul 2>&1
npx prisma db seed >nul 2>&1
cd ..

:: Services
echo [94m🚀 Services...[0m
start "Backend" /min cmd /c "cd backend && npm run dev"
timeout /t 5 /nobreak >nul
start "Frontend" /min cmd /c "cd frontend && npm run dev"

:: Attendre et vérifier
echo [93m⏳ Démarrage en cours...[0m
timeout /t 20 /nobreak >nul

:: Vérification rapide
echo [94m🏥 Vérification...[0m
node scripts/health-check.js 5

:: Ouvrir navigateur
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo [92m🎉 FileShare est prêt![0m
echo.
echo [96m🌐 URLs:[0m
echo    • App: http://localhost:3000
echo    • API: http://localhost:3001
echo.
echo [96m👤 Comptes test:[0m
echo    • admin@fileshare.local / admin123
echo    • test@fileshare.local  / test123
echo.
echo [93m🛑 Pour arrêter: scripts/windows/stop.bat[0m
echo.
pause
