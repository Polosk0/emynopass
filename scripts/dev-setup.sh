#!/bin/bash

# Script de configuration pour le développement
echo "🚀 Configuration de l'environnement de développement..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp env.example .env
    echo "✅ Fichier .env créé. Veuillez le configurer avec vos paramètres."
fi

# Créer les dossiers nécessaires
echo "📁 Création des dossiers nécessaires..."
mkdir -p uploads logs

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm run install:all

# Démarrer les services Docker
echo "🐳 Démarrage des services Docker..."
docker-compose up -d database redis

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
sleep 10

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
cd backend
npx prisma generate

# Exécuter les migrations
echo "🗄️ Exécution des migrations..."
npx prisma migrate dev --name init

# Seeder la base de données
echo "🌱 Seeding de la base de données..."
npx prisma db seed

cd ..

echo "✅ Configuration terminée!"
echo ""
echo "🎯 Commandes utiles:"
echo "   npm run dev          - Démarrer en mode développement"
echo "   npm run build        - Build de production"
echo "   docker-compose up -d - Démarrer tous les services"
echo "   docker-compose logs  - Voir les logs"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Prisma Studio: npx prisma studio (dans le dossier backend)"
