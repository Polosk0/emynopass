#!/bin/bash

# Script de correction pour les problèmes backend VPS
echo "🔧 Correction des problèmes backend VPS"
echo "======================================"

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

# 1. Arrêter tous les services
echo ""
log_info "1. Arrêt des services"
docker-compose down

# 2. Nettoyer les conteneurs et images
echo ""
log_info "2. Nettoyage Docker"
docker system prune -f
docker volume prune -f

# 3. Reconstruire les images
echo ""
log_info "3. Reconstruction des images"
docker-compose build --no-cache

# 4. Démarrer PostgreSQL d'abord
echo ""
log_info "4. Démarrage PostgreSQL"
docker-compose up -d postgres

# Attendre que PostgreSQL soit prêt
log_info "Attente de PostgreSQL..."
timeout=60
counter=0
while ! docker-compose exec postgres pg_isready -U emynopass -d emynopass 2>/dev/null; do
    if [ $counter -ge $timeout ]; then
        log_error "Timeout: PostgreSQL n'est pas prêt"
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo ""
log_success "PostgreSQL est prêt"

# 5. Initialiser la base de données
echo ""
log_info "5. Initialisation de la base de données"
if [ -f "scripts/migrate-sqlite-to-postgres.js" ]; then
    node scripts/migrate-sqlite-to-postgres.js
else
    log_warning "Script de migration non trouvé, initialisation manuelle"
    docker-compose exec postgres psql -U emynopass -d emynopass -c "
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
        CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";
    "
fi

# 6. Démarrer le backend
echo ""
log_info "6. Démarrage du backend"
docker-compose up -d backend

# Attendre que le backend soit prêt
log_info "Attente du backend..."
timeout=60
counter=0
while ! curl -f http://localhost:3001/health 2>/dev/null; do
    if [ $counter -ge $timeout ]; then
        log_error "Timeout: Backend n'est pas prêt"
        log_info "Logs du backend:"
        docker-compose logs --tail=20 backend
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo ""
log_success "Backend est prêt"

# 7. Démarrer tous les autres services
echo ""
log_info "7. Démarrage des autres services"
docker-compose up -d

# 8. Vérification finale
echo ""
log_info "8. Vérification finale"
sleep 5

# Test des services
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    log_success "Backend: OK"
else
    log_error "Backend: ERREUR"
fi

if curl -f http://localhost:3000 >/dev/null 2>&1; then
    log_success "Frontend: OK"
else
    log_error "Frontend: ERREUR"
fi

if docker-compose exec postgres pg_isready -U emynopass -d emynopass >/dev/null 2>&1; then
    log_success "PostgreSQL: OK"
else
    log_error "PostgreSQL: ERREUR"
fi

echo ""
log_info "Correction terminée"
echo "===================="
echo ""
echo "📊 Services disponibles:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:3001"
echo "  • PostgreSQL: localhost:5432"
echo ""
echo "🔧 Commandes utiles:"
echo "  • Logs: docker-compose logs -f"
echo "  • Statut: docker-compose ps"
echo "  • Arrêt: docker-compose down"


