#!/bin/bash

echo "🚀 DÉPLOIEMENT VPS - EMYNOPASS"
echo "================================"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [[ ! -f "docker-compose.yml" ]]; then
    echo "❌ Erreur: Ce script doit être exécuté dans le répertoire du projet (avec docker-compose.yml)"
    exit 1
fi

echo "📁 Répertoire de travail: $(pwd)"
echo ""

# 1. Sauvegarder les modifications locales
echo "💾 Sauvegarde des modifications locales..."
git add .
git commit -m "feat: Optimisations uploads gros fichiers pour VPS" || echo "Aucune modification à committer"
git push origin main

echo "✅ Modifications sauvegardées"
echo ""

# 2. Récupérer les dernières modifications
echo "📥 Récupération des dernières modifications..."
git pull origin main

echo "✅ Code mis à jour"
echo ""

# 3. Reconstruire et redémarrer les services
echo "🔨 Reconstruction des services..."
docker-compose down
docker-compose up -d --build

echo "✅ Services reconstruits et redémarrés"
echo ""

# 4. Vérifier le statut des services
echo "🔍 Vérification du statut des services..."
docker-compose ps

echo ""
echo "⏳ Attente du démarrage des services (30 secondes)..."
sleep 30

# 5. Test de connectivité
echo "🌐 Test de connectivité..."
if curl -f -s https://emynona.cloud/health > /dev/null; then
    echo "✅ Serveur accessible via HTTPS"
else
    echo "❌ Serveur inaccessible via HTTPS"
    echo "🔍 Vérification des logs..."
    docker-compose logs --tail=20
    exit 1
fi

# 6. Test d'authentification
echo "🔐 Test d'authentification..."
TOKEN_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    echo "✅ Authentification fonctionnelle"
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 Token obtenu: ${TOKEN:0:50}..."
else
    echo "❌ Erreur d'authentification"
    echo "Réponse: $TOKEN_RESPONSE"
    exit 1
fi

# 7. Test d'upload de gros fichier
echo "📤 Test d'upload de gros fichier (100MB)..."

# Créer un fichier de test
dd if=/dev/zero of=/tmp/test-large-file.bin bs=1M count=100 2>/dev/null

# Test d'upload
UPLOAD_RESPONSE=$(curl -s -X POST https://emynona.cloud/api/upload/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@/tmp/test-large-file.bin" \
  -w "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Upload de 100MB réussi !"
    echo "📊 Réponse: $RESPONSE_BODY"
else
    echo "❌ Échec de l'upload (Status: $HTTP_STATUS)"
    echo "📄 Réponse: $RESPONSE_BODY"
fi

# Nettoyer le fichier de test
rm -f /tmp/test-large-file.bin

echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ !"
echo "========================="
echo ""
echo "📋 Résumé:"
echo "  ✅ Code mis à jour"
echo "  ✅ Services redémarrés"
echo "  ✅ HTTPS fonctionnel"
echo "  ✅ Authentification OK"
if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅ Upload gros fichiers OK"
else
    echo "  ⚠️  Upload gros fichiers à vérifier"
fi
echo ""
echo "🌐 Votre application est accessible sur: https://emynona.cloud"
echo ""
echo "🔧 Commandes utiles:"
echo "  - Voir les logs: docker-compose logs -f"
echo "  - Redémarrer: docker-compose restart"
echo "  - Statut: docker-compose ps"
