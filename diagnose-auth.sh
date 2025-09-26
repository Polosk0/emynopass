#!/bin/bash

echo "🔍 DIAGNOSTIC COMPLET - EMYNOPASS AUTHENTIFICATION"
echo "=================================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Vérifier si Docker est en cours d'exécution
echo "1. VÉRIFICATION DOCKER"
echo "----------------------"
if docker-compose ps | grep -q "Up"; then
    print_result 0 "Docker Compose est en cours d'exécution"
    docker-compose ps
else
    print_result 1 "Docker Compose n'est pas en cours d'exécution"
    echo "Démarrage des services..."
    docker-compose up -d
    sleep 10
fi
echo ""

# Vérifier les logs du backend
echo "2. VÉRIFICATION LOGS BACKEND"
echo "----------------------------"
print_info "Dernières lignes des logs backend:"
docker-compose logs --tail=20 backend
echo ""

# Vérifier les variables d'environnement
echo "3. VÉRIFICATION VARIABLES D'ENVIRONNEMENT"
echo "----------------------------------------"
print_info "Variables d'environnement du backend:"
docker-compose exec backend printenv | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL)" || print_warning "Impossible de récupérer les variables d'environnement"
echo ""

# Vérifier la connexion à la base de données
echo "4. VÉRIFICATION BASE DE DONNÉES"
echo "-------------------------------"
print_info "Test de connexion à la base de données:"
docker-compose exec backend node -e "
const { database } = require('./dist/database');
database.getUserCount().then(count => {
  console.log('✅ Connexion DB OK - Nombre d\'utilisateurs:', count);
}).catch(err => {
  console.log('❌ Erreur DB:', err.message);
});
" 2>/dev/null || print_warning "Impossible de tester la base de données"
echo ""

# Lister les utilisateurs existants
echo "5. LISTE DES UTILISATEURS"
echo "------------------------"
print_info "Utilisateurs existants dans la base de données:"
docker-compose exec backend node -e "
const { database } = require('./dist/database');
database.getAllUsers().then(users => {
  if (users.length === 0) {
    console.log('❌ Aucun utilisateur trouvé');
  } else {
    console.log('✅ Utilisateurs trouvés:');
    users.forEach(user => {
      console.log(\`  - \${user.email} (\${user.role}) - Actif: \${user.isActive} - Démo: \${user.isDemo}\`);
    });
  }
}).catch(err => {
  console.log('❌ Erreur:', err.message);
});
" 2>/dev/null || print_warning "Impossible de lister les utilisateurs"
echo ""

# Tester l'API de santé
echo "6. TEST API DE SANTÉ"
echo "-------------------"
print_info "Test de l'endpoint /health:"
if curl -s -f http://localhost:3001/health > /dev/null; then
    print_result 0 "API de santé accessible"
    curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
else
    print_result 1 "API de santé inaccessible"
fi
echo ""

# Tester l'API publique
echo "7. TEST API PUBLIQUE"
echo "-------------------"
print_info "Test de l'endpoint /api/public/stats:"
if curl -s -f http://localhost:3001/api/public/stats > /dev/null; then
    print_result 0 "API publique accessible"
    curl -s http://localhost:3001/api/public/stats | jq . 2>/dev/null || curl -s http://localhost:3001/api/public/stats
else
    print_result 1 "API publique inaccessible"
fi
echo ""

# Tester la connexion admin
echo "8. TEST CONNEXION ADMIN"
echo "----------------------"
print_info "Test de connexion avec le compte admin:"
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "polosko@emynopass.dev", "password": "Emynopass2024!"}')

if echo "$ADMIN_RESPONSE" | grep -q "token"; then
    print_result 0 "Connexion admin réussie"
    echo "$ADMIN_RESPONSE" | jq . 2>/dev/null || echo "$ADMIN_RESPONSE"
else
    print_result 1 "Connexion admin échouée"
    echo "$ADMIN_RESPONSE"
fi
echo ""

# Tester la connexion démo
echo "9. TEST CONNEXION DÉMO"
echo "---------------------"
print_info "Test de connexion avec le compte démo:"
DEMO_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@emynopass.dev", "password": "demo2024"}')

if echo "$DEMO_RESPONSE" | grep -q "token"; then
    print_result 0 "Connexion démo réussie"
    echo "$DEMO_RESPONSE" | jq . 2>/dev/null || echo "$DEMO_RESPONSE"
else
    print_result 1 "Connexion démo échouée"
    echo "$DEMO_RESPONSE"
fi
echo ""

# Vérifier les ports
echo "10. VÉRIFICATION PORTS"
echo "---------------------"
print_info "Ports en écoute:"
netstat -tlnp | grep -E ":300[01]|:80|:443" || ss -tlnp | grep -E ":300[01]|:80|:443"
echo ""

# Vérifier les certificats SSL
echo "11. VÉRIFICATION SSL"
echo "-------------------"
print_info "Test de l'accès HTTPS:"
if curl -s -f https://emynona.cloud/health > /dev/null; then
    print_result 0 "HTTPS accessible"
else
    print_result 1 "HTTPS inaccessible"
fi
echo ""

# Vérifier la configuration Nginx
echo "12. VÉRIFICATION NGINX"
echo "---------------------"
if command -v nginx >/dev/null 2>&1; then
    print_info "Statut Nginx:"
    systemctl status nginx --no-pager -l || print_warning "Impossible de vérifier le statut Nginx"
    
    print_info "Configuration Nginx:"
    nginx -t 2>&1 || print_warning "Erreur dans la configuration Nginx"
else
    print_warning "Nginx n'est pas installé"
fi
echo ""

# Résumé et recommandations
echo "13. RÉSUMÉ ET RECOMMANDATIONS"
echo "============================="
echo ""

# Vérifier si des problèmes ont été détectés
PROBLEMS=0

if ! docker-compose ps | grep -q "Up"; then
    print_warning "Problème: Docker Compose n'est pas en cours d'exécution"
    PROBLEMS=$((PROBLEMS + 1))
fi

if ! curl -s -f http://localhost:3001/health > /dev/null; then
    print_warning "Problème: API backend inaccessible"
    PROBLEMS=$((PROBLEMS + 1))
fi

if ! echo "$ADMIN_RESPONSE" | grep -q "token"; then
    print_warning "Problème: Connexion admin échouée"
    PROBLEMS=$((PROBLEMS + 1))
fi

if ! echo "$DEMO_RESPONSE" | grep -q "token"; then
    print_warning "Problème: Connexion démo échouée"
    PROBLEMS=$((PROBLEMS + 1))
fi

echo ""
if [ $PROBLEMS -eq 0 ]; then
    print_result 0 "Aucun problème détecté - Le système fonctionne correctement"
else
    print_warning "$PROBLEMS problème(s) détecté(s)"
    echo ""
    echo "RECOMMANDATIONS:"
    echo "1. Redémarrer les services: docker-compose down && docker-compose up -d"
    echo "2. Vérifier les logs: docker-compose logs -f backend"
    echo "3. Réinitialiser les comptes si nécessaire"
    echo "4. Vérifier la configuration Nginx"
fi

echo ""
echo "🔍 Diagnostic terminé - $(date)"
