#!/bin/bash

# Script de test pour la configuration Docker d'Emynopass

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Test de la configuration Docker d'Emynopass${NC}"
echo "=================================================="

# Fonction pour tester une URL
test_url() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}🔍 Test de $name ($url)...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name accessible${NC}"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED}❌ $name non accessible après $max_attempts tentatives${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}   Tentative $attempt/$max_attempts...${NC}"
        sleep 2
        ((attempt++))
    done
}

# Vérifier que Docker est installé
echo -e "${YELLOW}🔧 Vérification de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker et Docker Compose disponibles${NC}"

# Vérifier que Docker est en cours d'exécution
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas en cours d'exécution${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker est en cours d'exécution${NC}"

# Arrêter les services existants
echo -e "${YELLOW}🛑 Arrêt des services existants...${NC}"
docker-compose down 2>/dev/null

# Construire les images
echo -e "${YELLOW}🔨 Construction des images Docker...${NC}"
if ! docker-compose build; then
    echo -e "${RED}❌ Erreur lors de la construction des images${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Images construites avec succès${NC}"

# Démarrer les services
echo -e "${YELLOW}🚀 Démarrage des services...${NC}"
if ! docker-compose up -d; then
    echo -e "${RED}❌ Erreur lors du démarrage des services${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Services démarrés${NC}"

# Attendre que les services démarrent
echo -e "${YELLOW}⏳ Attente du démarrage complet...${NC}"
sleep 15

# Tester les services
echo -e "${YELLOW}🧪 Test des services...${NC}"

# Test Redis
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis fonctionne${NC}"
else
    echo -e "${RED}❌ Redis ne répond pas${NC}"
fi

# Test Backend
if test_url "http://localhost:3001/health" "Backend"; then
    echo -e "${GREEN}✅ Backend accessible${NC}"
else
    echo -e "${RED}❌ Backend non accessible${NC}"
    echo -e "${YELLOW}📋 Logs backend:${NC}"
    docker-compose logs backend | tail -10
fi

# Test Frontend
if test_url "http://localhost:3000" "Frontend"; then
    echo -e "${GREEN}✅ Frontend accessible${NC}"
else
    echo -e "${RED}❌ Frontend non accessible${NC}"
    echo -e "${YELLOW}📋 Logs frontend:${NC}"
    docker-compose logs frontend | tail -10
fi

# Afficher le statut des conteneurs
echo -e "${YELLOW}📊 Statut des conteneurs:${NC}"
docker-compose ps

# Afficher les informations de connexion
echo ""
echo -e "${GREEN}🎉 Test terminé !${NC}"
echo "=================================================="
echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "${BLUE}📊 Redis: localhost:6379${NC}"
echo ""
echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  - Voir les logs: docker-compose logs -f"
echo "  - Arrêter: docker-compose down"
echo "  - Redémarrer: docker-compose restart"
echo "  - Statut: docker-compose ps"

