#!/bin/bash

echo "🚨 CORRECTION URGENTE - EMYNOPASS"
echo "================================="
echo ""

# Fonction pour arrêter tout
stop_everything() {
    echo "🛑 ARRÊT DE TOUT..."
    docker-compose down
    sleep 5
    echo "✅ Arrêt terminé"
}

# Fonction pour nettoyer
cleanup() {
    echo "🧹 NETTOYAGE..."
    docker system prune -f
    echo "✅ Nettoyage terminé"
}

# Fonction pour redémarrer
restart() {
    echo "🚀 REDÉMARRAGE..."
    docker-compose up -d
    echo "⏳ Attente 60 secondes..."
    sleep 60
    echo "✅ Redémarrage terminé"
}

# Fonction pour tester
test() {
    echo "🔍 TEST..."
    
    # Test backend
    echo "Backend:"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health
    
    # Test auth
    echo "Auth:"
    curl -s -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}' \
        -w "%{http_code}"
    
    echo ""
}

# Fonction principale
main() {
    stop_everything
    cleanup
    restart
    test
    
    echo "🎯 TERMINÉ - Testez maintenant !"
}

# Exécuter
main
