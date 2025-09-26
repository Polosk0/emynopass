#!/bin/bash
echo '🔧 CORRECTION SCHÉMA POSTGRESQL - EMYNOPASS'
echo '============================================'
echo ''

# Arrêter les services
echo '🛑 Arrêt des services...'
docker-compose down
echo ''

# Démarrer PostgreSQL
echo '🚀 Démarrage PostgreSQL...'
docker-compose up -d postgres
sleep 10
echo ''

# Corriger le schéma de la table users
echo '📊 Correction table users...'
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS isDemo BOOLEAN DEFAULT false;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS isTemporaryDemo BOOLEAN DEFAULT false;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS demoExpiresAt TEXT;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS createdAt TEXT DEFAULT CURRENT_TIMESTAMP;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS updatedAt TEXT DEFAULT CURRENT_TIMESTAMP;"
echo '✅ Table users corrigée'
echo ''

# Corriger le schéma de la table files
echo '📊 Correction table files...'
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE files ADD COLUMN IF NOT EXISTS isEncrypted BOOLEAN DEFAULT false;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE files ADD COLUMN IF NOT EXISTS uploadedAt TEXT DEFAULT CURRENT_TIMESTAMP;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE files ADD COLUMN IF NOT EXISTS expiresAt TEXT;"
echo '✅ Table files corrigée'
echo ''

# Vérifier le schéma
echo '📋 Vérification du schéma...'
echo 'Table users:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "\d users"
echo ''
echo 'Table files:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "\d files"
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

echo '🎉 CORRECTION SCHÉMA TERMINÉE'
