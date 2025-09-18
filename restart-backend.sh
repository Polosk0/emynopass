#!/bin/bash

echo "🔄 Redémarrage complet du backend..."

# Arrêter tous les services
docker-compose down

# Nettoyer les conteneurs
docker system prune -f

# Reconstruire le backend
docker-compose build backend

# Redémarrer tous les services
docker-compose up -d

# Attendre que les services démarrent
sleep 10

# Vérifier le statut
docker-compose ps

echo "✅ Redémarrage terminé !"
