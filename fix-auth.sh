#!/bin/bash

echo "🔧 RÉPARATION AUTHENTIFICATION - EMYNOPASS"
echo "=========================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour réinitialiser les comptes
reset_accounts() {
    echo "1. RÉINITIALISATION DES COMPTES"
    echo "==============================="
    
    print_info "Suppression de tous les utilisateurs existants..."
    docker-compose exec backend node -e "
    const { database } = require('./dist/database');
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    async function resetAccounts() {
      try {
        console.log('🗑️  Suppression des utilisateurs existants...');
        await database.db.query('DELETE FROM users');
        
        console.log('👑 Création du compte admin...');
        const adminPassword = await bcrypt.hash('Emynopass2024!', 10);
        const adminId = uuidv4();
        await database.db.query(\`
          INSERT INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
          VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9)
        \`, [
          adminId,
          'polosko@emynopass.dev',
          adminPassword,
          'Polosko',
          'ADMIN',
          true,
          false,
          new Date().toISOString(),
          new Date().toISOString()
        ]);
        
        console.log('👤 Création du compte démo...');
        const demoPassword = await bcrypt.hash('demo2024', 10);
        const demoId = uuidv4();
        await database.db.query(\`
          INSERT INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
          VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9)
        \`, [
          demoId,
          'demo@emynopass.dev',
          demoPassword,
          'Utilisateur Démo',
          'USER',
          true,
          true,
          new Date().toISOString(),
          new Date().toISOString()
        ]);
        
        console.log('✅ Comptes réinitialisés avec succès');
        console.log('👑 Admin: polosko@emynopass.dev / Emynopass2024!');
        console.log('👤 Démo: demo@emynopass.dev / demo2024');
      } catch (error) {
        console.error('❌ Erreur:', error.message);
      }
    }

    resetAccounts();
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_result 0 "Comptes réinitialisés avec succès"
    else
        print_result 1 "Erreur lors de la réinitialisation des comptes"
    fi
    echo ""
}

# Fonction pour redémarrer les services
restart_services() {
    echo "2. REDÉMARRAGE DES SERVICES"
    echo "==========================="
    
    print_info "Arrêt des services..."
    docker-compose down
    
    print_info "Démarrage des services..."
    docker-compose up -d --build
    
    print_info "Attente du démarrage complet..."
    sleep 15
    
    if docker-compose ps | grep -q "Up"; then
        print_result 0 "Services redémarrés avec succès"
    else
        print_result 1 "Erreur lors du redémarrage des services"
    fi
    echo ""
}

# Fonction pour tester les connexions
test_connections() {
    echo "3. TEST DES CONNEXIONS"
    echo "======================"
    
    print_info "Test de connexion admin..."
    ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "polosko@emynopass.dev", "password": "Emynopass2024!"}')
    
    if echo "$ADMIN_RESPONSE" | grep -q "token"; then
        print_result 0 "Connexion admin réussie"
    else
        print_result 1 "Connexion admin échouée"
        echo "Réponse: $ADMIN_RESPONSE"
    fi
    
    print_info "Test de connexion démo..."
    DEMO_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "demo@emynopass.dev", "password": "demo2024"}')
    
    if echo "$DEMO_RESPONSE" | grep -q "token"; then
        print_result 0 "Connexion démo réussie"
    else
        print_result 1 "Connexion démo échouée"
        echo "Réponse: $DEMO_RESPONSE"
    fi
    echo ""
}

# Fonction pour vérifier la configuration
check_config() {
    echo "4. VÉRIFICATION DE LA CONFIGURATION"
    echo "==================================="
    
    print_info "Variables d'environnement:"
    docker-compose exec backend printenv | grep -E "(NODE_ENV|PORT|JWT_SECRET|FRONTEND_URL)" || print_warning "Variables d'environnement non trouvées"
    
    print_info "Test de l'API de santé:"
    if curl -s -f http://localhost:3001/health > /dev/null; then
        print_result 0 "API de santé accessible"
    else
        print_result 1 "API de santé inaccessible"
    fi
    
    print_info "Test de l'API publique:"
    if curl -s -f http://localhost:3001/api/public/stats > /dev/null; then
        print_result 0 "API publique accessible"
    else
        print_result 1 "API publique inaccessible"
    fi
    echo ""
}

# Fonction pour nettoyer les données
cleanup_data() {
    echo "5. NETTOYAGE DES DONNÉES"
    echo "========================"
    
    print_info "Nettoyage des sessions expirées..."
    docker-compose exec backend node -e "
    const { database } = require('./dist/database');
    database.deleteExpiredSessions().then(count => {
      console.log('✅ Sessions expirées supprimées:', count);
    }).catch(err => {
      console.log('❌ Erreur:', err.message);
    });
    " 2>/dev/null
    
    print_info "Nettoyage des fichiers expirés..."
    docker-compose exec backend node -e "
    const { database } = require('./dist/database');
    database.deleteExpiredFiles().then(count => {
      console.log('✅ Fichiers expirés supprimés:', count);
    }).catch(err => {
      console.log('❌ Erreur:', err.message);
    });
    " 2>/dev/null
    
    print_info "Nettoyage des partages orphelins..."
    docker-compose exec backend node -e "
    const { database } = require('./dist/database');
    database.deleteOrphanedShares().then(count => {
      console.log('✅ Partages orphelins supprimés:', count);
    }).catch(err => {
      console.log('❌ Erreur:', err.message);
    });
    " 2>/dev/null
    
    print_info "Nettoyage des comptes démo expirés..."
    docker-compose exec backend node -e "
    const { database } = require('./dist/database');
    database.deleteExpiredDemoUsers().then(count => {
      console.log('✅ Comptes démo expirés supprimés:', count);
    }).catch(err => {
      console.log('❌ Erreur:', err.message);
    });
    " 2>/dev/null
    echo ""
}

# Menu principal
echo "Que voulez-vous faire ?"
echo "1. Réinitialiser les comptes uniquement"
echo "2. Redémarrer les services uniquement"
echo "3. Réparation complète (recommandé)"
echo "4. Nettoyage des données uniquement"
echo "5. Vérification de la configuration uniquement"
echo ""
read -p "Votre choix (1-5): " choice

case $choice in
    1)
        reset_accounts
        test_connections
        ;;
    2)
        restart_services
        test_connections
        ;;
    3)
        reset_accounts
        restart_services
        test_connections
        check_config
        ;;
    4)
        cleanup_data
        ;;
    5)
        check_config
        test_connections
        ;;
    *)
        echo "Choix invalide. Exécution de la réparation complète..."
        reset_accounts
        restart_services
        test_connections
        check_config
        ;;
esac

echo ""
echo "🔧 Réparation terminée - $(date)"
echo ""
echo "Comptes de test:"
echo "👑 Admin: polosko@emynopass.dev / Emynopass2024!"
echo "👤 Démo: demo@emynopass.dev / demo2024"
echo ""
echo "URLs de test:"
echo "🌐 Site: https://emynona.cloud"
echo "🔐 Admin: https://emynona.cloud/admin"
echo "📊 API: https://emynona.cloud/api/health"
