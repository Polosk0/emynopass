#!/bin/bash
echo '🔧 CORRECTION POSTGRESQL - EMYNOPASS'
echo '===================================='
echo ''

# Arrêter les services
echo '🛑 Arrêt des services...'
docker-compose down
echo ''

# Créer le fichier .env pour PostgreSQL (production)
echo '📝 Création du fichier .env pour PostgreSQL...'
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://emynona.cloud
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=emynopass
DB_USER=emynopass
DB_PASSWORD=emynopass
EOF
echo '✅ Fichier .env créé pour PostgreSQL'
echo ''

# Corriger le schéma PostgreSQL
echo '🔧 Correction du schéma PostgreSQL...'
docker-compose up -d postgres
sleep 10

# Ajouter la colonne isDemo manquante
echo '📊 Ajout de la colonne isDemo...'
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS isDemo BOOLEAN DEFAULT 0;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS isTemporaryDemo BOOLEAN DEFAULT 0;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS demoExpiresAt TEXT;"
echo '✅ Colonnes ajoutées'
echo ''

# Redémarrer tous les services
echo '🚀 Redémarrage des services...'
docker-compose up -d --build
echo ''

# Attendre le démarrage
echo '⏳ Attente du démarrage (60s)...'
sleep 60
echo ''

# Vérifier le statut
echo '📊 Vérification du statut:'
docker-compose ps
echo ''

# Test de connectivité
echo '🔗 Test de connectivité:'
curl -f https://emynona.cloud/health || echo 'Health check échoué'
echo ''

# Test d'authentification
echo '🔐 Test d'authentification:'
curl -X POST https://emynona.cloud/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}' || echo 'Auth test échoué'
echo ''

echo '🎉 CORRECTION POSTGRESQL TERMINÉE'
