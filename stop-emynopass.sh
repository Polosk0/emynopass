#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Arrêt d'Emynopass...${NC}"

# Vérifier si Docker est disponible
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Erreur: Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Arrêter les conteneurs Docker
echo -e "${YELLOW}🛑 Arrêt des conteneurs Docker...${NC}"
docker-compose down

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Conteneurs arrêtés${NC}"
else
    echo -e "${YELLOW}⚠️  Aucun conteneur en cours d'exécution${NC}"
fi

# Optionnel: Supprimer les images (décommentez si nécessaire)
# echo -e "${YELLOW}🗑️  Suppression des images...${NC}"
# docker-compose down --rmi all

# Optionnel: Supprimer les volumes (décommentez si nécessaire)
# echo -e "${YELLOW}🗑️  Suppression des volumes...${NC}"
# docker-compose down -v

echo -e "${GREEN}✅ Emynopass arrêté${NC}"
echo -e "${BLUE}💡 Pour redémarrer: ./start-emynopass.sh${NC}"