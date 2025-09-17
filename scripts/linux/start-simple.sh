#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo " ███████╗██╗██╗     ███████╗███████╗██╗  ██╗ █████╗ ██████╗ ███████╗"
echo " ██╔════╝██║██║     ██╔════╝██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝"
echo " █████╗  ██║██║     █████╗  ███████╗███████║███████║██████╔╝█████╗  "
echo " ██╔══╝  ██║██║     ██╔══╝  ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  "
echo " ██║     ██║███████╗███████╗███████║██║  ██║██║  ██║██║  ██║███████╗"
echo " ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝"
echo -e "${NC}"
echo
echo -e "${GREEN}                    🚀 DÉMARRAGE RAPIDE 🚀${NC}"
echo
echo "========================================================================"

# Aller à la racine du projet (2 niveaux au-dessus)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/../.."

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Impossible de trouver la racine du projet FileShare${NC}"
    echo -e "${YELLOW}   Script exécuté depuis: $(pwd)${NC}"
    exit 1
fi

# Vérifications rapides
echo -e "${BLUE}🔍 Vérifications...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js requis!${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker requis!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prérequis OK!${NC}"
echo

# Configuration automatique
if [ ! -f .env ]; then
    echo -e "${YELLOW}🔧 Configuration initiale...${NC}"
    npm install &>/dev/null
    node scripts/setup-env.js
fi

# Installation des dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installation dépendances racine...${NC}"
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installation dépendances backend...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installation dépendances frontend...${NC}"
    cd frontend && npm install && cd ..
fi

# Démarrer Docker
echo -e "${BLUE}🐳 Docker...${NC}"
docker-compose up -d database redis &>/dev/null
sleep 15

# Base de données
echo -e "${BLUE}🗄️ Base de données...${NC}"
cd backend
npx prisma generate &>/dev/null
npx prisma migrate dev --name init &>/dev/null
npx prisma db seed &>/dev/null
cd ..

# Services
echo -e "${BLUE}🚀 Services...${NC}"
cd backend && npm run dev &
sleep 5
cd frontend && npm run dev &
cd ..

# Attendre et vérifier
echo -e "${YELLOW}⏳ Démarrage en cours...${NC}"
sleep 20

# Vérification rapide
echo -e "${BLUE}🏥 Vérification...${NC}"
node scripts/health-check.js 5

# Ouvrir navigateur (si disponible)
if command -v xdg-open &> /dev/null; then
    sleep 3
    xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
    sleep 3
    open http://localhost:3000 &
fi

echo
echo -e "${GREEN}🎉 FileShare est prêt!${NC}"
echo
echo -e "${CYAN}🌐 URLs:${NC}"
echo "   • App: http://localhost:3000"
echo "   • API: http://localhost:3001"
echo
echo -e "${CYAN}👤 Comptes test:${NC}"
echo "   • admin@fileshare.local / admin123"
echo "   • test@fileshare.local  / test123"
echo
echo -e "${YELLOW}🛑 Pour arrêter: scripts/linux/stop.sh${NC}"
echo
echo -e "${GREEN}Appuyez sur Ctrl+C pour arrêter les services${NC}"

# Garder le script en vie
wait
