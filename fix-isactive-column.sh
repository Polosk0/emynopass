#!/bin/bash

echo "🔧 CORRECTION COLONNE ISACTIVE - EMYNOPASS"
echo "=========================================="
echo ""

# Fonction pour ajouter la colonne isactive
add_isactive_column() {
    echo "📋 1. AJOUT DE LA COLONNE ISACTIVE"
    echo "----------------------------------"
    
    echo "🔧 Ajout de la colonne isactive à la table users..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        ALTER TABLE users ADD COLUMN IF NOT EXISTS isactive BOOLEAN DEFAULT true;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Colonne isactive ajoutée"
    else
        echo "❌ Erreur lors de l'ajout de la colonne"
    fi
    
    echo ""
}

# Fonction pour vérifier la structure
check_structure() {
    echo "📋 2. VÉRIFICATION DE LA STRUCTURE"
    echo "----------------------------------"
    
    echo "🔍 Structure de la table users:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d users" 2>/dev/null
    
    echo ""
}

# Fonction pour redémarrer le backend
restart_backend() {
    echo "📋 3. REDÉMARRAGE DU BACKEND"
    echo "----------------------------"
    
    echo "🛑 Arrêt du backend..."
    docker-compose stop backend
    
    echo "⏳ Attente de 5 secondes..."
    sleep 5
    
    echo "🚀 Redémarrage du backend..."
    docker-compose up -d backend
    
    echo "⏳ Attente du démarrage (30 secondes)..."
    sleep 30
    
    echo "✅ Backend redémarré"
    echo ""
}

# Fonction pour tester
test_system() {
    echo "📋 4. TEST DU SYSTÈME"
    echo "---------------------"
    
    # Test de connectivité
    echo "🔍 Test de connectivité..."
    local health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3001/health)
    local health_status=$(echo "$health_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$health_status" = "200" ]; then
        echo "✅ Backend accessible"
    else
        echo "❌ Backend inaccessible (Status: $health_status)"
        return 1
    fi
    
    # Test d'authentification
    echo "🔍 Test d'authentification..."
    local auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local auth_status=$(echo "$auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local auth_body=$(echo "$auth_response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$auth_status" = "200" ]; then
        echo "✅ Authentification OK"
        local token=$(echo "$auth_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            echo "✅ Token obtenu: ${token:0:20}..."
        fi
    else
        echo "❌ Authentification échouée (Status: $auth_status)"
        echo "   - Réponse: $auth_body"
    fi
    
    echo ""
}

# Fonction principale
main() {
    add_isactive_column
    check_structure
    restart_backend
    test_system
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
}

# Exécuter le script principal
main
