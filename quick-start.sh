#!/bin/bash

# Script de démarrage rapide pour Emynopass

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚡ Démarrage rapide d'Emynopass${NC}"
echo "=================================="

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Docker avec: sudo apt-get install docker.io docker-compose${NC}"
    exit 1
fi

# Créer .env si nécessaire
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Création du fichier .env...${NC}"
    cp env.example .env
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
fi

# Créer les dossiers
mkdir -p data uploads logs

# Démarrer avec Docker
echo -e "${YELLOW}🚀 Démarrage avec Docker...${NC}"
docker-compose up -d --build

# Attendre le démarrage
echo -e "${YELLOW}⏳ Attente du démarrage...${NC}"
sleep 10

# Vérifier les services
echo -e "${YELLOW}🔍 Vérification des services...${NC}"

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend OK${NC}"
else
    echo -e "${RED}❌ Backend KO${NC}"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend OK${NC}"
else
    echo -e "${RED}❌ Frontend KO${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Emynopass est prêt !${NC}"
echo -e "${BLUE}🌐 http://localhost:3000${NC}"

