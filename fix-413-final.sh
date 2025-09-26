#!/bin/bash

echo "🔧 CORRECTION FINALE ERREUR 413"
echo "================================"
echo ""

# 1. Vérifier la configuration Nginx actuelle
echo "📋 Configuration Nginx complète:"
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

echo ""
echo "🔍 Analyse des logs Nginx pour erreur 413..."

# 2. Vérifier les logs Nginx en temps réel
echo "📄 Logs Nginx récents:"
docker-compose logs nginx --tail=50

echo ""

# 3. Vérifier la configuration SSL/TLS
echo "🔐 Configuration SSL/TLS:"
docker-compose exec nginx nginx -T | grep -E "(ssl_|client_max_body_size|location.*api)" | head -20

echo ""

# 4. Forcer la reconstruction de Nginx
echo "🔄 Reconstruction complète de Nginx..."
docker-compose down nginx
docker-compose up -d --build nginx

echo "⏳ Attente du redémarrage (15 secondes)..."
sleep 15

# 5. Vérifier que Nginx fonctionne
echo "🔍 Vérification du statut Nginx:"
docker-compose ps nginx

echo ""

# 6. Test d'upload avec différents tailles
echo "🧪 Tests d'upload progressifs:"

TOKEN_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Token obtenu"
    
    # Test 1: 1MB
    echo "📤 Test 1: Upload 1MB..."
    dd if=/dev/zero of=/tmp/test-1mb.bin bs=1M count=1 2>/dev/null
    RESPONSE1=$(curl -s -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-1mb.bin" \
      -w "HTTPSTATUS:%{http_code}")
    STATUS1=$(echo "$RESPONSE1" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "  Status: $STATUS1"
    rm -f /tmp/test-1mb.bin
    
    # Test 2: 10MB
    echo "📤 Test 2: Upload 10MB..."
    dd if=/dev/zero of=/tmp/test-10mb.bin bs=1M count=10 2>/dev/null
    RESPONSE2=$(curl -s -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-10mb.bin" \
      -w "HTTPSTATUS:%{http_code}")
    STATUS2=$(echo "$RESPONSE2" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "  Status: $STATUS2"
    rm -f /tmp/test-10mb.bin
    
    # Test 3: 50MB
    echo "📤 Test 3: Upload 50MB..."
    dd if=/dev/zero of=/tmp/test-50mb.bin bs=1M count=50 2>/dev/null
    RESPONSE3=$(curl -s -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-50mb.bin" \
      -w "HTTPSTATUS:%{http_code}")
    STATUS3=$(echo "$RESPONSE3" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "  Status: $STATUS3"
    rm -f /tmp/test-50mb.bin
    
    # Résumé des tests
    echo ""
    echo "📊 Résumé des tests:"
    echo "  1MB:  $STATUS1"
    echo "  10MB: $STATUS2"
    echo "  50MB: $STATUS3"
    
    if [ "$STATUS3" = "200" ]; then
        echo "✅ Upload 50MB réussi !"
    else
        echo "❌ Upload 50MB échoué"
        echo "🔍 Réponse: $(echo "$RESPONSE3" | sed 's/HTTPSTATUS:[0-9]*$//')"
    fi
else
    echo "❌ Impossible d'obtenir un token"
fi

echo ""

# 7. Vérifier la configuration du reverse proxy
echo "🔧 Vérification configuration reverse proxy:"
docker-compose exec nginx nginx -T | grep -A 10 -B 5 "location.*api"

echo ""

# 8. Vérifier les limites système
echo "💾 Vérification limites système:"
echo "  - Limite fichiers ouverts: $(ulimit -n)"
echo "  - Limite mémoire: $(ulimit -m)"
echo "  - Limite taille fichier: $(ulimit -f)"

echo ""

# 9. Test direct vers le backend (sans Nginx)
echo "🔧 Test direct vers backend (sans Nginx):"
dd if=/dev/zero of=/tmp/test-direct.bin bs=1M count=10 2>/dev/null
DIRECT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@/tmp/test-direct.bin" \
  -w "HTTPSTATUS:%{http_code}")
DIRECT_STATUS=$(echo "$DIRECT_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
echo "  Status direct: $DIRECT_STATUS"
rm -f /tmp/test-direct.bin

echo ""
echo "🎯 CORRECTION TERMINÉE"
echo "======================"
