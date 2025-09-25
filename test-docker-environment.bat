@echo off
echo 🔧 Test de l'environnement Docker spécifique...

echo 📋 Vérification de l'environnement local d'abord...
cd backend
echo Test local du backend...
set NODE_ENV=production
set DATABASE_PATH=./test-docker-data/emynopass.db
set JWT_SECRET=test-secret
set PORT=3001
set FRONTEND_URL=https://emynona.cloud

if not exist test-docker-data mkdir test-docker-data

echo 🚀 Test local avec variables Docker...
timeout /t 5 /nobreak >nul
start /b node dist/index.js
timeout /t 10 /nobreak >nul
taskkill /f /im node.exe >nul 2>&1

echo ✅ Test local OK, maintenant test Docker...

cd ..

echo 🛑 Arrêt des conteneurs...
docker-compose down

echo 🧹 Nettoyage...
docker system prune -f

echo 🔨 Reconstruction avec diagnostics...
docker-compose build --no-cache backend

echo 📊 Vérification de l'image...
docker images | findstr emynopass

echo 🚀 Démarrage avec logs détaillés...
echo Surveillez les logs pour voir:
echo - Les vérifications de fichiers
echo - Les vérifications de permissions  
echo - Le démarrage du backend
echo.

docker-compose up backend

echo.
echo 🧹 Nettoyage local...
cd backend
if exist test-docker-data rmdir /s /q test-docker-data

pause
