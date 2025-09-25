#!/bin/bash

echo "🔍 Diagnostic spécifique environnement Docker..."

echo "🛑 Arrêt des conteneurs..."
docker-compose down

echo "🔧 Test de l'environnement Docker vs Local..."

echo "📋 Test local d'abord:"
cd backend
export NODE_ENV=production
export DATABASE_PATH=./test-docker/emynopass.db
export JWT_SECRET=test-secret
export PORT=3001
export FRONTEND_URL=https://emynona.cloud

mkdir -p test-docker

echo "🚀 Test local (10 secondes)..."
timeout 10s node dist/index.js &
LOCAL_PID=$!
sleep 10
kill $LOCAL_PID 2>/dev/null
echo "✅ Test local terminé"

cd ..

echo ""
echo "🔧 Diagnostic Docker approfondi..."
docker-compose run --rm backend sh -c "
echo '🔧 [DEBUG] Diagnostic environnement Docker...'
echo ''
echo '📊 Informations système:'
echo 'User: ' \$(whoami)
echo 'UID: ' \$(id -u)
echo 'GID: ' \$(id -g)
echo 'PWD: ' \$(pwd)
echo ''
echo '📁 Structure des fichiers:'
ls -la /app/
echo ''
echo '📁 Fichiers dist:'
ls -la /app/dist/
echo ''
echo '📁 Dossier data:'
ls -la /app/data/
echo ''
echo '🔧 Variables d'environnement:'
env | grep -E '(NODE_ENV|DATABASE_PATH|JWT_SECRET|PORT|FRONTEND_URL)'
echo ''
echo '🔧 Test SQLite direct:'
sqlite3 /app/data/emynopass.db 'SELECT 1;' && echo 'SQLite OK' || echo 'SQLite ERREUR'
echo ''
echo '🔧 Test Node.js:'
node -e 'console.log(\"Node.js version:\", process.version)'
echo ''
echo '🔧 Test de chargement du module:'
node -e 'console.log(\"Chargement database...\"); const db = require(\"./dist/database.js\"); console.log(\"Module chargé OK\")'
echo ''
echo '🔧 Test de création de table simple:'
node -e '
const sqlite3 = require(\"sqlite3\");
console.log(\"Création connexion SQLite...\");
const db = new sqlite3.Database(\"/app/data/emynopass.db\", (err) => {
  if (err) {
    console.error(\"Erreur connexion:\", err);
    process.exit(1);
  }
  console.log(\"Connexion SQLite OK\");
  
  console.log(\"Test de création table...\");
  db.run(\"CREATE TABLE IF NOT EXISTS test_simple (id INTEGER PRIMARY KEY)\", (err) => {
    if (err) {
      console.error(\"Erreur création table:\", err);
    } else {
      console.log(\"Table créée OK\");
    }
    
    console.log(\"Fermeture connexion...\");
    db.close((err) => {
      if (err) {
        console.error(\"Erreur fermeture:\", err);
      } else {
        console.log(\"Connexion fermée OK\");
      }
      process.exit(0);
    });
  });
});
'
echo ''
echo '🔧 Test du backend complet (15 secondes):'
timeout 15s node dist/index.js || echo 'Backend arrêté après 15 secondes'
"

echo ""
echo "🧹 Nettoyage..."
cd backend
rm -rf test-docker
cd ..
