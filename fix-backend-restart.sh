#!/bin/bash

echo "🔧 CORRECTION REDÉMARRAGE BACKEND - EMYNOPASS"
echo "============================================="
echo ""

# Fonction pour vérifier le statut des services
check_services_status() {
    echo "📋 1. VÉRIFICATION STATUT DES SERVICES"
    echo "-------------------------------------"
    
    echo "🔍 Statut des conteneurs:"
    docker-compose ps
    
    echo ""
    echo "🔍 Logs backend (dernières 20 lignes):"
    docker-compose logs --tail=20 backend
    
    echo ""
}

# Fonction pour attendre que le backend soit prêt
wait_for_backend() {
    echo "📋 2. ATTENTE DU BACKEND"
    echo "------------------------"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔍 Tentative $attempt/$max_attempts - Vérification du backend..."
        
        local health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3001/health)
        local health_status=$(echo "$health_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        
        if [ "$health_status" = "200" ]; then
            echo "✅ Backend prêt !"
            return 0
        else
            echo "⏳ Backend pas encore prêt (Status: $health_status)"
            sleep 10
            attempt=$((attempt + 1))
        fi
    done
    
    echo "❌ Backend non disponible après $max_attempts tentatives"
    return 1
}

# Fonction pour vérifier la base de données
check_database() {
    echo "📋 3. VÉRIFICATION BASE DE DONNÉES"
    echo "---------------------------------"
    
    echo "🔍 Test de connexion PostgreSQL:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT version();"
    
    echo ""
    echo "🔍 Vérification des tables:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\dt"
    
    echo ""
    echo "🔍 Structure de la table sessions:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d sessions"
    
    echo ""
    echo "🔍 Nombre de sessions:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT COUNT(*) as total_sessions FROM sessions;"
    
    echo ""
}

# Fonction pour nettoyer les sessions avec les bons noms de colonnes
cleanup_sessions_correct() {
    echo "📋 4. NETTOYAGE DES SESSIONS (NOMS CORRECTS)"
    echo "--------------------------------------------"
    
    echo "🧹 Suppression des sessions expirées..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "DELETE FROM sessions WHERE expiresat < NOW();"
    
    echo "🧹 Suppression des sessions anciennes (plus de 7 jours)..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "DELETE FROM sessions WHERE createdat < NOW() - INTERVAL '7 days';"
    
    echo "🧹 Suppression des sessions dupliquées (garder la plus récente)..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        DELETE FROM sessions 
        WHERE id NOT IN (
            SELECT DISTINCT ON (userid) id 
            FROM sessions 
            ORDER BY userid, createdat DESC
        );"
    
    echo "✅ Nettoyage des sessions terminé"
    echo ""
}

# Fonction pour redémarrer le backend
restart_backend() {
    echo "📋 5. REDÉMARRAGE DU BACKEND"
    echo "----------------------------"
    
    echo "🛑 Arrêt du backend..."
    docker-compose stop backend
    
    echo "⏳ Attente de 5 secondes..."
    sleep 5
    
    echo "🚀 Redémarrage du backend..."
    docker-compose up -d backend
    
    echo "⏳ Attente du démarrage (20 secondes)..."
    sleep 20
    
    echo "✅ Backend redémarré"
    echo ""
}

# Fonction pour tester l'authentification
test_auth() {
    echo "📋 6. TEST D'AUTHENTIFICATION"
    echo "-----------------------------"
    
    # Test direct du backend
    echo "🔍 Test auth direct backend..."
    local auth_backend=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local auth_backend_status=$(echo "$auth_backend" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local auth_backend_body=$(echo "$auth_backend" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "   - Status: $auth_backend_status"
    if [ "$auth_backend_status" = "200" ]; then
        echo "✅ Auth backend OK"
        local token=$(echo "$auth_backend_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            echo "✅ Token obtenu: ${token:0:20}..."
        else
            echo "❌ Token non trouvé dans la réponse"
        fi
    else
        echo "❌ Auth backend échoué"
        echo "   - Réponse: $auth_backend_body"
    fi
    
    # Test via Cloudflare
    echo "🔍 Test auth via Cloudflare..."
    local auth_cloudflare=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local auth_cloudflare_status=$(echo "$auth_cloudflare" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local auth_cloudflare_body=$(echo "$auth_cloudflare" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "   - Status: $auth_cloudflare_status"
    if [ "$auth_cloudflare_status" = "200" ]; then
        echo "✅ Auth Cloudflare OK"
        local token=$(echo "$auth_cloudflare_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            echo "✅ Token obtenu: ${token:0:20}..."
        else
            echo "❌ Token non trouvé dans la réponse"
        fi
    else
        echo "❌ Auth Cloudflare échoué"
        echo "   - Réponse: $auth_cloudflare_body"
    fi
    
    echo ""
}

# Fonction pour tester l'upload
test_upload() {
    echo "📋 7. TEST D'UPLOAD"
    echo "-------------------"
    
    # Obtenir un token
    echo "🔐 Connexion pour obtenir un token..."
    local token_response=$(curl -s -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        echo "❌ Impossible d'obtenir un token"
        return 1
    fi
    
    echo "✅ Token obtenu: ${token:0:20}..."
    
    # Créer un fichier de test de 1MB
    echo "🔍 Création d'un fichier de test de 1MB..."
    dd if=/dev/zero of=/tmp/test-1mb.bin bs=1M count=1 2>/dev/null
    
    # Test d'upload
    echo "🔍 Test d'upload (1MB)..."
    local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
        -X POST https://emynona.cloud/api/upload/files \
        -H "Authorization: Bearer $token" \
        -F "files=@/tmp/test-1mb.bin")
    
    local upload_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local upload_time=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local upload_body=$(echo "$upload_response" | sed 's/HTTPSTATUS:[0-9]*|TIME:[0-9.]*$//')
    
    echo "   - Status: $upload_status"
    echo "   - Temps: ${upload_time}s"
    
    if [ "$upload_status" = "200" ]; then
        echo "✅ Upload réussi"
    else
        echo "❌ Upload échoué"
        echo "   - Réponse: $upload_body"
    fi
    
    # Nettoyer
    rm -f /tmp/test-1mb.bin
    echo "✅ Fichier de test supprimé"
    
    echo ""
}

# Fonction principale
main() {
    check_services_status
    
    # Attendre que le backend soit prêt
    if wait_for_backend; then
        check_database
        cleanup_sessions_correct
        test_auth
        test_upload
    else
        echo "❌ Impossible de continuer - backend non disponible"
        echo "💡 Essayez de redémarrer manuellement:"
        echo "   docker-compose restart backend"
        echo "   docker-compose logs -f backend"
    fi
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
}

# Exécuter le script principal
main
