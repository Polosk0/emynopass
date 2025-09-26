#!/bin/bash

echo "🔧 CORRECTION PROBLÈME DE CONNEXION - EMYNOPASS"
echo "==============================================="
echo ""

# Fonction pour redémarrer les services
restart_services() {
    echo "📋 1. REDÉMARRAGE DES SERVICES"
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

# Fonction pour optimiser la configuration Nginx
optimize_nginx_config() {
    echo "📋 2. OPTIMISATION CONFIGURATION NGINX"
    echo "-------------------------------------"
    
    # Créer une configuration Nginx optimisée
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
    
    echo "✅ Configuration Nginx optimisée"
    echo ""
}

# Fonction pour optimiser les limites système
optimize_system_limits() {
    echo "📋 3. OPTIMISATION LIMITES SYSTÈME"
    echo "---------------------------------"
    
    # Augmenter les limites
    echo "🔧 Augmentation des limites système..."
    ulimit -n 65536
    ulimit -f unlimited
    ulimit -v unlimited
    
    echo "✅ Limites système optimisées"
    echo ""
}

# Fonction pour tester la connectivité
test_connectivity() {
    echo "📋 4. TEST DE CONNECTIVITÉ"
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
    else
        echo "❌ Problème de connectivité détecté"
    fi
    
    echo ""
}

# Fonction pour tester l'upload progressif
test_progressive_upload() {
    echo "📋 5. TEST D'UPLOAD PROGRESSIF"
    echo "-----------------------------"
    
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
    
    # Tailles de test progressives
    local sizes=(1 5 10 50 100)
    local results=()
    
    for size in "${sizes[@]}"; do
        echo "🧪 Test d'upload de ${size}MB..."
        
        # Créer le fichier de test
        dd if=/dev/zero of="/tmp/test-${size}mb.bin" bs=1M count=$size 2>/dev/null
        
        # Test d'upload
        local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
            -X POST https://emynona.cloud/api/upload/files \
            -H "Authorization: Bearer $token" \
            -F "files=@/tmp/test-${size}mb.bin")
        
        local upload_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local upload_time=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
        
        echo "   - Status: $upload_status"
        echo "   - Temps: ${upload_time}s"
        
        if [ "$upload_status" = "200" ]; then
            echo "✅ Upload ${size}MB réussi"
            results+=("✅ ${size}MB: RÉUSSI")
        else
            echo "❌ Upload ${size}MB échoué"
            results+=("❌ ${size}MB: ÉCHOUÉ")
            echo "⚠️ Arrêt des tests - échec à ${size}MB"
            break
        fi
        
        # Nettoyer
        rm -f "/tmp/test-${size}mb.bin"
        echo ""
        
        sleep 2  # Pause entre les tests
    done
    
    # Afficher le résumé
    echo "📋 RÉSUMÉ DES TESTS"
    echo "=================="
    for result in "${results[@]}"; do
        echo "$result"
    done
    
    echo ""
}

# Fonction pour afficher les recommandations Cloudflare
show_cloudflare_recommendations() {
    echo "📋 6. RECOMMANDATIONS CLOUDFLARE"
    echo "-------------------------------"
    
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
    echo "7. SSL/TLS:"
    echo "   - Set to 'Full (strict)'"
    echo ""
}

# Fonction principale
main() {
    restart_services
    optimize_nginx_config
    optimize_system_limits
    test_connectivity
    test_progressive_upload
    show_cloudflare_recommendations
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
    echo ""
    echo "💡 Prochaines étapes:"
    echo "   1. Configurer Cloudflare selon les recommandations"
    echo "   2. Exécuter ./test-large-uploads.sh pour tester"
    echo "   3. Surveiller les logs pendant les tests"
    echo ""
}

# Exécuter le script principal
main
