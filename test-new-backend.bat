@echo off
echo 🔧 Test de la nouvelle version du backend...

echo 📁 Création du dossier de test...
if not exist test-data mkdir test-data

echo 🔧 Test avec les variables d'environnement de production...
set NODE_ENV=production
set DATABASE_PATH=./test-data/emynopass.db
set JWT_SECRET=test-secret
set PORT=3001
set FRONTEND_URL=https://emynona.cloud

echo 🚀 Démarrage du backend de test...
echo Variables d'environnement:
echo - NODE_ENV: %NODE_ENV%
echo - DATABASE_PATH: %DATABASE_PATH%
echo - JWT_SECRET: %JWT_SECRET%
echo.

echo ⏰ Le backend va démarrer pour 15 secondes...
start /b node dist/index.js

echo Attente de 15 secondes pour voir les logs...
timeout /t 15 /nobreak

echo.
echo 🛑 Arrêt du backend de test...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 📊 Vérification des fichiers créés:
if exist test-data\emynopass.db (
    echo ✅ Base de données créée: test-data\emynopass.db
    dir test-data\emynopass.db
) else (
    echo ❌ Base de données non créée
)

echo.
echo 🧹 Nettoyage...
if exist test-data rmdir /s /q test-data

echo ✅ Test terminé
pause
