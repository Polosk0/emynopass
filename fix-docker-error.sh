#!/bin/bash

echo "🔧 CORRECTION ERREUR DOCKER COMPOSE"
echo "===================================="
echo ""

# 1. Arrêter tous les services
echo "🛑 Arrêt de tous les services..."
docker-compose down

# 2. Nettoyer les conteneurs orphelins
echo "🧹 Nettoyage des conteneurs orphelins..."
docker container prune -f

# 3. Nettoyer les images non utilisées
echo "🧹 Nettoyage des images non utilisées..."
docker image prune -f

# 4. Vérifier l'espace disque
echo "💾 Vérification de l'espace disque..."
df -h

# 5. Redémarrer Docker si nécessaire
echo "🔄 Redémarrage de Docker..."
sudo systemctl restart docker
sleep 10

# 6. Vérifier que Docker fonctionne
echo "🔍 Vérification de Docker..."
docker --version
docker-compose --version

# 7. Reconstruire les services
echo "🔨 Reconstruction des services..."
docker-compose up -d --build

# 8. Attendre le démarrage
echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

# 9. Vérifier le statut des services
echo "🔍 Vérification du statut des services..."
docker-compose ps

# 10. Vérifier les logs
echo "📄 Vérification des logs..."
docker-compose logs --tail=10

# 11. Test de connectivité
echo "🌐 Test de connectivité..."
if curl -f -s https://emynona.cloud/health > /dev/null; then
    echo "✅ Serveur accessible via HTTPS"
else
    echo "❌ Serveur inaccessible via HTTPS"
    echo "🔍 Vérification des logs détaillés..."
    docker-compose logs --tail=20
fi

echo ""
echo "🎯 CORRECTION TERMINÉE"
echo "======================"
