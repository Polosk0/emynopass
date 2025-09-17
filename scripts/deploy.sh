#!/bin/bash

# Script de déploiement en production
echo "🚀 Déploiement en production..."

# Vérifier les variables d'environnement
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant. Veuillez le créer avant le déploiement."
    exit 1
fi

# Arrêter les services existants
echo "🛑 Arrêt des services existants..."
docker-compose down

# Pull des dernières images
echo "📥 Récupération des dernières images..."
docker-compose pull

# Build des images locales
echo "🔨 Build des images..."
docker-compose build --no-cache

# Démarrer les services
echo "🚀 Démarrage des services..."
docker-compose --profile production up -d

# Attendre que les services soient prêts
echo "⏳ Attente des services..."
sleep 30

# Vérifier le statut des services
echo "🔍 Vérification du statut..."
docker-compose ps

# Exécuter les migrations en production
echo "🗄️ Exécution des migrations..."
docker-compose exec backend npx prisma migrate deploy

# Vérifier la santé des services
echo "🏥 Vérification de la santé des services..."
curl -f http://localhost:3001/api/health || echo "❌ Backend non accessible"
curl -f http://localhost:3000 || echo "❌ Frontend non accessible"

echo "✅ Déploiement terminé!"
echo ""
echo "🌐 Application accessible sur:"
echo "   http://localhost (avec Nginx)"
echo "   http://localhost:3000 (Frontend direct)"
echo "   http://localhost:3001/api (Backend direct)"
