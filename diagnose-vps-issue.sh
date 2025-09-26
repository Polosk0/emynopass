#!/bin/bash

# Script de diagnostic pour les problèmes VPS
echo "🔍 Diagnostic des problèmes VPS Emynopass"
echo "=========================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Vérifier l'état des conteneurs
echo ""
log_info "1. État des conteneurs Docker"
docker-compose ps

# 2. Vérifier les logs du backend
echo ""
log_info "2. Logs du backend (dernières 50 lignes)"
docker-compose logs --tail=50 backend

# 3. Vérifier la connectivité PostgreSQL
echo ""
log_info "3. Test de connectivité PostgreSQL"
docker-compose exec postgres pg_isready -U emynopass -d emynopass

# 4. Vérifier les tables PostgreSQL
echo ""
log_info "4. Tables PostgreSQL"
docker-compose exec postgres psql -U emynopass -d emynopass -c "\dt"

# 5. Vérifier les utilisateurs
echo ""
log_info "5. Utilisateurs dans la base"
docker-compose exec postgres psql -U emynopass -d emynopass -c "SELECT email, role, isActive FROM users;"

# 6. Tester la connexion backend
echo ""
log_info "6. Test de connexion backend"
curl -f http://localhost:3001/health || log_error "Backend non accessible"

# 7. Vérifier les ports
echo ""
log_info "7. Ports en écoute"
netstat -tlnp | grep -E ':(3000|3001|5432|6379)'

# 8. Vérifier les variables d'environnement
echo ""
log_info "8. Variables d'environnement backend"
docker-compose exec backend env | grep -E '^(DB_|NODE_|PORT)'

# 9. Vérifier les permissions
echo ""
log_info "9. Permissions des dossiers"
ls -la data/ uploads/ logs/ 2>/dev/null || log_warning "Dossiers manquants"

# 10. Vérifier l'espace disque
echo ""
log_info "10. Espace disque"
df -h

echo ""
log_info "Diagnostic terminé"
echo "===================="


