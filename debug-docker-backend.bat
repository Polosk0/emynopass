@echo off
echo 🔍 Débogage du backend Docker...
echo.

echo 🛑 Arrêt des conteneurs existants:
docker-compose down
echo.

echo 🧹 Nettoyage des images:
docker system prune -f
echo.

echo 🔨 Reconstruction de l'image backend:
docker-compose build --no-cache backend
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de la construction de l'image
    exit /b 1
)
echo ✅ Image reconstruite avec succès
echo.

echo 🚀 Démarrage du backend seul pour test:
docker-compose up backend
echo.

echo 📊 Si le conteneur redémarre, utilisez ces commandes pour analyser:
echo.
echo 1. Voir les logs en temps réel:
echo    docker-compose logs -f backend
echo.
echo 2. Entrer dans le conteneur pour déboguer:
echo    docker-compose exec backend sh
echo.
echo 3. Vérifier les fichiers dans le conteneur:
echo    docker-compose exec backend ls -la /app/
echo    docker-compose exec backend ls -la /app/dist/
echo    docker-compose exec backend ls -la /app/data/
echo.
echo 4. Tester la base de données:
echo    docker-compose exec backend sqlite3 /app/data/emynopass.db ".tables"
echo.
echo 5. Vérifier les permissions:
echo    docker-compose exec backend ls -la /app/data/
echo.
echo 6. Tester manuellement le démarrage:
echo    docker-compose exec backend node dist/index.js
echo.

pause
