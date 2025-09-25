#!/bin/bash

echo "🔧 Test de la correction des permissions..."

echo "🛑 Arrêt des conteneurs..."
docker-compose down

echo "🧹 Nettoyage..."
docker system prune -f

echo "🔨 Reconstruction avec correction des permissions..."
docker-compose build --no-cache backend

echo "📊 Vérification de l'image..."
docker images | grep emynopass

echo "🚀 Démarrage avec correction des permissions..."
echo "Surveillez les logs pour voir si le problème de permissions est résolu."
echo ""

docker-compose up backend

echo ""
echo "✅ Si le backend démarre complètement, le problème de permissions est résolu !"
