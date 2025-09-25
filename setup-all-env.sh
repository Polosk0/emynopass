#!/bin/bash

echo "🔧 Configuration des fichiers .env pour Backend et Frontend..."

# Générer des clés sécurisées
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

# 1. Créer le .env du backend (racine)
cat > .env << EOL
# Base de données
DATABASE_PATH="/app/data/emynopass.db"

# JWT
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"

# URLs de production
VITE_API_URL="https://emynona.cloud/api"
FRONTEND_URL="https://emynona.cloud"

# Serveur
PORT=3001
NODE_ENV="production"

# Stockage des fichiers
UPLOAD_DIR="/app/uploads"
MAX_FILE_SIZE="100MB"
ALLOWED_EXTENSIONS=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.mp4,.mp3"

# Email (configurez selon vos besoins)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
FROM_EMAIL="noreply@emynona.cloud"
FROM_NAME="Emynopass"

# Chiffrement
ENCRYPTION_KEY="$ENCRYPTION_KEY"

# Liens de partage
DEFAULT_EXPIRY_HOURS=24
MAX_DOWNLOADS=10

# Redis
REDIS_URL="redis://redis:6379"
EOL

# 2. Créer le .env du frontend
cat > frontend/.env << EOL
# Configuration Frontend - Emynopass
# URL de l'API backend
VITE_API_URL=https://emynona.cloud/api
EOL

# 3. Sécuriser les fichiers
chmod 600 .env
chmod 600 frontend/.env

echo "✅ Fichiers .env créés :"
echo "   - .env (backend)"
echo "   - frontend/.env (frontend)"
echo "📝 N'oubliez pas de configurer SMTP_USER et SMTP_PASS si vous utilisez l'email"
echo "🔐 Fichiers sécurisés avec chmod 600"


