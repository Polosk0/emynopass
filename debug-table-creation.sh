#!/bin/bash

echo "🔍 Diagnostic approfondi de la création de table..."

echo "🛑 Arrêt des conteneurs..."
docker-compose down

echo "🔧 Entrer dans le conteneur pour diagnostic manuel..."
docker-compose run --rm backend sh -c "
echo '🔧 [DEBUG] Diagnostic manuel dans le conteneur...'
echo '📁 Vérification des fichiers:'
ls -la /app/
echo ''
echo '📁 Vérification dist:'
ls -la /app/dist/
echo ''
echo '📁 Vérification data:'
ls -la /app/data/
echo ''
echo '🔧 Test de SQLite directement:'
sqlite3 /app/data/emynopass.db 'SELECT 1;'
echo ''
echo '🔧 Test de création de table simple:'
sqlite3 /app/data/emynopass.db 'CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY);'
echo 'Table test créée'
echo ''
echo '🔧 Vérification de la table:'
sqlite3 /app/data/emynopass.db '.tables'
echo ''
echo '🔧 Test Node.js simple:'
node -e 'console.log(\"Node.js fonctionne\")'
echo ''
echo '🔧 Test de chargement du module database:'
node -e 'const db = require(\"./dist/database.js\"); console.log(\"Module database chargé\")'
echo ''
echo '🔧 Test de création de table via Node.js:'
node -e '
const sqlite3 = require(\"sqlite3\");
const db = new sqlite3.Database(\"/app/data/emynopass.db\");
db.run(\"CREATE TABLE IF NOT EXISTS test_node (id INTEGER PRIMARY KEY)\", (err) => {
  if (err) {
    console.error(\"Erreur:\", err);
  } else {
    console.log(\"Table créée via Node.js\");
  }
  db.close();
});
'
echo ''
echo '🔧 Test complet du backend (5 secondes):'
timeout 5s node dist/index.js || echo 'Backend arrêté après 5 secondes'
"
