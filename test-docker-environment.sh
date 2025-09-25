#!/bin/bash

echo "🔧 Test de l'environnement Docker spécifique..."

echo "📋 Vérification de l'environnement local d'abord..."
cd backend

echo "Test local du backend..."
export NODE_ENV=production
export DATABASE_PATH=./test-docker-data/emynopass.db
export JWT_SECRET=test-secret
export PORT=3001
export FRONTEND_URL=https://emynona.cloud

mkdir -p test-docker-data

echo "🚀 Test local avec variables Docker..."
sleep 5
node dist/index.js &
BACKEND_PID=$!
sleep 10
kill $BACKEND_PID 2>/dev/null

echo "✅ Test local OK, maintenant test Docker..."

cd ..

echo "🛑 Arrêt des conteneurs..."
docker-compose down

echo "🧹 Nettoyage..."
docker system prune -f

echo "🔨 Reconstruction avec diagnostics..."
docker-compose build --no-cache backend

echo "📊 Vérification de l'image..."
docker images | grep emynopass

echo "🚀 Démarrage avec logs détaillés..."
echo "Surveillez les logs pour voir:"
echo "- Les vérifications de fichiers"
echo "- Les vérifications de permissions"  
echo "- Le démarrage du backend"
echo ""

docker-compose up backend

echo ""
echo "🧹 Nettoyage local..."
cd backend
rm -rf test-docker-data
