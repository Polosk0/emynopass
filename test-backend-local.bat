@echo off
echo 🔧 Test du backend en local avant déploiement Docker...
echo.

echo 📋 Vérifications préliminaires:
echo - Node.js version:
node --version
echo - NPM version:
npm --version
echo.

echo 📁 Vérification de la structure:
if not exist backend (
    echo ❌ Dossier backend manquant
    exit /b 1
)

if not exist backend\package.json (
    echo ❌ backend/package.json manquant
    exit /b 1
)

if not exist backend\src\index.ts (
    echo ❌ backend/src/index.ts manquant
    exit /b 1
)

echo ✅ Structure des fichiers OK
echo.

echo 📦 Installation des dépendances:
cd backend
call npm ci
if %errorlevel% neq 0 (
    echo ❌ Erreur installation dépendances
    exit /b 1
)
echo ✅ Dépendances installées
echo.

echo 🔨 Compilation TypeScript:
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Erreur compilation
    exit /b 1
)
echo ✅ Compilation réussie
echo.

echo 🧪 Test de démarrage du serveur (5 secondes):
echo Démarrage du serveur en arrière-plan...
start /b node dist/index.js

echo Attente de 5 secondes...
timeout /t 5 /nobreak >nul

echo Test de la route /health:
curl -f http://localhost:3001/health
if %errorlevel% equ 0 (
    echo ✅ Serveur répond correctement
) else (
    echo ❌ Serveur ne répond pas
)

echo.
echo 🛑 Arrêt du serveur de test:
taskkill /f /im node.exe >nul 2>&1

echo.
echo ✅ Test local terminé
echo Le backend est prêt pour le déploiement Docker
pause
