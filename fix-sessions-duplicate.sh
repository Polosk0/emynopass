#!/bin/bash

echo "🔧 CORRECTION ERREUR SESSIONS DUPLIQUÉES - EMYNOPASS"
echo "===================================================="
echo ""

# Fonction pour vérifier les sessions existantes
check_sessions() {
    echo "📋 1. VÉRIFICATION DES SESSIONS"
    echo "-------------------------------"
    
    echo "🔍 Nombre de sessions existantes:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT COUNT(*) as total_sessions FROM sessions;"
    
    echo ""
    echo "🔍 Sessions récentes (dernières 10):"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT id, user_id, token, created_at, expires_at FROM sessions ORDER BY created_at DESC LIMIT 10;"
    
    echo ""
    echo "🔍 Sessions expirées:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT COUNT(*) as expired_sessions FROM sessions WHERE expires_at < NOW();"
    
    echo ""
}

# Fonction pour nettoyer les sessions
cleanup_sessions() {
    echo "📋 2. NETTOYAGE DES SESSIONS"
    echo "----------------------------"
    
    echo "🧹 Suppression des sessions expirées..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "DELETE FROM sessions WHERE expires_at < NOW();"
    
    echo "🧹 Suppression des sessions anciennes (plus de 7 jours)..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '7 days';"
    
    echo "🧹 Suppression des sessions dupliquées (garder la plus récente)..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        DELETE FROM sessions 
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id) id 
            FROM sessions 
            ORDER BY user_id, created_at DESC
        );"
    
    echo "✅ Nettoyage des sessions terminé"
    echo ""
}

# Fonction pour vérifier les contraintes
check_constraints() {
    echo "📋 3. VÉRIFICATION DES CONTRAINTES"
    echo "----------------------------------"
    
    echo "🔍 Contraintes sur la table sessions:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "\d sessions"
    
    echo ""
    echo "🔍 Index sur la table sessions:"
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sessions';"
    
    echo ""
}

# Fonction pour recréer la table sessions
recreate_sessions_table() {
    echo "📋 4. RECRÉATION DE LA TABLE SESSIONS"
    echo "------------------------------------"
    
    echo "🛑 Sauvegarde des sessions valides..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE IF NOT EXISTS sessions_backup AS 
        SELECT * FROM sessions 
        WHERE expires_at > NOW() 
        AND created_at > NOW() - INTERVAL '1 day';"
    
    echo "🗑️ Suppression de la table sessions..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "DROP TABLE IF EXISTS sessions CASCADE;"
    
    echo "🔧 Recréation de la table sessions..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE TABLE sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );"
    
    echo "🔧 Création des index..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        CREATE INDEX idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX idx_sessions_token ON sessions(token);
        CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);"
    
    echo "📥 Restauration des sessions valides..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "
        INSERT INTO sessions (id, user_id, token, created_at, expires_at)
        SELECT id, user_id, token, created_at, expires_at
        FROM sessions_backup
        ON CONFLICT (token) DO NOTHING;"
    
    echo "🧹 Suppression de la table de sauvegarde..."
    docker exec emynopass-postgres psql -U emynopass -d emynopass -c "DROP TABLE IF EXISTS sessions_backup;"
    
    echo "✅ Table sessions recréée"
    echo ""
}

# Fonction pour redémarrer les services
restart_services() {
    echo "📋 5. REDÉMARRAGE DES SERVICES"
    echo "------------------------------"
    
    echo "🛑 Arrêt des services..."
    docker-compose down
    
    echo "⏳ Attente de 10 secondes..."
    sleep 10
    
    echo "🚀 Redémarrage des services..."
    docker-compose up -d
    
    echo "⏳ Attente du démarrage (30 secondes)..."
    sleep 30
    
    echo "🔍 Vérification du statut..."
    docker-compose ps
    
    echo "✅ Services redémarrés"
    echo ""
}

# Fonction pour tester l'authentification
test_auth() {
    echo "📋 6. TEST D'AUTHENTIFICATION"
    echo "-----------------------------"
    
    # Test direct du backend
    echo "🔍 Test auth direct backend..."
    local auth_backend=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local auth_backend_status=$(echo "$auth_backend" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local auth_backend_body=$(echo "$auth_backend" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "   - Status: $auth_backend_status"
    if [ "$auth_backend_status" = "200" ]; then
        echo "✅ Auth backend OK"
        local token=$(echo "$auth_backend_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            echo "✅ Token obtenu: ${token:0:20}..."
        else
            echo "❌ Token non trouvé dans la réponse"
        fi
    else
        echo "❌ Auth backend échoué"
        echo "   - Réponse: $auth_backend_body"
    fi
    
    # Test via Cloudflare
    echo "🔍 Test auth via Cloudflare..."
    local auth_cloudflare=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local auth_cloudflare_status=$(echo "$auth_cloudflare" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local auth_cloudflare_body=$(echo "$auth_cloudflare" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    echo "   - Status: $auth_cloudflare_status"
    if [ "$auth_cloudflare_status" = "200" ]; then
        echo "✅ Auth Cloudflare OK"
        local token=$(echo "$auth_cloudflare_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            echo "✅ Token obtenu: ${token:0:20}..."
        else
            echo "❌ Token non trouvé dans la réponse"
        fi
    else
        echo "❌ Auth Cloudflare échoué"
        echo "   - Réponse: $auth_cloudflare_body"
    fi
    
    echo ""
}

# Fonction pour tester l'upload
test_upload() {
    echo "📋 7. TEST D'UPLOAD"
    echo "-------------------"
    
    # Obtenir un token
    echo "🔐 Connexion pour obtenir un token..."
    local token_response=$(curl -s -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        echo "❌ Impossible d'obtenir un token"
        return 1
    fi
    
    echo "✅ Token obtenu: ${token:0:20}..."
    
    # Créer un fichier de test de 1MB
    echo "🔍 Création d'un fichier de test de 1MB..."
    dd if=/dev/zero of=/tmp/test-1mb.bin bs=1M count=1 2>/dev/null
    
    # Test d'upload
    echo "🔍 Test d'upload (1MB)..."
    local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
        -X POST https://emynona.cloud/api/upload/files \
        -H "Authorization: Bearer $token" \
        -F "files=@/tmp/test-1mb.bin")
    
    local upload_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local upload_time=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local upload_body=$(echo "$upload_response" | sed 's/HTTPSTATUS:[0-9]*|TIME:[0-9.]*$//')
    
    echo "   - Status: $upload_status"
    echo "   - Temps: ${upload_time}s"
    
    if [ "$upload_status" = "200" ]; then
        echo "✅ Upload réussi"
    else
        echo "❌ Upload échoué"
        echo "   - Réponse: $upload_body"
    fi
    
    # Nettoyer
    rm -f /tmp/test-1mb.bin
    echo "✅ Fichier de test supprimé"
    
    echo ""
}

# Fonction principale
main() {
    check_sessions
    cleanup_sessions
    check_constraints
    
    # Demander confirmation pour recréer la table
    echo "⚠️ ATTENTION: Recréation de la table sessions"
    echo "Cette opération supprimera toutes les sessions existantes."
    echo "Voulez-vous continuer ? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        recreate_sessions_table
        restart_services
        test_auth
        test_upload
    else
        echo "❌ Opération annulée"
        echo "💡 Vous pouvez exécuter le script à nouveau pour recréer la table"
    fi
    
    echo "🎯 CORRECTION TERMINÉE"
    echo "====================="
}

# Exécuter le script principal
main
