#!/bin/bash

echo "🔍 DIAGNOSTIC ERREUR 502 BAD GATEWAY - EMYNOPASS"
echo "================================================"
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
    echo "🔍 Logs nginx (dernières 20 lignes):"
    docker-compose logs --tail=20 nginx
    
    echo ""
}

# Fonction pour vérifier la connectivité
test_connectivity() {
    echo "📋 2. TEST DE CONNECTIVITÉ"
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
        echo "❌ Cloudflare inaccessible (502 Bad Gateway)"
    fi
    
    echo ""
}

# Fonction pour vérifier la base de données
check_database() {
    echo "📋 3. VÉRIFICATION BASE DE DONNÉES"
    echo "---------------------------------"
    
    echo "🔍 Test de connexion PostgreSQL:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT version();" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL accessible"
        
        echo ""
        echo "🔍 Tables existantes:"
        docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\dt" 2>/dev/null
        
        echo ""
        echo "🔍 Structure de la table sessions:"
        docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d sessions" 2>/dev/null
        
        echo ""
        echo "🔍 Nombre de sessions:"
        docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT COUNT(*) as total_sessions FROM sessions;" 2>/dev/null
        
    else
        echo "❌ PostgreSQL inaccessible"
    fi
    
    echo ""
}

# Fonction pour vérifier les configurations
check_configurations() {
    echo "📋 4. VÉRIFICATION CONFIGURATIONS"
    echo "--------------------------------"
    
    echo "🔍 Variables d'environnement backend:"
    docker exec emynopass-backend env | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL|DATABASE)" 2>/dev/null || echo "Backend non accessible"
    
    echo ""
    echo "🔍 Configuration Nginx:"
    docker exec emynopass-nginx cat /etc/nginx/conf.d/default.conf | grep -E "(client_max_body_size|proxy_timeout|client_body_timeout)" 2>/dev/null || echo "Nginx non accessible"
    
    echo ""
    echo "🔍 Configuration Docker réseau:"
    docker network ls
    docker network inspect emynopass_emynopass-network 2>/dev/null | grep -E "(Name|IPAM|Containers)" || echo "Réseau non trouvé"
    
    echo ""
}

# Fonction pour vérifier les ressources système
check_system_resources() {
    echo "📋 5. VÉRIFICATION RESSOURCES SYSTÈME"
    echo "------------------------------------"
    
    echo "🔍 Espace disque:"
    df -h
    
    echo ""
    echo "🔍 Mémoire:"
    free -h
    
    echo ""
    echo "🔍 CPU:"
    top -bn1 | grep "Cpu(s)" || echo "top non disponible"
    
    echo ""
    echo "🔍 Processus Docker:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "docker stats non disponible"
    
    echo ""
}

# Fonction pour identifier les changements récents
check_recent_changes() {
    echo "📋 6. VÉRIFICATION CHANGEMENTS RÉCENTS"
    echo "-------------------------------------"
    
    echo "🔍 Fichiers modifiés récemment (dernières 24h):"
    find . -type f -mtime -1 -name "*.sh" -o -name "*.js" -o -name "*.ts" -o -name "*.json" | head -20
    
    echo ""
    echo "🔍 Historique Git récent:"
    git log --oneline -10
    
    echo ""
    echo "🔍 Fichiers non suivis par Git:"
    git status --porcelain | grep "^??" | head -10
    
    echo ""
}

# Fonction pour tester les endpoints spécifiques
test_endpoints() {
    echo "📋 7. TEST DES ENDPOINTS"
    echo "------------------------"
    
    # Test /health
    echo "🔍 Test /health..."
    local health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3001/health)
    local health_status=$(echo "$health_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "   - Status: $health_status"
    
    # Test /api/auth/demo
    echo "🔍 Test /api/auth/demo..."
    local demo_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/auth/demo)
    local demo_status=$(echo "$demo_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "   - Status: $demo_status"
    
    # Test /api/auth/login
    echo "🔍 Test /api/auth/login..."
    local login_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    local login_status=$(echo "$login_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "   - Status: $login_status"
    
    echo ""
}

# Fonction pour afficher les recommandations
show_recommendations() {
    echo "📋 8. RECOMMANDATIONS"
    echo "--------------------"
    
    echo "🔧 Actions recommandées:"
    echo ""
    echo "1. Si le backend ne répond pas (Status 000):"
    echo "   - Redémarrer le backend: docker-compose restart backend"
    echo "   - Vérifier les logs: docker-compose logs -f backend"
    echo "   - Vérifier la base de données"
    echo ""
    echo "2. Si Nginx ne répond pas (Status 000):"
    echo "   - Redémarrer Nginx: docker-compose restart nginx"
    echo "   - Vérifier la configuration Nginx"
    echo ""
    echo "3. Si Cloudflare renvoie 502:"
    echo "   - Vérifier que le backend et Nginx fonctionnent"
    echo "   - Vérifier la configuration Cloudflare"
    echo "   - Attendre quelques minutes pour la propagation"
    echo ""
    echo "4. Si la base de données a des problèmes:"
    echo "   - Exécuter: ./fix-database-schema.sh"
    echo "   - Vérifier les contraintes et index"
    echo ""
    echo "5. Tests supplémentaires:"
    echo "   - Tester l'accès direct au backend (sans Cloudflare)"
    echo "   - Vérifier les logs en temps réel"
    echo "   - Redémarrer tous les services si nécessaire"
    echo ""
}

# Fonction principale
main() {
    check_services_status
    test_connectivity
    check_database
    check_configurations
    check_system_resources
    check_recent_changes
    test_endpoints
    show_recommendations
    
    echo "🎯 DIAGNOSTIC TERMINÉ"
    echo "===================="
}

# Exécuter le script principal
main
