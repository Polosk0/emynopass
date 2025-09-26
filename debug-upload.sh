#!/bin/bash

echo "🔍 DIAGNOSTIC UPLOAD - EMYNOPASS"
echo "================================="
echo ""

# 1. Vérifier la configuration Nginx
echo "📋 Configuration Nginx actuelle:"
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -E "(client_max_body_size|timeout|proxy_)" || echo "Configuration non trouvée"

echo ""

# 2. Vérifier les logs Nginx
echo "📄 Logs Nginx récents:"
docker-compose logs nginx --tail=20

echo ""

# 3. Vérifier les logs Backend
echo "📄 Logs Backend récents:"
docker-compose logs backend --tail=20

echo ""

# 4. Tester la configuration Nginx
echo "🧪 Test de configuration Nginx:"
docker-compose exec nginx nginx -t

echo ""

# 5. Vérifier les limites système
echo "💾 Limites système:"
echo "  - Espace disque:"
df -h
echo "  - Mémoire:"
free -h
echo "  - Limites processus:"
ulimit -a

echo ""

# 6. Test d'upload direct vers le backend (sans Nginx)
echo "🔧 Test d'upload direct vers backend:"
TOKEN_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Token obtenu"
    
    # Créer un fichier de test de 10MB
    dd if=/dev/zero of=/tmp/test-10mb.bin bs=1M count=10 2>/dev/null
    
    echo "📤 Test upload 10MB direct vers backend:"
    BACKEND_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-10mb.bin" \
      -w "HTTPSTATUS:%{http_code}")
    
    HTTP_STATUS=$(echo "$BACKEND_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$BACKEND_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "  Status: $HTTP_STATUS"
    echo "  Réponse: $RESPONSE_BODY"
    
    # Nettoyer
    rm -f /tmp/test-10mb.bin
else
    echo "❌ Impossible d'obtenir un token"
fi

echo ""

# 7. Vérifier la configuration Express
echo "🔧 Configuration Express (backend):"
docker-compose exec backend cat /app/src/index.ts | grep -E "(limit|body)" || echo "Configuration non trouvée"

echo ""

# 8. Vérifier la configuration Multer
echo "🔧 Configuration Multer (backend):"
docker-compose exec backend cat /app/src/routes/upload.ts | grep -E "(fileSize|limits)" || echo "Configuration non trouvée"

echo ""
echo "🎯 DIAGNOSTIC TERMINÉ"
echo "====================="
