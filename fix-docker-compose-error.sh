#!/bin/bash
echo '🔧 CORRECTION ERREUR DOCKER COMPOSE - EMYNOPASS'
echo '==============================================='
echo ''

# Arrêter tous les services
echo '🛑 Arrêt de tous les services...'
docker-compose down
echo ''

# Supprimer tous les conteneurs
echo '🗑️ Suppression de tous les conteneurs...'
docker container prune -f
echo ''

# Supprimer toutes les images
echo '🗑️ Suppression de toutes les images...'
docker image prune -f
echo ''

# Supprimer les volumes orphelins
echo '🗑️ Suppression des volumes orphelins...'
docker volume prune -f
echo ''

# Redémarrer Docker
echo '🔄 Redémarrage de Docker...'
sudo systemctl restart docker
sleep 15
echo ''

# Vérifier que Docker fonctionne
echo '✅ Vérification de Docker...'
docker --version
docker-compose --version
echo ''

# Reconstruire les services
echo '🚀 Reconstruction des services...'
docker-compose up -d --build
echo ''

# Attendre le démarrage
echo '⏳ Attente du démarrage (90s)...'
sleep 90
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

echo '🎉 CORRECTION DOCKER COMPOSE TERMINÉE'
