#!/bin/bash

echo "🔧 OPTIMISATION UPLOAD GROS FICHIERS - EMYNOPASS"
echo "================================================"
echo ""

# Fonction pour vérifier et optimiser les limites système
optimize_system_limits() {
    echo "📋 1. OPTIMISATION DES LIMITES SYSTÈME"
    echo "-------------------------------------"
    
    # Vérifier les limites actuelles
    echo "🔍 Limites actuelles:"
    echo "   - Fichiers ouverts: $(ulimit -n)"
    echo "   - Taille de fichier: $(ulimit -f)"
    echo "   - Mémoire virtuelle: $(ulimit -v)"
    
    # Optimiser les limites
    echo "🔧 Optimisation des limites..."
    
    # Augmenter la limite de fichiers ouverts
    if [ $(ulimit -n) -lt 65536 ]; then
        echo "   - Augmentation de la limite de fichiers ouverts..."
        ulimit -n 65536
    fi
    
    # Augmenter la limite de taille de fichier
    if [ $(ulimit -f) -lt 1048576 ]; then
        echo "   - Augmentation de la limite de taille de fichier..."
        ulimit -f unlimited
    fi
    
    # Augmenter la limite de mémoire virtuelle
    if [ $(ulimit -v) -lt 1048576 ]; then
        echo "   - Augmentation de la limite de mémoire virtuelle..."
        ulimit -v unlimited
    fi
    
    echo "✅ Limites système optimisées"
    echo ""
}

# Fonction pour optimiser Docker
optimize_docker() {
    echo "📋 2. OPTIMISATION DOCKER"
    echo "-------------------------"
    
    # Vérifier la configuration Docker
    echo "🔍 Configuration Docker actuelle:"
    docker system df
    
    # Nettoyer Docker
    echo "🧹 Nettoyage Docker..."
    docker system prune -f
    
    # Vérifier les ressources Docker
    echo "🔍 Ressources Docker:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo "✅ Docker optimisé"
    echo ""
}

# Fonction pour optimiser Nginx
optimize_nginx() {
    echo "📋 3. OPTIMISATION NGINX"
    echo "------------------------"
    
    # Vérifier la configuration Nginx actuelle
    echo "🔍 Configuration Nginx actuelle:"
    docker exec emynopass-nginx cat /etc/nginx/conf.d/default.conf | grep -E "(client_max_body_size|proxy_timeout|client_body_timeout|proxy_buffering)"
    
    # Créer une configuration Nginx optimisée
    echo "🔧 Création d'une configuration Nginx optimisée..."
    
    cat > /tmp/nginx-optimized.conf << 'EOF'
server {
    listen 80;
    server_name emynona.cloud;

    # Configuration pour très gros fichiers
    client_max_body_size 100G;
    client_body_timeout 3600s;  # 1 heure
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 3600s;   # 1 heure
    proxy_read_timeout 3600s;   # 1 heure
    send_timeout 3600s;         # 1 heure

    # Optimisations pour vitesse maximale
    client_body_buffer_size 256k;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_max_temp_file_size 0;
    proxy_busy_buffers_size 256k;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API routes - configuration optimisée pour gros fichiers
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Configuration pour uploads de très gros fichiers
        client_max_body_size 100G;
        client_body_timeout 3600s;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_max_temp_file_size 0;
        client_body_buffer_size 256k;
        proxy_busy_buffers_size 256k;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Health check
    location /health {
        proxy_pass http://backend:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Copier la configuration optimisée
    echo "📋 Copie de la configuration optimisée..."
    docker cp /tmp/nginx-optimized.conf emynopass-nginx:/etc/nginx/conf.d/default.conf
    
    # Redémarrer Nginx
    echo "🔄 Redémarrage de Nginx..."
    docker exec emynopass-nginx nginx -s reload
    
    echo "✅ Nginx optimisé"
    echo ""
}

# Fonction pour optimiser le backend
optimize_backend() {
    echo "📋 4. OPTIMISATION BACKEND"
    echo "--------------------------"
    
    # Vérifier la configuration backend actuelle
    echo "🔍 Configuration backend actuelle:"
    docker exec emynopass-backend env | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL)"
    
    # Vérifier les logs backend
    echo "🔍 Logs backend récents:"
    docker-compose logs --tail=20 backend | grep -E "(ERROR|WARN|limit|timeout)"
    
    echo "✅ Backend vérifié"
    echo ""
}

# Fonction pour optimiser PostgreSQL
optimize_postgres() {
    echo "📋 5. OPTIMISATION POSTGRESQL"
    echo "-----------------------------"
    
    # Vérifier la configuration PostgreSQL
    echo "🔍 Configuration PostgreSQL:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SHOW max_connections;"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SHOW shared_buffers;"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SHOW work_mem;"
    
    # Optimiser PostgreSQL pour les gros fichiers
    echo "🔧 Optimisation PostgreSQL..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "ALTER SYSTEM SET shared_buffers = '256MB';"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "ALTER SYSTEM SET work_mem = '64MB';"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "ALTER SYSTEM SET maintenance_work_mem = '256MB';"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT pg_reload_conf();"
    
    echo "✅ PostgreSQL optimisé"
    echo ""
}

# Fonction pour tester les optimisations
test_optimizations() {
    echo "📋 6. TEST DES OPTIMISATIONS"
    echo "----------------------------"
    
    # Test de connectivité
    echo "🔍 Test de connectivité..."
    local health_response=$(curl -s https://emynona.cloud/health)
    if echo "$health_response" | grep -q "OK"; then
        echo "✅ Serveur accessible"
    else
        echo "❌ Serveur inaccessible"
        return 1
    fi
    
    # Test d'upload de 100MB
    echo "🧪 Test d'upload de 100MB..."
    dd if=/dev/zero of=/tmp/test-100mb.bin bs=1M count=100 2>/dev/null
    
    # Obtenir un token
    local token_response=$(curl -s -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$token" ]; then
        echo "✅ Token obtenu"
        
        # Test d'upload
        local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
            -X POST https://emynona.cloud/api/upload/files \
            -H "Authorization: Bearer $token" \
            -F "files=@/tmp/test-100mb.bin")
        
        local http_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local time_total=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
        
        echo "📊 Résultats:"
        echo "   - Status: $http_status"
        echo "   - Temps: ${time_total}s"
        
        if [ "$http_status" = "200" ]; then
            echo "✅ Test d'upload réussi"
        else
            echo "❌ Test d'upload échoué"
        fi
    else
        echo "❌ Impossible d'obtenir un token"
    fi
    
    # Nettoyer
    rm -f /tmp/test-100mb.bin
    
    echo "✅ Tests terminés"
    echo ""
}

# Fonction pour afficher les recommandations
show_recommendations() {
    echo "📋 7. RECOMMANDATIONS POUR CLOUDFLARE"
    echo "------------------------------------"
    
    echo "🔧 Configuration Cloudflare recommandée:"
    echo ""
    echo "1. Page Rules pour /api/upload/*:"
    echo "   - Cache Level: Bypass"
    echo "   - Browser Cache TTL: Respect Existing Headers"
    echo "   - Edge Cache TTL: 2 hours"
    echo ""
    echo "2. Security Level:"
    echo "   - Set to 'Essentially Off' for upload endpoints"
    echo ""
    echo "3. Rate Limiting:"
    echo "   - Disable for /api/upload/*"
    echo ""
    echo "4. WAF Rules:"
    echo "   - Disable for /api/upload/*"
    echo ""
    echo "5. Timeouts:"
    echo "   - Increase to 600 seconds (10 minutes)"
    echo ""
    echo "6. File Size Limits:"
    echo "   - Increase to 100GB"
    echo ""
}

# Fonction principale
main() {
    echo "🚀 DÉBUT DE L'OPTIMISATION"
    echo "========================="
    echo ""
    
    # Optimiser les limites système
    optimize_system_limits
    
    # Optimiser Docker
    optimize_docker
    
    # Optimiser Nginx
    optimize_nginx
    
    # Optimiser le backend
    optimize_backend
    
    # Optimiser PostgreSQL
    optimize_postgres
    
    # Tester les optimisations
    test_optimizations
    
    # Afficher les recommandations
    show_recommendations
    
    echo "🎯 OPTIMISATION TERMINÉE"
    echo "======================="
    echo ""
    echo "💡 Prochaines étapes:"
    echo "   1. Configurer Cloudflare selon les recommandations"
    echo "   2. Exécuter ./test-large-uploads.sh pour tester"
    echo "   3. Surveiller les logs pendant les tests"
    echo ""
}

# Exécuter le script principal
main
