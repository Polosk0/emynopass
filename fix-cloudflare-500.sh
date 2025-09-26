#!/bin/bash

echo "🔧 CORRECTION ERREUR 500 CLOUDFLARE - EMYNOPASS"
echo "==============================================="
echo ""

# 1. Vérifier les services Docker
echo "📋 1. VÉRIFICATION DES SERVICES"
echo "-------------------------------"
docker-compose ps

echo ""
echo "📋 2. REDÉMARRAGE DES SERVICES"
echo "------------------------------"

# Arrêter tous les services
echo "🛑 Arrêt des services..."
docker-compose down

# Attendre un peu
sleep 5

# Redémarrer les services
echo "🚀 Redémarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 30

echo ""
echo "📋 3. VÉRIFICATION DU DÉMARRAGE"
echo "-------------------------------"
docker-compose ps

echo ""
echo "📋 4. TEST DE CONNECTIVITÉ"
echo "-------------------------"

# Test du backend
echo "🔍 Test du backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
echo "Backend Status: $BACKEND_STATUS"

# Test de Nginx
echo "🔍 Test de Nginx..."
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health)
echo "Nginx Status: $NGINX_STATUS"

# Test via Cloudflare
echo "🔍 Test via Cloudflare..."
CLOUDFLARE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://emynona.cloud/health)
echo "Cloudflare Status: $CLOUDFLARE_STATUS"

echo ""
echo "📋 5. CONFIGURATION CLOUDFLARE"
echo "------------------------------"

echo "🔧 Configuration recommandée pour Cloudflare:"
echo ""
echo "1. Page Rules:"
echo "   - URL: emynona.cloud/api/upload/*"
echo "   - Settings:"
echo "     * Cache Level: Bypass"
echo "     * Browser Cache TTL: Respect Existing Headers"
echo "     * Edge Cache TTL: 2 hours"
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

echo "📋 6. TEST D'UPLOAD PROGRESSIF"
echo "------------------------------"

# Créer des fichiers de test de différentes tailles
echo "🔍 Création de fichiers de test..."

# 1MB
dd if=/dev/zero of=/tmp/test-1mb.bin bs=1M count=1 2>/dev/null
echo "✅ Fichier 1MB créé"

# 10MB
dd if=/dev/zero of=/tmp/test-10mb.bin bs=1M count=10 2>/dev/null
echo "✅ Fichier 10MB créé"

# 50MB
dd if=/dev/zero of=/tmp/test-50mb.bin bs=1M count=50 2>/dev/null
echo "✅ Fichier 50MB créé"

# Obtenir un token
echo "🔐 Connexion pour obtenir un token..."
TOKEN_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ Token obtenu"
    
    # Test 1MB
    echo "🧪 Test upload 1MB..."
    UPLOAD_1MB=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-1mb.bin")
    
    HTTP_1MB=$(echo "$UPLOAD_1MB" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "📊 Status 1MB: $HTTP_1MB"
    
    # Test 10MB
    echo "🧪 Test upload 10MB..."
    UPLOAD_10MB=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-10mb.bin")
    
    HTTP_10MB=$(echo "$UPLOAD_10MB" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "📊 Status 10MB: $HTTP_10MB"
    
    # Test 50MB
    echo "🧪 Test upload 50MB..."
    UPLOAD_50MB=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST https://emynona.cloud/api/upload/files \
      -H "Authorization: Bearer $TOKEN" \
      -F "files=@/tmp/test-50mb.bin")
    
    HTTP_50MB=$(echo "$UPLOAD_50MB" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "📊 Status 50MB: $HTTP_50MB"
    
else
    echo "❌ Impossible d'obtenir un token"
fi

# Nettoyer
echo "🧹 Nettoyage des fichiers de test..."
rm -f /tmp/test-1mb.bin /tmp/test-10mb.bin /tmp/test-50mb.bin

echo ""
echo "📋 7. RÉSUMÉ ET RECOMMANDATIONS"
echo "-------------------------------"

echo "🔍 Résultats des tests:"
echo "   - Backend: $BACKEND_STATUS"
echo "   - Nginx: $NGINX_STATUS"
echo "   - Cloudflare: $CLOUDFLARE_STATUS"

if [ "$CLOUDFLARE_STATUS" = "200" ]; then
    echo "✅ Cloudflare fonctionne"
else
    echo "❌ Problème avec Cloudflare"
    echo "💡 Actions recommandées:"
    echo "   1. Vérifier les Page Rules Cloudflare"
    echo "   2. Désactiver WAF pour /api/upload/*"
    echo "   3. Augmenter les timeouts Cloudflare"
    echo "   4. Contacter le support Cloudflare"
fi

echo ""
echo "🎯 CORRECTION TERMINÉE"
echo "====================="
