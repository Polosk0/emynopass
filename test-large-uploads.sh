#!/bin/bash

echo "🧪 TEST D'UPLOAD DE GROS FICHIERS - EMYNOPASS"
echo "============================================="
echo ""

# Fonction pour créer un fichier de test
create_test_file() {
    local size_mb=$1
    local filename="/tmp/test-${size_mb}mb.bin"
    
    echo "📁 Création d'un fichier de test de ${size_mb}MB..."
    dd if=/dev/zero of="$filename" bs=1M count=$size_mb 2>/dev/null
    
    if [ -f "$filename" ]; then
        local actual_size=$(du -h "$filename" | cut -f1)
        echo "✅ Fichier créé: $filename (${actual_size})"
        echo "$filename"
    else
        echo "❌ Erreur lors de la création du fichier"
        echo ""
    fi
}

# Fonction pour tester l'upload
test_upload() {
    local file_path=$1
    local size_mb=$2
    
    if [ ! -f "$file_path" ]; then
        echo "❌ Fichier non trouvé: $file_path"
        return 1
    fi
    
    echo "🚀 Test d'upload de ${size_mb}MB..."
    echo "📊 Fichier: $(basename "$file_path")"
    
    local start_time=$(date +%s)
    
    # Test d'upload
    local upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}|SIZE:%{size_upload}" \
        -X POST https://emynona.cloud/api/upload/files \
        -H "Authorization: Bearer $TOKEN" \
        -F "files=@$file_path")
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Extraire les informations de la réponse
    local http_status=$(echo "$upload_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local time_total=$(echo "$upload_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local size_upload=$(echo "$upload_response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$upload_response" | sed 's/HTTPSTATUS:[0-9]*|TIME:[0-9.]*|SIZE:[0-9]*$//')
    
    # Calculer la vitesse
    local speed_mbps=0
    if [ "$time_total" != "0" ] && [ "$time_total" != "" ]; then
        speed_mbps=$(echo "scale=2; $size_mb / $time_total" | bc -l 2>/dev/null || echo "0")
    fi
    
    echo "📈 Résultats:"
    echo "   - Status HTTP: $http_status"
    echo "   - Temps total: ${time_total}s"
    echo "   - Taille uploadée: ${size_upload} bytes"
    echo "   - Vitesse: ${speed_mbps} MB/s"
    echo "   - Durée script: ${duration}s"
    
    if [ "$http_status" = "200" ]; then
        echo "✅ Upload réussi !"
        return 0
    else
        echo "❌ Upload échoué"
        echo "📄 Réponse: $response_body"
        return 1
    fi
}

# Fonction pour nettoyer les fichiers de test
cleanup_test_files() {
    echo "🧹 Nettoyage des fichiers de test..."
    rm -f /tmp/test-*.bin
    echo "✅ Nettoyage terminé"
}

# Fonction pour obtenir un token
get_token() {
    echo "🔐 Connexion pour obtenir un token..."
    
    local token_response=$(curl -s -X POST https://emynona.cloud/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"polosko@emynopass.dev","password":"Emynopass2024!"}')
    
    local token=$(echo "$token_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$token" ]; then
        echo "✅ Token obtenu: ${token:0:20}..."
        echo "$token"
    else
        echo "❌ Impossible d'obtenir un token"
        echo "📄 Réponse: $token_response"
        echo ""
        return 1
    fi
}

# Fonction pour vérifier la connectivité
check_connectivity() {
    echo "🔍 Vérification de la connectivité..."
    
    local health_response=$(curl -s https://emynona.cloud/health)
    if echo "$health_response" | grep -q "OK"; then
        echo "✅ Serveur accessible"
        return 0
    else
        echo "❌ Serveur inaccessible"
        echo "📄 Réponse: $health_response"
        return 1
    fi
}

# Fonction pour afficher les statistiques système
show_system_stats() {
    echo "📊 Statistiques système:"
    echo "   - Espace disque: $(df -h / | tail -1 | awk '{print $4}')"
    echo "   - Mémoire: $(free -h | grep Mem | awk '{print $7}')"
    echo "   - CPU: $(nproc) cores"
    echo "   - Limite fichiers: $(ulimit -n)"
    echo ""
}

# Fonction principale
main() {
    # Vérifier la connectivité
    if ! check_connectivity; then
        echo "❌ Impossible de continuer - serveur inaccessible"
        exit 1
    fi
    
    # Obtenir un token
    TOKEN=$(get_token)
    if [ -z "$TOKEN" ]; then
        echo "❌ Impossible de continuer - token non obtenu"
        exit 1
    fi
    
    # Afficher les statistiques système
    show_system_stats
    
    # Tailles de fichiers à tester
    local sizes=(100 500 1000 2000 5000 10000 15000)
    local results=()
    
    echo "🎯 DÉBUT DES TESTS D'UPLOAD"
    echo "=========================="
    echo ""
    
    for size in "${sizes[@]}"; do
        echo "📋 Test ${size}MB"
        echo "----------------"
        
        # Créer le fichier de test
        local test_file=$(create_test_file $size)
        
        if [ -n "$test_file" ]; then
            # Tester l'upload
            if test_upload "$test_file" $size; then
                results+=("✅ ${size}MB: RÉUSSI")
            else
                results+=("❌ ${size}MB: ÉCHOUÉ")
                echo "⚠️ Arrêt des tests - échec à ${size}MB"
                break
            fi
            
            # Nettoyer le fichier
            rm -f "$test_file"
        else
            results+=("❌ ${size}MB: ERREUR CRÉATION")
            echo "⚠️ Arrêt des tests - erreur de création à ${size}MB"
            break
        fi
        
        echo ""
        sleep 2  # Pause entre les tests
    done
    
    # Afficher le résumé
    echo "📋 RÉSUMÉ DES TESTS"
    echo "=================="
    for result in "${results[@]}"; do
        echo "$result"
    done
    
    # Nettoyer les fichiers restants
    cleanup_test_files
    
    echo ""
    echo "🎯 TESTS TERMINÉS"
    echo "================"
}

# Gestion des signaux pour nettoyer en cas d'interruption
trap cleanup_test_files EXIT INT TERM

# Exécuter le script principal
main
