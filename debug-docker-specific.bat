@echo off
echo 🔍 Diagnostic spécifique Docker...

echo 🛑 Arrêt des conteneurs...
docker-compose down

echo 🧹 Nettoyage des images...
docker system prune -f

echo 🔨 Reconstruction complète...
docker-compose build --no-cache backend

echo 📊 Vérification de l'image construite...
docker images | findstr emynopass

echo 🚀 Démarrage avec logs détaillés...
docker-compose up backend

echo.
echo 📋 Si le problème persiste, utilisez ces commandes de diagnostic:
echo.
echo 1. Entrer dans le conteneur:
echo    docker-compose exec backend sh
echo.
echo 2. Vérifier les fichiers:
echo    docker-compose exec backend ls -la /app/
echo    docker-compose exec backend ls -la /app/dist/
echo    docker-compose exec backend ls -la /app/data/
echo.
echo 3. Tester manuellement:
echo    docker-compose exec backend node dist/index.js
echo.
echo 4. Vérifier les permissions:
echo    docker-compose exec backend whoami
echo    docker-compose exec backend id
echo.
echo 5. Vérifier la mémoire:
echo    docker stats emynopass-backend

pause
