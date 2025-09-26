#!/bin/bash

echo "🔧 CORRECTION INCOHÉRENCE SCHÉMA - EMYNOPASS"
echo "============================================"
echo ""

# Fonction pour vérifier la structure actuelle
check_current_schema() {
    echo "📋 1. VÉRIFICATION SCHÉMA ACTUEL"
    echo "--------------------------------"
    
    echo "🔍 Tables existantes:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\dt" 2>/dev/null
    
    echo ""
    echo "🔍 Structure de la table users:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d users" 2>/dev/null
    
    echo ""
    echo "🔍 Structure de la table files:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d files" 2>/dev/null
    
    echo ""
    echo "🔍 Structure de la table shares:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d shares" 2>/dev/null
    
    echo ""
    echo "🔍 Structure de la table sessions:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d sessions" 2>/dev/null
    
    echo ""
}

# Fonction pour sauvegarder les données
backup_data() {
    echo "📋 2. SAUVEGARDE DES DONNÉES"
    echo "----------------------------"
    
    echo "💾 Sauvegarde des utilisateurs..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE IF NOT EXISTS users_backup AS 
        SELECT * FROM users;" 2>/dev/null
    
    echo "💾 Sauvegarde des fichiers..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE IF NOT EXISTS files_backup AS 
        SELECT * FROM files;" 2>/dev/null
    
    echo "💾 Sauvegarde des partages..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE IF NOT EXISTS shares_backup AS 
        SELECT * FROM shares;" 2>/dev/null
    
    echo "✅ Sauvegarde terminée"
    echo ""
}

# Fonction pour recréer le schéma avec les bons noms
recreate_schema_correct() {
    echo "📋 3. RECRÉATION DU SCHÉMA CORRECT"
    echo "---------------------------------"
    
    echo "🗑️ Suppression des tables existantes..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS shares CASCADE;
        DROP TABLE IF EXISTS files CASCADE;
        DROP TABLE IF EXISTS users CASCADE;" 2>/dev/null
    
    echo "🔧 Création de la table users..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'USER',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );" 2>/dev/null
    
    echo "🔧 Création de la table files..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            originalName VARCHAR(255) NOT NULL,
            size BIGINT NOT NULL,
            mimeType VARCHAR(100),
            path VARCHAR(500) NOT NULL,
            uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );" 2>/dev/null
    
    echo "🔧 Création de la table shares..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE shares (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fileId UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
            userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) UNIQUE NOT NULL,
            expiresAt TIMESTAMP WITH TIME ZONE,
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );" 2>/dev/null
    
    echo "🔧 Création de la table sessions..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expiresAt TIMESTAMP WITH TIME ZONE NOT NULL
        );" 2>/dev/null
    
    echo "🔧 Création des index..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_files_userId ON files(userId);
        CREATE INDEX idx_files_uploadedAt ON files(uploadedAt);
        CREATE INDEX idx_shares_fileId ON shares(fileId);
        CREATE INDEX idx_shares_userId ON shares(userId);
        CREATE INDEX idx_shares_token ON shares(token);
        CREATE INDEX idx_sessions_userId ON sessions(userId);
        CREATE INDEX idx_sessions_token ON sessions(token);
        CREATE INDEX idx_sessions_expiresAt ON sessions(expiresAt);" 2>/dev/null
    
    echo "✅ Schéma recréé avec les bons noms"
    echo ""
}

# Fonction pour restaurer les données
restore_data() {
    echo "📋 4. RESTAURATION DES DONNÉES"
    echo "------------------------------"
    
    echo "📥 Restauration des utilisateurs..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        INSERT INTO users (id, email, password, name, role, created_at, updated_at)
        SELECT id, email, password, name, role, created_at, updated_at
        FROM users_backup
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null
    
    echo "📥 Restauration des fichiers..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        INSERT INTO files (id, userId, filename, originalName, size, mimeType, path, uploadedAt)
        SELECT id, user_id, filename, original_name, size, mime_type, path, uploaded_at
        FROM files_backup
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null
    
    echo "📥 Restauration des partages..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        INSERT INTO shares (id, fileId, userId, token, expiresAt, createdAt)
        SELECT id, file_id, user_id, token, expires_at, created_at
        FROM shares_backup
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null
    
    echo "✅ Données restaurées"
    echo ""
}

# Fonction pour nettoyer les sauvegardes
cleanup_backups() {
    echo "📋 5. NETTOYAGE DES SAUVEGARDES"
    echo "-------------------------------"
    
    echo "🧹 Suppression des tables de sauvegarde..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        DROP TABLE IF EXISTS users_backup;
        DROP TABLE IF EXISTS files_backup;
        DROP TABLE IF EXISTS shares_backup;" 2>/dev/null
    
    echo "✅ Nettoyage terminé"
    echo ""
}

# Fonction pour redémarrer le backend
restart_backend() {
    echo "📋 6. REDÉMARRAGE DU BACKEND"
    echo "----------------------------"
    
    echo "🛑 Arrêt du backend..."
    docker-compose stop backend
    
    echo "⏳ Attente de 5 secondes..."
    sleep 5
    
    echo "🚀 Redémarrage du backend..."
    docker-compose up -d backend
    
    echo "⏳ Attente du démarrage (30 secondes)..."
    sleep 30
    
    echo "✅ Backend redémarré"
    echo ""
}

# Fonction pour tester le système
test_system() {
    echo "📋 7. TEST DU SYSTÈME"
    echo "---------------------"
    
    # Test de connectivité
    echo "🔍 Test de connectivité..."
    local health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3001/health)
    local health_status=$(echo "$health_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$health_status" = "200" ]; then
        echo "✅ Backend accessible"
    else
        echo "❌ Backend inaccessible (Status: $health_status)"
        return 1
    fi
    
    # Test d'authentification
    echo "🔍 Test d'authentification..."
    local auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local auth_status=$(echo "$auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local auth_body=$(echo "$auth_response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$auth_status" = "200" ]; then
        echo "✅ Authentification OK"
        local token=$(echo "$auth_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            echo "✅ Token obtenu: ${token:0:20}..."
        fi
    else
        echo "❌ Authentification échouée (Status: $auth_status)"
        echo "   - Réponse: $auth_body"
    fi
    
    echo ""
}

# Fonction principale
main() {
    check_current_schema
    
    echo "⚠️ ATTENTION: Correction de l'incohérence du schéma"
    echo "Le backend utilise 'userId' mais la base avait 'userid'."
    echo "Cette opération va recréer le schéma avec les bons noms."
    echo "Voulez-vous continuer ? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        backup_data
        recreate_schema_correct
        restore_data
        cleanup_backups
        restart_backend
        test_system
    else
        echo "❌ Opération annulée"
        echo "💡 Vous pouvez exécuter le script à nouveau pour corriger le schéma"
    fi
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
}

# Exécuter le script principal
main
