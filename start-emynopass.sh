#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Démarrage d'Emynopass avec Docker...${NC}"

# Vérifier si on est dans le bon dossier
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erreur: Vous devez être dans le dossier emynopass${NC}"
    exit 1
fi

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Erreur: Docker n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Docker avec: sudo apt-get install docker.io docker-compose${NC}"
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Erreur: Docker Compose n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Docker Compose avec: sudo apt-get install docker-compose${NC}"
    exit 1
fi

# Vérifier si Docker est en cours d'exécution
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Erreur: Docker n'est pas en cours d'exécution${NC}"
    echo -e "${YELLOW}💡 Démarrez Docker avec: sudo systemctl start docker${NC}"
    exit 1
fi

# Créer les dossiers nécessaires
echo -e "${YELLOW}📁 Création des dossiers...${NC}"
mkdir -p data
mkdir -p uploads
mkdir -p logs
chmod 755 data uploads logs

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env manquant, création depuis env.example...${NC}"
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${GREEN}✅ Fichier .env créé${NC}"
    else
        echo -e "${RED}❌ Erreur: Fichier env.example manquant${NC}"
        exit 1
    fi
fi

# Arrêter les services existants
echo -e "${YELLOW}🛑 Arrêt des services existants...${NC}"
docker-compose down 2>/dev/null
sleep 2

# Construction et démarrage des conteneurs
echo -e "${YELLOW}🔨 Construction des images Docker...${NC}"
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction des images${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Démarrage des services...${NC}"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage des services${NC}"
    exit 1
fi

# Attendre que les services démarrent
echo -e "${YELLOW}⏳ Attente du démarrage complet...${NC}"
sleep 10

# Vérifier que les services fonctionnent
echo -e "${YELLOW}🔍 Vérification des services...${NC}"

# Vérifier le backend
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend opérationnel${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Erreur: Backend ne répond pas après 30 tentatives${NC}"
        echo -e "${YELLOW}📋 Logs backend:${NC}"
        docker-compose logs backend
        exit 1
    fi
    sleep 2
done

# Vérifier le frontend
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend opérationnel${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Erreur: Frontend ne répond pas après 30 tentatives${NC}"
        echo -e "${YELLOW}📋 Logs frontend:${NC}"
        docker-compose logs frontend
        exit 1
    fi
    sleep 2
done

echo -e "${GREEN}✅ Emynopass démarré avec succès !${NC}"
echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "${BLUE}📊 Logs: docker-compose logs -f [service]${NC}"
echo -e "${BLUE}🛑 Arrêt: ./stop-emynopass.sh${NC}"
echo -e "${BLUE}📋 Status: docker-compose ps${NC}"