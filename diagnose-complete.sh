#!/bin/bash
echo '🔍 DIAGNOSTIC COMPLET - EMYNOPASS'
echo '================================='
echo ''

# Vérifier le statut des services
echo '📊 Statut des services:'
docker-compose ps
echo ''

# Vérifier les logs backend
echo '📄 Logs backend (dernières 30 lignes):'
docker-compose logs --tail=30 backend
echo ''

# Vérifier les logs PostgreSQL
echo '📄 Logs PostgreSQL (dernières 20 lignes):'
docker-compose logs --tail=20 postgres
echo ''

# Test de connectivité
echo '🔗 Test de connectivité:'
curl -f https://emynona.cloud/health || echo 'Health check échoué'
echo ''

# Test d'authentification admin
echo '🔐 Test authentification admin:'
curl -X POST https://emynona.cloud/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}' || echo 'Auth admin échoué'
echo ''

# Vérifier les utilisateurs en base
echo '👥 Utilisateurs en base:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "SELECT id, email, role, isActive, isDemo FROM users;" || echo 'Erreur requête utilisateurs'
echo ''

# Vérifier le schéma de la table users
echo '📋 Schéma table users:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "\d users" || echo 'Erreur schéma'
echo ''

echo '🎯 DIAGNOSTIC TERMINÉ'
