#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Art ASCII
echo -e "${CYAN}"
echo " ███████╗██╗██╗     ███████╗███████╗██╗  ██╗ █████╗ ██████╗ ███████╗"
echo " ██╔════╝██║██║     ██╔════╝██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝"
echo " █████╗  ██║██║     █████╗  ███████╗███████║███████║██████╔╝█████╗  "
echo " ██╔══╝  ██║██║     ██╔══╝  ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  "
echo " ██║     ██║███████╗███████╗███████║██║  ██║██║  ██║██║  ██║███████╗"
echo " ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝"
echo -e "${NC}"
echo
echo -e "${PURPLE}                    🐛 MODE DEBUG COMPLET ACTIVÉ 🐛${NC}"
echo -e "${PURPLE}                   Surveillance en temps réel des services${NC}"
echo
echo -e "${YELLOW}========================================================================${NC}"
echo -e "${YELLOW} Ce script va démarrer FileShare avec un monitoring complet:${NC}"
echo -e "${YELLOW} ✅ Logs détaillés de chaque étape${NC}"
echo -e "${YELLOW} ✅ Surveillance en temps réel des services${NC}"
echo -e "${YELLOW} ✅ Dashboard interactif dans le terminal${NC}"
echo -e "${YELLOW} ✅ Détection automatique des erreurs${NC}"
echo -e "${YELLOW} ✅ Vérifications de santé continues${NC}"
echo -e "${YELLOW}========================================================================${NC}"
echo

# Aller à la racine du projet (2 niveaux au-dessus)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/../.."

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Impossible de trouver la racine du projet FileShare${NC}"
    echo -e "${YELLOW}   Script exécuté depuis: $(pwd)${NC}"
    echo -e "${YELLOW}   Racine attendue avec package.json${NC}"
    exit 1
fi

# Vérifier Node.js
echo -e "${BLUE}🔍 Vérification des prérequis...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js requis! Téléchargez sur https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js détecté${NC}"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm requis!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm détecté${NC}"

# Message d'information
echo
echo -e "${CYAN}🚀 Démarrage du système de debug...${NC}"
echo -e "${YELLOW}📋 Un dashboard détaillé va s'afficher avec:${NC}"
echo -e "${YELLOW}   • Statut en temps réel de tous les services${NC}"
echo -e "${YELLOW}   • Logs colorés et horodatés${NC}"
echo -e "${YELLOW}   • Métriques de performance${NC}"
echo -e "${YELLOW}   • URLs d'accès et comptes de test${NC}"
echo
echo -e "${PURPLE}⚡ Gardez cette fenêtre ouverte pour surveiller le système!${NC}"
echo -e "${PURPLE}   Appuyez sur Ctrl+C pour arrêter tous les services proprement${NC}"
echo

# Démarrer le debugger JavaScript
echo -e "${BLUE}🎛️  Lancement du debugger principal...${NC}"
echo

# Gérer les signaux pour cleanup
cleanup() {
    echo
    echo -e "${YELLOW}🛑 Arrêt demandé...${NC}"
    echo -e "${BLUE}🧹 Nettoyage en cours...${NC}"
    
    # Arrêter les processus Node.js
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "node.*backend" 2>/dev/null || true
    pkill -f "node.*frontend" 2>/dev/null || true
    
    # Arrêter Docker
    docker-compose stop 2>/dev/null || true
    
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer le debugger
node scripts/debug/debug-start.js

# En cas d'erreur
if [ $? -ne 0 ]; then
    echo
    echo -e "${RED}❌ Le démarrage a échoué!${NC}"
    echo
    echo -e "${YELLOW}🔧 Solutions possibles:${NC}"
    echo -e "${YELLOW}   1. Vérifiez que Docker Desktop est démarré${NC}"
    echo -e "${YELLOW}   2. Vérifiez que les ports 3000 et 3001 sont libres${NC}"
    echo -e "${YELLOW}   3. Consultez les logs détaillés dans le dossier logs/${NC}"
    echo -e "${YELLOW}   4. Relancez ce script avec sudo si nécessaire${NC}"
    echo
    echo -e "${CYAN}📄 Log de debug sauvé dans: logs/debug.log${NC}"
    echo
    exit 1
fi

echo
echo -e "${GREEN}🎉 Session de debug terminée!${NC}"
