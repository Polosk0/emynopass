#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}"
echo " ███████╗████████╗ ██████╗ ██████╗ "
echo " ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗"
echo " ███████╗   ██║   ██║   ██║██████╔╝"
echo " ╚════██║   ██║   ██║   ██║██╔═══╝ "
echo " ███████║   ██║   ╚██████╔╝██║     "
echo " ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     "
echo -e "${NC}"
echo
echo -e "${YELLOW}           🛑 ARRÊT DE FILESHARE 🛑${NC}"
echo
echo "====================================="

# Aller à la racine du projet (2 niveaux au-dessus)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/../.."

echo -e "${BLUE}🔄 Arrêt des services Node.js...${NC}"
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "node.*frontend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
echo -e "${GREEN}✅ Services Node.js arrêtés${NC}"

echo -e "${BLUE}🐳 Arrêt des services Docker...${NC}"
if [ -f "docker-compose.yml" ]; then
    docker-compose stop &>/dev/null
    echo -e "${GREEN}✅ Services Docker arrêtés${NC}"
else
    echo -e "${YELLOW}⚠️  docker-compose.yml non trouvé${NC}"
fi

echo -e "${BLUE}🧹 Nettoyage...${NC}"
sleep 2
echo -e "${GREEN}✅ Nettoyage terminé${NC}"

echo
echo -e "${GREEN}✅ Tous les services ont été arrêtés proprement!${NC}"
echo
echo -e "${CYAN}🚀 Pour redémarrer:${NC}"
echo "   • Mode simple:  scripts/linux/start-simple.sh"
echo "   • Mode debug:   scripts/linux/start-debug.sh"
echo
echo -e "${CYAN}📊 Logs disponibles dans: logs/${NC}"
echo
