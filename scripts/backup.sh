#!/bin/bash

# Script de sauvegarde
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")

echo "💾 Création d'une sauvegarde..."

# Créer le dossier de sauvegarde
mkdir -p $BACKUP_DIR

# Sauvegarder la base de données
echo "🗄️ Sauvegarde de la base de données..."
docker-compose exec -T database pg_dump -U fileshare_user fileshare > "$BACKUP_DIR/db_backup_$DATE.sql"

# Sauvegarder les fichiers uploadés
echo "📁 Sauvegarde des fichiers..."
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" uploads/

# Sauvegarder la configuration
echo "⚙️ Sauvegarde de la configuration..."
cp .env "$BACKUP_DIR/env_backup_$DATE"

# Nettoyer les anciennes sauvegardes (garder les 7 dernières)
echo "🧹 Nettoyage des anciennes sauvegardes..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +7 -delete

echo "✅ Sauvegarde terminée dans $BACKUP_DIR/"
ls -la $BACKUP_DIR/
