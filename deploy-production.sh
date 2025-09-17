#!/bin/bash

# Script de déploiement en production pour Emynopass

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement en production d'Emynopass${NC}"
echo "=============================================="

# Vérifier que nous sommes en production
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  NODE_ENV n'est pas défini sur 'production'${NC}"
    echo -e "${YELLOW}💡 Définissez NODE_ENV=production avant de continuer${NC}"
    read -p "Continuer quand même ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Vérifier les prérequis
echo -e "${YELLOW}🔧 Vérification des prérequis...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Fichier .env manquant${NC}"
    echo -e "${YELLOW}💡 Copiez env.example vers .env et configurez-le${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prérequis vérifiés${NC}"

# Créer les dossiers nécessaires
echo -e "${YELLOW}📁 Création des dossiers...${NC}"
mkdir -p data uploads logs backup
chmod 755 data uploads logs backup

# Sauvegarde de la base de données existante
if [ -f "data/emynopass.db" ]; then
    echo -e "${YELLOW}💾 Sauvegarde de la base de données...${NC}"
    cp data/emynopass.db backup/emynopass-$(date +%Y%m%d-%H%M%S).db
    echo -e "${GREEN}✅ Sauvegarde créée${NC}"
fi

# Arrêter les services existants
echo -e "${YELLOW}🛑 Arrêt des services existants...${NC}"
docker-compose down 2>/dev/null

# Nettoyer les images anciennes
echo -e "${YELLOW}🧹 Nettoyage des images anciennes...${NC}"
docker system prune -f

# Construire les nouvelles images
echo -e "${YELLOW}🔨 Construction des images de production...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction des images${NC}"
    exit 1
fi

# Démarrer les services en production
echo -e "${YELLOW}🚀 Démarrage des services de production...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage des services${NC}"
    exit 1
fi

# Attendre que les services démarrent
echo -e "${YELLOW}⏳ Attente du démarrage complet...${NC}"
sleep 20

# Vérifier que les services fonctionnent
echo -e "${YELLOW}🔍 Vérification des services...${NC}"

# Vérifier le backend
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend opérationnel${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend ne répond pas${NC}"
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
        echo -e "${RED}❌ Frontend ne répond pas${NC}"
        echo -e "${YELLOW}📋 Logs frontend:${NC}"
        docker-compose logs frontend
        exit 1
    fi
    sleep 2
done

# Vérifier nginx
for i in {1..30}; do
    if curl -s http://localhost:80 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Nginx opérationnel${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Nginx ne répond pas (normal si non configuré)${NC}"
        break
    fi
    sleep 2
done

# Afficher le statut final
echo -e "${GREEN}🎉 Déploiement terminé avec succès !${NC}"
echo "=============================================="
echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "${BLUE}🌍 Nginx: http://localhost:80${NC}"
echo ""
echo -e "${YELLOW}📊 Statut des services:${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  - Logs: docker-compose logs -f"
echo "  - Statut: docker-compose ps"
echo "  - Arrêt: docker-compose down"
echo "  - Redémarrage: docker-compose restart"

