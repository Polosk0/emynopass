#!/bin/bash

echo "🔧 CORRECTION ERREUR 413 - NGINX"
echo "================================="
echo ""

# 1. Vérifier la configuration Nginx actuelle
echo "📋 Configuration Nginx actuelle:"
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

echo ""
echo "🔍 Recherche de la cause de l'erreur 413..."

# 2. Vérifier les logs Nginx pour l'erreur 413
echo "📄 Logs Nginx avec erreurs 413:"
docker-compose logs nginx 2>&1 | grep -i "413\|client_max_body_size\|request entity too large" || echo "Aucune erreur 413 trouvée dans les logs"

echo ""

# 3. Vérifier si la configuration est bien appliquée
echo "🧪 Test de la configuration Nginx:"
docker-compose exec nginx nginx -T | grep -E "(client_max_body_size|location.*api)" || echo "Configuration non trouvée"

echo ""

# 4. Redémarrer Nginx pour appliquer la configuration
echo "🔄 Redémarrage de Nginx..."
docker-compose restart nginx

echo "⏳ Attente du redémarrage (10 secondes)..."
sleep 10

# 5. Vérifier que Nginx fonctionne
echo "🔍 Vérification du statut Nginx:"
docker-compose ps nginx

echo ""

# 6. Test d'upload après redémarrage
echo "🧪 Test d'upload après redémarrage:"
TOKEN_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Token obtenu"
    
    # Créer un fichier de test de 50MB
    dd if=/dev/zero of=/tmp/test-50mb.bin bs=1M count=50 2>/dev/null
    
    echo "📤 Test upload 50MB via HTTPS:"
    UPLOAD_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-50mb.bin" \
      -w "HTTPSTATUS:%{http_code}")
    
    HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "  Status: $HTTP_STATUS"
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "  ✅ Upload 50MB réussi via HTTPS !"
    else
        echo "  ❌ Échec upload 50MB (Status: $HTTP_STATUS)"
        echo "  📄 Réponse: $RESPONSE_BODY"
    fi
    
    # Nettoyer
    rm -f /tmp/test-50mb.bin
else
    echo "❌ Impossible d'obtenir un token"
fi

echo ""

# 7. Si l'erreur persiste, vérifier la configuration SSL/TLS
echo "🔐 Vérification configuration SSL:"
docker-compose exec nginx nginx -T | grep -E "(ssl_|client_max_body_size)" | head -10

echo ""
echo "🎯 CORRECTION TERMINÉE"
echo "======================"
