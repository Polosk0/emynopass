#!/bin/bash

echo "🔍 Test du backend en mode debug..."

# Arrêter les services
docker-compose down --remove-orphans

# Construire le backend
echo "🔨 Construction du backend..."
docker-compose build backend

# Démarrer Redis et le backend
echo "🚀 Démarrage des services..."
docker-compose up -d redis backend

# Attendre que Redis soit prêt
echo "⏳ Attente de Redis..."
sleep 5

# Vérifier les logs du backend
echo "📋 Logs du backend:"
docker-compose logs backend

# Tester le backend
echo "�� Test du backend..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend: Disponible"
        break
    else
        echo "⏳ Tentative $i/10..."
        sleep 2
    fi
done

echo "✅ Test terminé !"
