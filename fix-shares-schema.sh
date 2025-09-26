#!/bin/bash
echo '🔧 CORRECTION SCHÉMA PARTAGES - EMYNOPASS'
echo '=========================================='
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

# Corriger le schéma de la table shares
echo '📊 Correction table shares...'
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE shares ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT true;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE shares ADD COLUMN IF NOT EXISTS createdAt TEXT DEFAULT CURRENT_TIMESTAMP;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE shares ADD COLUMN IF NOT EXISTS title TEXT;"
docker-compose exec postgres psql -U emynopass -d emynopass -c "ALTER TABLE shares ADD COLUMN IF NOT EXISTS description TEXT;"
echo '✅ Table shares corrigée'
echo ''

# Vérifier le schéma
echo '📋 Vérification du schéma shares:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "\d shares"
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

echo '🎉 CORRECTION SCHÉMA PARTAGES TERMINÉE'
