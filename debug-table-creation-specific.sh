#!/bin/bash

echo "🔍 Diagnostic spécifique de la création de table..."

echo "🛑 Arrêt des conteneurs..."
docker-compose down

echo "🔧 Test de création de table isolé..."
docker-compose run --rm backend sh -c "
echo '🔧 [DEBUG] Test de création de table isolé...'
echo ''
echo '📊 Informations sur la base de données:'
ls -la /app/data/
echo ''
echo '🔧 Test SQLite direct:'
sqlite3 /app/data/emynopass.db 'SELECT 1;' && echo 'SQLite fonctionne' || echo 'SQLite ERREUR'
echo ''
echo '🔧 Test de création de table simple:'
sqlite3 /app/data/emynopass.db 'CREATE TABLE IF NOT EXISTS test_simple (id INTEGER PRIMARY KEY);' && echo 'Table simple créée' || echo 'Erreur création table simple'
echo ''
echo '🔧 Vérification des tables:'
sqlite3 /app/data/emynopass.db '.tables'
echo ''
echo '🔧 Test de création de table complexe (comme users):'
sqlite3 /app/data/emynopass.db '
CREATE TABLE IF NOT EXISTS users_test (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT \"USER\",
  isActive INTEGER DEFAULT 1,
  isDemo INTEGER DEFAULT 0,
  isTemporaryDemo INTEGER DEFAULT 0,
  demoExpiresAt TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
' && echo 'Table users_test créée' || echo 'Erreur création table users_test'
echo ''
echo '🔧 Vérification des tables après création:'
sqlite3 /app/data/emynopass.db '.tables'
echo ''
echo '🔧 Test Node.js avec création de table:'
node -e '
const sqlite3 = require(\"sqlite3\");
console.log(\"Début test Node.js...\");
const db = new sqlite3.Database(\"/app/data/emynopass.db\", (err) => {
  if (err) {
    console.error(\"Erreur connexion:\", err);
    process.exit(1);
  }
  console.log(\"Connexion SQLite OK\");
  
  console.log(\"Création table via Node.js...\");
  db.run(\"CREATE TABLE IF NOT EXISTS test_node (id INTEGER PRIMARY KEY)\", (err) => {
    if (err) {
      console.error(\"Erreur création table Node.js:\", err);
    } else {
      console.log(\"Table créée via Node.js OK\");
    }
    
    console.log(\"Fermeture...\");
    db.close((err) => {
      if (err) {
        console.error(\"Erreur fermeture:\", err);
      } else {
        console.log(\"Fermeture OK\");
      }
      process.exit(0);
    });
  });
});
'
echo ''
echo '🔧 Test du backend avec timeout de 30 secondes:'
timeout 30s node dist/index.js || echo 'Backend arrêté après 30 secondes'
"
