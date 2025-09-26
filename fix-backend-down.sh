#!/bin/bash

echo "🔧 CORRECTION BACKEND INACCESSIBLE - EMYNOPASS"
echo "=============================================="
echo ""

# Fonction pour vérifier le statut des services
check_services_status() {
    echo "📋 1. VÉRIFICATION STATUT DES SERVICES"
    echo "-------------------------------------"
    
    echo "🔍 Statut des conteneurs:"
    docker-compose ps
    
    echo ""
    echo "🔍 Logs backend (dernières 30 lignes):"
    docker-compose logs --tail=30 backend
    
    echo ""
    echo "🔍 Logs postgres (dernières 10 lignes):"
    docker-compose logs --tail=10 postgres
    
    echo ""
}

# Fonction pour arrêter tous les services
stop_all_services() {
    echo "📋 2. ARRÊT DE TOUS LES SERVICES"
    echo "-------------------------------"
    
    echo "🛑 Arrêt de tous les services..."
    docker-compose down
    
    echo "⏳ Attente de 10 secondes..."
    sleep 10
    
    echo "✅ Services arrêtés"
    echo ""
}

# Fonction pour nettoyer Docker
cleanup_docker() {
    echo "📋 3. NETTOYAGE DOCKER"
    echo "---------------------"
    
    echo "🧹 Nettoyage des conteneurs arrêtés..."
    docker container prune -f
    
    echo "🧹 Nettoyage des images inutilisées..."
    docker image prune -f
    
    echo "🧹 Nettoyage des volumes inutilisés..."
    docker volume prune -f
    
    echo "🧹 Nettoyage des réseaux inutilisés..."
    docker network prune -f
    
    echo "✅ Nettoyage Docker terminé"
    echo ""
}

# Fonction pour redémarrer les services
restart_services() {
    echo "📋 4. REDÉMARRAGE DES SERVICES"
    echo "-----------------------------"
    
    echo "🚀 Redémarrage de tous les services..."
    docker-compose up -d
    
    echo "⏳ Attente du démarrage (60 secondes)..."
    sleep 60
    
    echo "🔍 Vérification du statut..."
    docker-compose ps
    
    echo "✅ Services redémarrés"
    echo ""
}

# Fonction pour attendre que le backend soit prêt
wait_for_backend() {
    echo "📋 5. ATTENTE DU BACKEND"
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
    echo "📋 6. VÉRIFICATION BASE DE DONNÉES"
    echo "---------------------------------"
    
    echo "🔍 Test de connexion PostgreSQL:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT version();" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL accessible"
        
        echo ""
        echo "🔍 Tables existantes:"
        docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\dt" 2>/dev/null
        
        echo ""
        echo "🔍 Nombre de sessions:"
        docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT COUNT(*) as total_sessions FROM sessions;" 2>/dev/null
        
    else
        echo "❌ PostgreSQL inaccessible"
    fi
    
    echo ""
}

# Fonction pour nettoyer les sessions
cleanup_sessions() {
    echo "📋 7. NETTOYAGE DES SESSIONS"
    echo "----------------------------"
    
    echo "🧹 Suppression de toutes les sessions..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "TRUNCATE TABLE sessions;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Sessions nettoyées"
    else
        echo "❌ Erreur lors du nettoyage des sessions"
    fi
    
    echo ""
}

# Fonction pour tester la connectivité
test_connectivity() {
    echo "📋 8. TEST DE CONNECTIVITÉ"
    echo "-------------------------"
    
    # Test du backend
    echo "🔍 Test du backend..."
    local backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
    echo "   - Backend Status: $backend_status"
    
    # Test de Nginx
    echo "🔍 Test de Nginx..."
    local nginx_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health)
    echo "   - Nginx Status: $nginx_status"
    
    # Test via Cloudflare
    echo "🔍 Test via Cloudflare..."
    local cloudflare_status=$(curl -s -o /dev/null -w "%{http_code}" https://emynona.cloud/health)
    echo "   - Cloudflare Status: $cloudflare_status"
    
    if [ "$cloudflare_status" = "200" ]; then
        echo "✅ Tous les services sont accessibles"
        return 0
    else
        echo "❌ Problème de connectivité détecté"
        return 1
    fi
    
    echo ""
}

# Fonction pour tester l'authentification
test_auth() {
    echo "📋 9. TEST D'AUTHENTIFICATION"
    echo "-----------------------------"
    
    # Test d'auth direct backend
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
        fi
    else
        echo "❌ Auth backend échoué"
        echo "   - Réponse: $auth_backend_body"
    fi
    
    # Test d'auth via Cloudflare
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
        fi
    else
        echo "❌ Auth Cloudflare échoué"
        echo "   - Réponse: $auth_cloudflare_body"
    fi
    
    echo ""
}

# Fonction pour tester l'upload
test_upload() {
    echo "📋 10. TEST D'UPLOAD"
    echo "--------------------"
    
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

# Fonction pour afficher les recommandations
show_recommendations() {
    echo "📋 11. RECOMMANDATIONS"
    echo "---------------------"
    
    echo "🔧 Actions supplémentaires si nécessaire:"
    echo ""
    echo "1. Si le backend ne démarre toujours pas:"
    echo "   - Vérifier les logs: docker-compose logs -f backend"
    echo "   - Vérifier la base de données: ./fix-database-schema.sh"
    echo "   - Vérifier les variables d'environnement"
    echo ""
    echo "2. Si l'authentification ne fonctionne pas:"
    echo "   - Vérifier les sessions: docker exec emynopass-postgres psql -U emynopass -d emynopass -c \"SELECT COUNT(*) FROM sessions;\""
    echo "   - Nettoyer les sessions: docker exec emynopass-postgres psql -U emynopass -d emynopass -c \"TRUNCATE TABLE sessions;\""
    echo ""
    echo "3. Si l'upload ne fonctionne pas:"
    echo "   - Vérifier la configuration Nginx"
    echo "   - Vérifier les limites Cloudflare"
    echo "   - Tester avec des fichiers plus petits"
    echo ""
    echo "4. Configuration Cloudflare recommandée:"
    echo "   - Page Rules pour /api/*: Cache Level Bypass"
    echo "   - Security Level: Essentially Off"
    echo "   - Rate Limiting: Disabled"
    echo "   - WAF Rules: Disabled"
    echo ""
}

# Fonction principale
main() {
    check_services_status
    stop_all_services
    cleanup_docker
    restart_services
    
    if wait_for_backend; then
        check_database
        cleanup_sessions
        test_connectivity
        test_auth
        test_upload
    else
        echo "❌ Impossible de continuer - backend non disponible"
        echo "💡 Essayez de redémarrer manuellement:"
        echo "   docker-compose restart backend"
        echo "   docker-compose logs -f backend"
    fi
    
    show_recommendations
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
}

# Exécuter le script principal
main
