#!/bin/bash

echo "🔧 CORRECTION ERREUR 500 AUTHENTIFICATION - EMYNOPASS"
echo "====================================================="
echo ""

# Fonction pour vérifier les logs backend
check_backend_logs() {
    echo "📋 1. VÉRIFICATION LOGS BACKEND"
    echo "-------------------------------"
    
    echo "🔍 Logs backend récents (dernières 20 lignes):"
    docker-compose logs --tail=20 backend
    
    echo ""
    echo "🔍 Logs backend avec erreurs:"
    docker-compose logs --tail=50 backend | grep -E "(ERROR|error|Error|500|auth|login)"
    
    echo ""
}

# Fonction pour vérifier la configuration backend
check_backend_config() {
    echo "📋 2. VÉRIFICATION CONFIGURATION BACKEND"
    echo "---------------------------------------"
    
    echo "🔍 Variables d'environnement backend:"
    docker exec emynopass-backend env | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL|DATABASE)"
    
    echo ""
    echo "🔍 Configuration Express (limites):"
    docker exec emynopass-backend cat /app/src/index.ts | grep -E "(express\.json|express\.urlencoded|limit)" || echo "Configuration non trouvée"
    
    echo ""
    echo "🔍 Configuration Multer (limites):"
    docker exec emynopass-backend cat /app/src/routes/upload.ts | grep -E "(fileSize|fieldSize|limits)" || echo "Configuration non trouvée"
    
    echo ""
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
    echo "🔍 Vérification des utilisateurs:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT id, email, role, created_at FROM users LIMIT 5;"
    
    echo ""
}

# Fonction pour redémarrer les services
restart_services() {
    echo "📋 4. REDÉMARRAGE DES SERVICES"
    echo "------------------------------"
    
    echo "🛑 Arrêt des services..."
    docker-compose down
    
    echo "⏳ Attente de 10 secondes..."
    sleep 10
    
    echo "🚀 Redémarrage des services..."
    docker-compose up -d
    
    echo "⏳ Attente du démarrage (30 secondes)..."
    sleep 30
    
    echo "🔍 Vérification du statut..."
    docker-compose ps
    
    echo "✅ Services redémarrés"
    echo ""
}

# Fonction pour tester l'authentification
test_auth() {
    echo "📋 5. TEST D'AUTHENTIFICATION"
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
    echo "📋 6. TEST D'UPLOAD"
    echo "-------------------"
    
    # Obtenir un token via backend direct
    echo "🔐 Connexion pour obtenir un token (backend direct)..."
    local token_response=$(curl -s -X POST http://localhost:3001/api/auth/login \
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
    
    # Test d'upload via backend direct
    echo "🔍 Test d'upload via backend direct (1MB)..."
    local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
        -X POST http://localhost:3001/api/upload/files \
        -H "Authorization: Bearer $token" \
        -F "files=@/tmp/test-1mb.bin")
    
    local upload_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local upload_time=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local upload_body=$(echo "$upload_response" | sed 's/HTTPSTATUS:[0-9]*|TIME:[0-9.]*$//')
    
    echo "   - Status: $upload_status"
    echo "   - Temps: ${upload_time}s"
    
    if [ "$upload_status" = "200" ]; then
        echo "✅ Upload backend direct réussi"
    else
        echo "❌ Upload backend direct échoué"
        echo "   - Réponse: $upload_body"
    fi
    
    # Test d'upload via Cloudflare
    echo "🔍 Test d'upload via Cloudflare (1MB)..."
    local upload_cloudflare=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
        -X POST https://emynona.cloud/api/upload/files \
        -H "Authorization: Bearer $token" \
        -F "files=@/tmp/test-1mb.bin")
    
    local upload_cloudflare_status=$(echo "$upload_cloudflare" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local upload_cloudflare_time=$(echo "$upload_cloudflare" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local upload_cloudflare_body=$(echo "$upload_cloudflare" | sed 's/HTTPSTATUS:[0-9]*|TIME:[0-9.]*$//')
    
    echo "   - Status: $upload_cloudflare_status"
    echo "   - Temps: ${upload_cloudflare_time}s"
    
    if [ "$upload_cloudflare_status" = "200" ]; then
        echo "✅ Upload Cloudflare réussi"
    else
        echo "❌ Upload Cloudflare échoué"
        echo "   - Réponse: $upload_cloudflare_body"
    fi
    
    # Nettoyer
    rm -f /tmp/test-1mb.bin
    echo "✅ Fichier de test supprimé"
    
    echo ""
}

# Fonction pour afficher les recommandations
show_recommendations() {
    echo "📋 7. RECOMMANDATIONS"
    echo "--------------------"
    
    echo "🔧 Actions recommandées:"
    echo ""
    echo "1. Si l'auth backend fonctionne mais pas Cloudflare:"
    echo "   - Problème de configuration Cloudflare"
    echo "   - Vérifier les Page Rules pour /api/auth/*"
    echo "   - Désactiver WAF pour /api/auth/*"
    echo "   - Augmenter les timeouts Cloudflare"
    echo ""
    echo "2. Si l'upload backend fonctionne mais pas Cloudflare:"
    echo "   - Problème de configuration Cloudflare"
    echo "   - Vérifier les Page Rules pour /api/upload/*"
    echo "   - Désactiver WAF pour /api/upload/*"
    echo "   - Augmenter les timeouts Cloudflare"
    echo ""
    echo "3. Configuration Cloudflare recommandée:"
    echo "   - Page Rules pour /api/*:"
    echo "     * Cache Level: Bypass"
    echo "     * Browser Cache TTL: Respect Existing Headers"
    echo "     * Edge Cache TTL: 2 hours"
    echo "   - Security Level: Essentially Off"
    echo "   - Rate Limiting: Disabled"
    echo "   - WAF Rules: Disabled"
    echo "   - Timeouts: 600 seconds"
    echo ""
}

# Fonction principale
main() {
    check_backend_logs
    check_backend_config
    check_database
    restart_services
    test_auth
    test_upload
    show_recommendations
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
}

# Exécuter le script principal
main
