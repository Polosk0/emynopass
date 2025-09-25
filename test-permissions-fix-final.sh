#!/bin/bash

echo "🔧 Test de la correction finale des permissions..."

echo "🛑 Arrêt des conteneurs..."
docker-compose down

echo "🔧 Correction des permissions sur l'hôte..."
sudo chown -R 1001:1001 ./backend/data/
sudo chmod -R 755 ./backend/data/

echo "🔨 Reconstruction..."
docker-compose build --no-cache backend

echo "🚀 Démarrage avec correction des permissions..."
echo "Le conteneur va maintenant s'exécuter avec l'utilisateur 1001:1001"
echo "qui correspond aux permissions des fichiers de données."
echo ""

docker-compose up backend

echo ""
echo "✅ Si le backend démarre complètement, le problème de permissions est définitivement résolu !"
