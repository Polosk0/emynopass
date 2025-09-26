#!/bin/bash

# Script de migration complète de SQLite vers PostgreSQL
# Ce script effectue la migration complète du système

set -e

echo "🔄 Migration Emynopass de SQLite vers PostgreSQL"
echo "================================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
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

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé. Veuillez installer Node.js d'abord."
    exit 1
fi

log_info "Vérification des prérequis terminée"

# 1. Arrêter les services existants
log_info "Arrêt des services existants..."
docker-compose down 2>/dev/null || true
log_success "Services arrêtés"

# 2. Sauvegarder les données SQLite existantes
if [ -f "data/emynopass.db" ]; then
    log_info "Sauvegarde de la base SQLite existante..."
    cp data/emynopass.db data/emynopass.db.backup.$(date +%Y%m%d_%H%M%S)
    log_success "Sauvegarde créée"
else
    log_warning "Aucune base SQLite trouvée, migration des données ignorée"
fi

# 3. Installer les nouvelles dépendances
log_info "Installation des nouvelles dépendances PostgreSQL..."
cd backend
npm install
cd ..
log_success "Dépendances installées"

# 4. Démarrer PostgreSQL
log_info "Démarrage de PostgreSQL..."
docker-compose up -d postgres

# Attendre que PostgreSQL soit prêt
log_info "Attente de la disponibilité de PostgreSQL..."
timeout=60
counter=0
while ! docker-compose exec postgres pg_isready -U emynopass -d emynopass 2>/dev/null; do
    if [ $counter -ge $timeout ]; then
        log_error "Timeout: PostgreSQL n'est pas prêt après ${timeout} secondes"
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo ""
log_success "PostgreSQL est prêt"

# 5. Migrer les données si elles existent
if [ -f "data/emynopass.db" ]; then
    log_info "Migration des données de SQLite vers PostgreSQL..."
    
    # Exporter les variables d'environnement pour le script de migration
    export DB_HOST=localhost
    export DB_PORT=5432
    export DB_NAME=emynopass
    export DB_USER=emynopass
    export DB_PASSWORD=emynopass
    export SQLITE_DB_PATH=./data/emynopass.db
    
    # Exécuter le script de migration
    node scripts/migrate-sqlite-to-postgres.js
    
    if [ $? -eq 0 ]; then
        log_success "Migration des données terminée"
    else
        log_error "Erreur lors de la migration des données"
        exit 1
    fi
else
    log_info "Aucune donnée à migrer, initialisation avec les données par défaut"
fi

# 6. Démarrer tous les services
log_info "Démarrage de tous les services..."
docker-compose up -d

# Attendre que les services soient prêts
log_info "Attente de la disponibilité des services..."
sleep 10

# 7. Vérifier la santé des services
log_info "Vérification de la santé des services..."

# Vérifier PostgreSQL
if docker-compose exec postgres pg_isready -U emynopass -d emynopass >/dev/null 2>&1; then
    log_success "PostgreSQL: OK"
else
    log_error "PostgreSQL: ERREUR"
    exit 1
fi

# Vérifier le backend
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    log_success "Backend: OK"
else
    log_warning "Backend: En cours de démarrage..."
    sleep 10
    if curl -f http://localhost:3001/health >/dev/null 2>&1; then
        log_success "Backend: OK"
    else
        log_error "Backend: ERREUR"
        exit 1
    fi
fi

# Vérifier le frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    log_success "Frontend: OK"
else
    log_warning "Frontend: En cours de démarrage..."
    sleep 10
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        log_success "Frontend: OK"
    else
        log_error "Frontend: ERREUR"
        exit 1
    fi
fi

# 8. Afficher les informations de connexion
echo ""
echo "🎉 Migration terminée avec succès !"
echo "=================================="
echo ""
echo "📊 Services disponibles:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:3001"
echo "  • PostgreSQL: localhost:5432"
echo ""
echo "👤 Comptes par défaut:"
echo "  • Admin: polosko@emynopass.dev / Emynopass2024!"
echo "  • Demo:  demo@emynopass.dev / demo2024"
echo ""
echo "🔧 Commandes utiles:"
echo "  • Voir les logs: docker-compose logs -f"
echo "  • Arrêter: docker-compose down"
echo "  • Redémarrer: docker-compose restart"
echo ""
echo "📁 Fichiers importants:"
echo "  • Sauvegarde SQLite: data/emynopass.db.backup.*"
echo "  • Configuration: docker-compose.yml"
echo "  • Script de migration: scripts/migrate-sqlite-to-postgres.js"
echo ""

log_success "Migration complète terminée !"
