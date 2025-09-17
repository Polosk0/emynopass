#!/bin/bash

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e "  FileShare - Démarrage en développement"
echo -e "========================================${NC}"
echo

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

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé. Veuillez l'installer d'abord."
    echo "   Télécharger depuis: https://nodejs.org/"
    exit 1
fi

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé. Veuillez l'installer d'abord."
    echo "   Télécharger depuis: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Vérifier si Docker Compose est disponible
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas disponible."
    exit 1
fi

log_success "Prérequis vérifiés avec succès!"
echo

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    log_info "Création du fichier .env..."
    cp env.example .env
    log_success "Fichier .env créé. Configuration par défaut appliquée."
    echo
fi

# Créer les dossiers nécessaires
log_info "Création des dossiers nécessaires..."
mkdir -p uploads logs backups
log_success "Dossiers créés avec succès!"
echo

# Fonction pour installer les dépendances
install_dependencies() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        log_info "Installation des dépendances $name..."
        cd "$dir" || exit 1
        npm install
        if [ $? -ne 0 ]; then
            log_error "Erreur lors de l'installation des dépendances $name"
            exit 1
        fi
        cd - > /dev/null || exit 1
    fi
}

# Installer les dépendances
log_info "Vérification et installation des dépendances..."

# Dépendances racine
install_dependencies "." "racine"

# Dépendances backend
install_dependencies "backend" "backend"

# Dépendances frontend
install_dependencies "frontend" "frontend"

log_success "Toutes les dépendances sont installées!"
echo

# Démarrer les services Docker (base de données et Redis)
log_info "Démarrage des services Docker..."
docker-compose up -d database redis
if [ $? -ne 0 ]; then
    log_error "Erreur lors du démarrage des services Docker"
    exit 1
fi

log_success "Services Docker démarrés!"
echo

# Attendre que la base de données soit prête
log_info "Attente de la base de données (30 secondes)..."
sleep 30

# Configuration de la base de données
log_info "Configuration de la base de données..."
cd backend || exit 1

# Générer le client Prisma
log_info "Génération du client Prisma..."
npx prisma generate
if [ $? -ne 0 ]; then
    log_error "Erreur lors de la génération du client Prisma"
    exit 1
fi

# Exécuter les migrations
log_info "Exécution des migrations..."
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    log_warning "Les migrations ont échoué, tentative de déploiement..."
    npx prisma migrate deploy
fi

# Seeder la base de données
log_info "Seeding de la base de données..."
npx prisma db seed
if [ $? -ne 0 ]; then
    log_warning "Le seeding a échoué, mais ce n'est pas critique"
fi

cd - > /dev/null || exit 1
log_success "Base de données configurée!"
echo

# Fonction pour démarrer un service en arrière-plan
start_service() {
    local name=$1
    local dir=$2
    local command=$3
    local port=$4
    
    log_info "Démarrage de $name..."
    cd "$dir" || exit 1
    
    # Créer un fichier de log pour ce service
    local log_file="../logs/${name}.log"
    
    # Démarrer le service en arrière-plan
    nohup $command > "$log_file" 2>&1 &
    local pid=$!
    
    # Sauvegarder le PID
    echo $pid > "../logs/${name}.pid"
    
    cd - > /dev/null || exit 1
    
    log_success "$name démarré (PID: $pid, Port: $port)"
}

# Créer le dossier de logs
mkdir -p logs

# Démarrer les services
log_info "Démarrage des services..."
echo

# Démarrer le backend
start_service "backend" "backend" "npm run dev" "3001"

# Attendre un peu puis démarrer le frontend
sleep 5
start_service "frontend" "frontend" "npm run dev" "3000"

# Attendre que les services soient prêts
log_info "Attente du démarrage des services (15 secondes)..."
sleep 15

# Vérifier si les services sont accessibles
check_service() {
    local name=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null; then
        log_success "$name est accessible"
    else
        log_warning "$name n'est pas encore accessible"
    fi
}

echo
log_info "Vérification des services..."
check_service "Backend" "http://localhost:3001/api/health"
check_service "Frontend" "http://localhost:3000"

echo
log_success "Tous les services sont démarrés!"
echo
echo -e "${CYAN}🌐 URLs disponibles:${NC}"
echo "   - Application: http://localhost:3000"
echo "   - API:         http://localhost:3001"
echo "   - API Health:  http://localhost:3001/api/health"
echo
echo -e "${CYAN}📊 Commandes utiles:${NC}"
echo "   - docker-compose logs     : Voir les logs Docker"
echo "   - tail -f logs/backend.log : Voir les logs backend"
echo "   - tail -f logs/frontend.log: Voir les logs frontend"
echo "   - npx prisma studio       : Interface base de données (dans backend/)"
echo
echo -e "${CYAN}🛑 Pour arrêter les services:${NC}"
echo "   ./stop-dev.sh"
echo

# Ouvrir le navigateur (si disponible)
if command -v xdg-open &> /dev/null; then
    sleep 3
    xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
    sleep 3
    open http://localhost:3000 &
fi

echo -e "${GREEN}✨ Développement prêt! Bon codage!${NC}"
