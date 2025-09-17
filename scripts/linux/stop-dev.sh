#!/bin/bash

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e "  FileShare - Arrêt des services"
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

# Fonction pour arrêter un service
stop_service() {
    local name=$1
    local pid_file="logs/${name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Arrêt de $name (PID: $pid)..."
            kill "$pid"
            sleep 2
            
            # Vérifier si le processus est toujours actif
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Forçage de l'arrêt de $name..."
                kill -9 "$pid"
            fi
            
            log_success "$name arrêté"
        else
            log_warning "$name n'était pas en cours d'exécution"
        fi
        
        # Supprimer le fichier PID
        rm -f "$pid_file"
    else
        log_warning "Fichier PID pour $name non trouvé"
    fi
}

# Arrêter les services Node.js
log_info "Arrêt des services Node.js..."

# Arrêter le frontend
stop_service "frontend"

# Arrêter le backend
stop_service "backend"

echo

# Arrêter les services Docker
log_info "Arrêt des services Docker..."
docker-compose stop
if [ $? -eq 0 ]; then
    log_success "Services Docker arrêtés"
else
    log_error "Erreur lors de l'arrêt des services Docker"
fi

echo

# Optionnel: Supprimer les conteneurs Docker
read -p "Voulez-vous supprimer les conteneurs Docker ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Suppression des conteneurs Docker..."
    docker-compose down
    if [ $? -eq 0 ]; then
        log_success "Conteneurs Docker supprimés"
    else
        log_error "Erreur lors de la suppression des conteneurs"
    fi
fi

echo

# Nettoyer les processus Node.js restants (sécurité)
log_info "Nettoyage des processus Node.js restants..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

# Nettoyer les fichiers de logs anciens (optionnel)
if [ -d "logs" ]; then
    find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
fi

log_success "Tous les services ont été arrêtés!"
echo
echo -e "${CYAN}📊 Pour redémarrer:${NC}"
echo "   ./start-dev.sh"
echo
echo -e "${GREEN}✨ Arrêt terminé!${NC}"
