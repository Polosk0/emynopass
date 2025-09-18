#!/bin/bash

# Script pour corriger les problèmes de base de données SQLite

echo "🔧 Correction des problèmes de base de données SQLite..."

# Créer le dossier data s'il n'existe pas
mkdir -p data

# Copier la base de données existante si elle existe dans backend/data
if [ -f "backend/data/emynopass.db" ]; then
    echo "📋 Copie de la base de données existante..."
    cp backend/data/emynopass.db data/emynopass.db
    echo "✅ Base de données copiée vers data/emynopass.db"
else
    echo "⚠️  Aucune base de données existante trouvée dans backend/data/"
fi

# S'assurer que les permissions sont correctes
chmod 666 data/emynopass.db 2>/dev/null || echo "⚠️  Impossible de modifier les permissions (normal sur Windows)"

echo "✅ Correction terminée !"
echo "📁 Base de données disponible dans: $(pwd)/data/emynopass.db"

