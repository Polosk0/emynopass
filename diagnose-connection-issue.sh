#!/bin/bash

echo "🔍 DIAGNOSTIC PROBLÈME DE CONNEXION - EMYNOPASS"
echo "==============================================="
echo ""

# Fonction pour tester la connectivité
test_connectivity() {
    echo "📋 1. TEST DE CONNECTIVITÉ"
    echo "-------------------------"
    
    # Test direct du backend
    echo "🔍 Test direct du backend (localhost:3001)..."
    local backend_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" http://localhost:3001/health)
    local backend_status=$(echo "$backend_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local backend_time=$(echo "$backend_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    echo "   - Status: $backend_status"
    echo "   - Temps: ${backend_time}s"
    
    if [ "$backend_status" = "200" ]; then
        echo "✅ Backend accessible localement"
    else
        echo "❌ Backend inaccessible localement"
    fi
    
    # Test via Nginx local
    echo "🔍 Test via Nginx local (localhost:80)..."
    local nginx_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" http://localhost:80/health)
    local nginx_status=$(echo "$nginx_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local nginx_time=$(echo "$nginx_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    echo "   - Status: $nginx_status"
    echo "   - Temps: ${nginx_time}s"
    
    if [ "$nginx_status" = "200" ]; then
        echo "✅ Nginx accessible localement"
    else
        echo "❌ Nginx inaccessible localement"
    fi
    
    # Test via Cloudflare
    echo "🔍 Test via Cloudflare (emynona.cloud)..."
    local cloudflare_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" https://emynona.cloud/health)
    local cloudflare_status=$(echo "$cloudflare_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local cloudflare_time=$(echo "$cloudflare_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    echo "   - Status: $cloudflare_status"
    echo "   - Temps: ${cloudflare_time}s"
    
    if [ "$cloudflare_status" = "200" ]; then
        echo "✅ Cloudflare accessible"
    else
        echo "❌ Cloudflare inaccessible"
    fi
    
    echo ""
}

# Fonction pour tester l'authentification
test_auth() {
    echo "📋 2. TEST D'AUTHENTIFICATION"
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
    echo "📋 3. TEST D'UPLOAD"
    echo "-------------------"
    
    # Créer un fichier de test de 1MB
    echo "🔍 Création d'un fichier de test de 1MB..."
    dd if=/dev/zero of=/tmp/test-1mb.bin bs=1M count=1 2>/dev/null
    
    if [ ! -f "/tmp/test-1mb.bin" ]; then
        echo "❌ Impossible de créer le fichier de test"
        return 1
    fi
    
    echo "✅ Fichier de test créé"
    
    # Obtenir un token
    echo "🔐 Connexion pour obtenir un token..."
    local token_response=$(curl -s -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        echo "❌ Impossible d'obtenir un token"
        rm -f /tmp/test-1mb.bin
        return 1
    fi
    
    echo "✅ Token obtenu: ${token:0:20}..."
    
    # Test d'upload via Cloudflare
    echo "🔍 Test d'upload via Cloudflare (1MB)..."
    local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}|SIZE:%{size_upload}" \
        -X POST https://emynona.cloud/api/upload/files \
        -H "Authorization: Bearer $token" \
        -F "files=@/tmp/test-1mb.bin")
    
    local upload_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local upload_time=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local upload_size=$(echo "$upload_response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)
    local upload_body=$(echo "$upload_response" | sed 's/HTTPSTATUS:[0-9]*|TIME:[0-9.]*|SIZE:[0-9]*$//')
    
    echo "   - Status: $upload_status"
    echo "   - Temps: ${upload_time}s"
    echo "   - Taille: ${upload_size} bytes"
    
    if [ "$upload_status" = "200" ]; then
        echo "✅ Upload réussi"
    elif [ "$upload_status" = "000" ]; then
        echo "❌ Erreur de connexion (Status 000)"
        echo "   - Problème: Connexion interrompue ou timeout"
    elif [ "$upload_status" = "413" ]; then
        echo "❌ Fichier trop volumineux (Status 413)"
        echo "   - Problème: Limite de taille dépassée"
    elif [ "$upload_status" = "500" ]; then
        echo "❌ Erreur serveur (Status 500)"
        echo "   - Problème: Erreur interne du serveur"
    else
        echo "❌ Upload échoué (Status $upload_status)"
        echo "   - Réponse: $upload_body"
    fi
    
    # Nettoyer
    rm -f /tmp/test-1mb.bin
    echo "✅ Fichier de test supprimé"
    
    echo ""
}

# Fonction pour vérifier les services Docker
check_docker_services() {
    echo "📋 4. VÉRIFICATION DES SERVICES DOCKER"
    echo "-------------------------------------"
    
    echo "🔍 Statut des conteneurs:"
    docker-compose ps
    
    echo ""
    echo "🔍 Logs backend (dernières 10 lignes):"
    docker-compose logs --tail=10 backend | grep -E "(ERROR|WARN|upload|auth)"
    
    echo ""
    echo "🔍 Logs nginx (dernières 10 lignes):"
    docker-compose logs --tail=10 nginx | grep -E "(ERROR|WARN|upload|auth)"
    
    echo ""
}

# Fonction pour vérifier la configuration réseau
check_network_config() {
    echo "📋 5. VÉRIFICATION CONFIGURATION RÉSEAU"
    echo "--------------------------------------"
    
    echo "🔍 Configuration Nginx:"
    docker exec emynopass-nginx cat /etc/nginx/conf.d/default.conf | grep -E "(client_max_body_size|proxy_timeout|client_body_timeout)"
    
    echo ""
    echo "🔍 Variables d'environnement backend:"
    docker exec emynopass-backend env | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL)"
    
    echo ""
    echo "🔍 Configuration Docker réseau:"
    docker network ls
    docker network inspect emynopass_default 2>/dev/null | grep -E "(Name|IPAM|Containers)" || echo "Réseau non trouvé"
    
    echo ""
}

# Fonction pour afficher les recommandations
show_recommendations() {
    echo "📋 6. RECOMMANDATIONS"
    echo "--------------------"
    
    echo "🔧 Actions recommandées:"
    echo ""
    echo "1. Si Status 000 (connexion interrompue):"
    echo "   - Vérifier la configuration Cloudflare"
    echo "   - Augmenter les timeouts Cloudflare"
    echo "   - Désactiver WAF pour /api/upload/*"
    echo ""
    echo "2. Si Status 413 (fichier trop volumineux):"
    echo "   - Vérifier client_max_body_size dans Nginx"
    echo "   - Vérifier les limites Cloudflare"
    echo "   - Vérifier les limites Express/Multer"
    echo ""
    echo "3. Si Status 500 (erreur serveur):"
    echo "   - Vérifier les logs Docker"
    echo "   - Redémarrer les services"
    echo "   - Vérifier la configuration backend"
    echo ""
    echo "4. Tests supplémentaires:"
    echo "   - Tester avec des fichiers plus petits (1MB, 10MB)"
    echo "   - Tester l'upload direct au backend (sans Cloudflare)"
    echo "   - Vérifier les logs en temps réel pendant l'upload"
    echo ""
}

# Fonction principale
main() {
    test_connectivity
    test_auth
    test_upload
    check_docker_services
    check_network_config
    show_recommendations
    
    echo "🎯 DIAGNOSTIC TERMINÉ"
    echo "===================="
}

# Exécuter le script principal
main
