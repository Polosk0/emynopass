#!/bin/bash

echo "📦 INSTALLATION DES DÉPENDANCES NODE.JS"
echo "======================================="
echo ""

# 1. Vérifier si Node.js est installé
echo "🔍 Vérification de Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js version: $(node --version)"
else
    echo "❌ Node.js non installé"
    echo "📥 Installation de Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Vérifier si npm est installé
echo "🔍 Vérification de npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm version: $(npm --version)"
else
    echo "❌ npm non installé"
    sudo apt-get install -y npm
fi

# 3. Installer les dépendances
echo "📦 Installation des dépendances..."
npm install node-fetch form-data

# 4. Vérifier l'installation
echo "🔍 Vérification de l'installation..."
if [ -d "node_modules" ]; then
    echo "✅ Dépendances installées"
    ls -la node_modules/ | head -10
else
    echo "❌ Échec de l'installation"
    exit 1
fi

echo ""
echo "🎯 INSTALLATION TERMINÉE"
echo "========================"
