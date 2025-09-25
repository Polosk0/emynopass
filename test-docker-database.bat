@echo off
echo 🔧 Test de la base de données dans l'environnement Docker...

echo 📦 Copie du script de test dans le conteneur backend...
docker cp test-database-simple.js emynopass-backend:/app/

echo 🔧 Exécution du test dans le conteneur...
docker exec emynopass-backend node /app/test-database-simple.js

echo.
echo 📊 Si le test échoue, vérifiez les permissions:
echo docker exec emynopass-backend ls -la /app/data/
echo.
echo 🔍 Pour déboguer plus en détail:
echo docker exec -it emynopass-backend sh

pause
