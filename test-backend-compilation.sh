#!/bin/bash

echo "🔧 Test de compilation du backend..."

# Aller dans le dossier backend
cd backend

# Nettoyer les anciens builds
echo "🧹 Nettoyage des anciens builds..."
rm -rf dist/

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm ci

# Compiler le TypeScript
echo "🔨 Compilation TypeScript..."
npm run build

# Vérifier que la compilation a réussi
if [ -f "dist/index.js" ]; then
    echo "✅ Compilation réussie - dist/index.js trouvé"
    
    # Vérifier la syntaxe du fichier compilé
    echo "🔍 Vérification de la syntaxe..."
    node -c dist/index.js
    if [ $? -eq 0 ]; then
        echo "✅ Syntaxe JavaScript valide"
    else
        echo "❌ Erreur de syntaxe JavaScript"
        exit 1
    fi
    
    # Afficher la taille du fichier
    echo "📊 Taille du fichier compilé:"
    ls -lh dist/index.js
    
else
    echo "❌ Compilation échouée - dist/index.js manquant"
    exit 1
fi

echo "✅ Test de compilation terminé avec succès"
