#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Démarrage intelligent d'Emynopass...${NC}"

# Fonction pour vérifier si Docker est disponible
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker et Docker Compose sont disponibles${NC}"
}

# Fonction pour créer les dossiers nécessaires
create_directories() {
    echo -e "${BLUE}📁 Création des dossiers nécessaires...${NC}"
    mkdir -p uploads logs data
    chmod 755 uploads logs data
    echo -e "${GREEN}✅ Dossiers créés${NC}"
}

# Fonction pour arrêter les services existants
stop_services() {
    echo -e "${BLUE}🛑 Arrêt des services existants...${NC}"
    docker-compose down 2>/dev/null || true
    echo -e "${GREEN}✅ Services arrêtés${NC}"
}

# Fonction pour nettoyer Docker
clean_docker() {
    echo -e "${BLUE}🧹 Nettoyage Docker...${NC}"
    docker system prune -f
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
}

# Fonction pour construire les images
build_images() {
    echo -e "${BLUE}🔨 Construction des images...${NC}"
    docker-compose build
    echo -e "${GREEN}✅ Images construites${NC}"
}

# Fonction pour démarrer les services
start_services() {
    echo -e "${BLUE}�� Démarrage des services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Services démarrés${NC}"
}

# Fonction pour vérifier les services
check_services() {
    echo -e "${BLUE}🔍 Vérification des services...${NC}"
    
    # Attendre que les services démarrent
    sleep 10
    
    # Vérifier le statut
    docker-compose ps
    
    # Vérifier le backend
    echo -e "${BLUE}🔍 Vérification du backend...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend: Disponible${NC}"
            break
        else
            echo -e "${YELLOW}⏳ Tentative $i/30...${NC}"
            sleep 2
        fi
    done
    
    # Vérifier le frontend
    echo -e "${BLUE}🔍 Vérification du frontend...${NC}"
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend: Disponible${NC}"
    else
        echo -e "${RED}❌ Frontend: Non disponible${NC}"
    fi
}

# Fonction pour afficher les logs
show_logs() {
    echo -e "${BLUE}📋 Logs des services:${NC}"
    docker-compose logs --tail=20
}

# Fonction pour afficher les informations de diagnostic
show_diagnostics() {
    echo -e "${BLUE}🔍 Diagnostic des services:${NC}"
    
    # Vérifier les conteneurs
    echo -e "${BLUE}📦 Conteneurs:${NC}"
    docker ps -a
    
    # Vérifier les images
    echo -e "${BLUE}��️ Images:${NC}"
    docker images | grep emynopass
    
    # Vérifier les volumes
    echo -e "${BLUE}💾 Volumes:${NC}"
    docker volume ls | grep emynopass
    
    # Vérifier les réseaux
    echo -e "${BLUE}🌐 Réseaux:${NC}"
    docker network ls | grep emynopass
}

# Fonction principale
main() {
    check_docker
    create_directories
    stop_services
    clean_docker
    build_images
    start_services
    check_services
    show_logs
    show_diagnostics
    
    echo -e "${GREEN}🎉 Démarrage terminé !${NC}"
    echo -e "${BLUE}�� Accès:${NC}"
    echo -e "  - Frontend: http://localhost:3000"
    echo -e "  - Backend: http://localhost:3001"
    echo -e "  - Redis: localhost:6379"
    echo -e "${BLUE}💡 Commandes utiles:${NC}"
    echo -e "  - Logs: docker-compose logs -f"
    echo -e "  - Statut: docker-compose ps"
    echo -e "  - Arrêt: docker-compose down"
    echo -e "  - Redémarrage: docker-compose restart"
}

# Exécuter la fonction principale
main "$@"
