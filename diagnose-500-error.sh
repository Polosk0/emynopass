#!/bin/bash

echo "🔍 DIAGNOSTIC ERREUR 500 - EMYNOPASS"
echo "===================================="
echo ""

# 1. Vérifier les logs Docker
echo "📋 1. LOGS DOCKER BACKEND (dernières 50 lignes)"
echo "-----------------------------------------------"
docker-compose logs --tail=50 backend | grep -E "(ERROR|error|Error|500|413|timeout|upload)"

echo ""
echo "📋 2. LOGS DOCKER NGINX (dernières 50 lignes)"
echo "---------------------------------------------"
docker-compose logs --tail=50 nginx | grep -E "(ERROR|error|Error|500|413|timeout|upload)"

echo ""
echo "📋 3. LOGS DOCKER POSTGRES (dernières 20 lignes)"
echo "------------------------------------------------"
docker-compose logs --tail=20 postgres | grep -E "(ERROR|error|Error|500|413|timeout)"

echo ""
echo "📋 4. VÉRIFICATION DES LIMITES SYSTÈME"
echo "-------------------------------------"

# Vérifier les limites de fichiers
echo "🔍 Limites de fichiers système:"
ulimit -n

# Vérifier l'espace disque
echo "🔍 Espace disque disponible:"
df -h

# Vérifier la mémoire
echo "🔍 Mémoire disponible:"
free -h

# Vérifier les processus Docker
echo "🔍 Processus Docker:"
docker ps -a

echo ""
echo "📋 5. TEST DE CONNECTIVITÉ DIRECTE"
echo "---------------------------------"

# Test direct du backend (sans Cloudflare)
echo "🔍 Test direct du backend (port 3001):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nTime: %{time_total}s\n" http://localhost:3001/health

# Test via Nginx local
echo "🔍 Test via Nginx local:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nTime: %{time_total}s\n" http://localhost:80/health

echo ""
echo "📋 6. VÉRIFICATION DES CONFIGURATIONS"
echo "------------------------------------"

# Vérifier la configuration Nginx
echo "🔍 Configuration Nginx (client_max_body_size):"
docker exec emynopass-nginx cat /etc/nginx/conf.d/default.conf | grep -E "(client_max_body_size|proxy_timeout|client_body_timeout)"

# Vérifier les variables d'environnement
echo "🔍 Variables d'environnement backend:"
docker exec emynopass-backend env | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL)"

echo ""
echo "📋 7. TEST D'UPLOAD DIRECT (SANS CLOUDFLARE)"
echo "--------------------------------------------"

# Créer un fichier de test de 10MB
echo "🔍 Création d'un fichier de test de 10MB..."
dd if=/dev/zero of=/tmp/test-10mb.bin bs=1M count=10 2>/dev/null

# Test d'upload direct au backend
echo "🔍 Test d'upload direct au backend (10MB)..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ Token obtenu: ${TOKEN:0:20}..."
    
    # Test d'upload direct
    UPLOAD_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-10mb.bin")
    
    HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "📊 Status: $HTTP_STATUS"
    echo "📄 Réponse: $RESPONSE_BODY"
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Upload direct réussi !"
    else
        echo "❌ Upload direct échoué"
    fi
else
    echo "❌ Impossible d'obtenir un token"
fi

# Nettoyer
rm -f /tmp/test-10mb.bin

echo ""
echo "📋 8. VÉRIFICATION CLOUDFLARE"
echo "-----------------------------"

# Vérifier si Cloudflare est actif
echo "🔍 Test de connectivité Cloudflare:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nTime: %{time_total}s\n" https://emynona.cloud/health

# Vérifier les headers Cloudflare
echo "🔍 Headers Cloudflare:"
curl -s -I https://emynona.cloud/health | grep -E "(cf-|cloudflare|server)"

echo ""
echo "📋 9. RECOMMANDATIONS"
echo "--------------------"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Le backend fonctionne correctement"
    echo "🔧 Problème identifié: Cloudflare ou Nginx"
    echo "💡 Solutions possibles:"
    echo "   - Augmenter les timeouts Cloudflare"
    echo "   - Configurer Cloudflare pour les gros fichiers"
    echo "   - Vérifier les limites de taille Cloudflare"
else
    echo "❌ Problème au niveau du backend"
    echo "💡 Solutions possibles:"
    echo "   - Redémarrer les services Docker"
    echo "   - Vérifier les logs d'erreur"
    echo "   - Augmenter les limites Express/Multer"
fi

echo ""
echo "🎯 DIAGNOSTIC TERMINÉ"
echo "===================="
