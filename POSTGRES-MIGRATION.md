# Migration SQLite vers PostgreSQL

Ce document explique la migration complète du système Emynopass de SQLite vers PostgreSQL.

## 🎯 Objectifs de la migration

- **Performance améliorée** : PostgreSQL offre de meilleures performances pour les applications web
- **Scalabilité** : Meilleure gestion des connexions simultanées
- **Production ready** : PostgreSQL est plus adapté aux environnements de production
- **Fonctionnalités avancées** : Support des transactions, contraintes, index, etc.

## 📋 Prérequis

- Docker et Docker Compose installés
- Node.js installé
- Accès en écriture au répertoire du projet

## 🚀 Migration automatique

### Windows
```bash
migrate-to-postgres.bat
```

### Linux/macOS
```bash
./migrate-to-postgres.sh
```

## 🔧 Migration manuelle

### 1. Arrêter les services
```bash
docker-compose down
```

### 2. Sauvegarder les données SQLite
```bash
cp data/emynopass.db data/emynopass.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 3. Installer les nouvelles dépendances
```bash
cd backend
npm install
cd ..
```

### 4. Démarrer PostgreSQL
```bash
docker-compose up -d postgres
```

### 5. Attendre que PostgreSQL soit prêt
```bash
docker-compose exec postgres pg_isready -U emynopass -d emynopass
```

### 6. Migrer les données
```bash
node scripts/migrate-sqlite-to-postgres.js
```

### 7. Démarrer tous les services
```bash
docker-compose up -d
```

## 🧪 Tests de validation

Après la migration, exécutez les tests :

```bash
node test-postgres-migration.js
```

## 📊 Structure de la base de données

### Tables migrées

#### `users`
- `id` (UUID, PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR)
- `name` (VARCHAR)
- `role` (VARCHAR, CHECK: 'USER' | 'ADMIN')
- `isActive` (BOOLEAN)
- `isDemo` (BOOLEAN)
- `isTemporaryDemo` (BOOLEAN)
- `demoExpiresAt` (TIMESTAMP)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

#### `files`
- `id` (UUID, PRIMARY KEY)
- `filename` (VARCHAR)
- `originalName` (VARCHAR)
- `mimetype` (VARCHAR)
- `size` (BIGINT)
- `path` (VARCHAR)
- `isEncrypted` (BOOLEAN)
- `uploadedAt` (TIMESTAMP)
- `expiresAt` (TIMESTAMP)
- `userId` (UUID, FOREIGN KEY)

#### `shares`
- `id` (UUID, PRIMARY KEY)
- `token` (VARCHAR, UNIQUE)
- `password` (VARCHAR)
- `maxDownloads` (INTEGER)
- `downloads` (INTEGER)
- `expiresAt` (TIMESTAMP)
- `isActive` (BOOLEAN)
- `createdAt` (TIMESTAMP)
- `fileId` (UUID, FOREIGN KEY)
- `userId` (UUID, FOREIGN KEY)
- `title` (VARCHAR)
- `description` (TEXT)

#### `sessions`
- `id` (UUID, PRIMARY KEY)
- `userId` (UUID, FOREIGN KEY)
- `token` (VARCHAR, UNIQUE)
- `expiresAt` (TIMESTAMP)
- `createdAt` (TIMESTAMP)

### Index créés
- `idx_users_email` sur `users(email)`
- `idx_files_userId` sur `files(userId)`
- `idx_shares_token` sur `shares(token)`
- `idx_shares_userId` sur `shares(userId)`
- `idx_sessions_token` sur `sessions(token)`
- `idx_sessions_userId` sur `sessions(userId)`

## 🔐 Configuration de sécurité

### Variables d'environnement

```bash
# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emynopass
DB_USER=emynopass
DB_PASSWORD=emynopass

# Migration SQLite (optionnel)
SQLITE_DB_PATH=./data/emynopass.db
```

### Production

Pour la production, changez les mots de passe par défaut :

```bash
# Dans docker-compose.yml
POSTGRES_PASSWORD=votre-mot-de-passe-securise
DB_PASSWORD=votre-mot-de-passe-securise
```

## 📈 Avantages de PostgreSQL

### Performance
- **Connexions simultanées** : Gestion native des pools de connexions
- **Requêtes optimisées** : Planificateur de requêtes avancé
- **Index** : Support des index B-tree, Hash, GIN, GiST
- **Cache** : Cache de requêtes intégré

### Fiabilité
- **ACID** : Transactions atomiques, cohérentes, isolées, durables
- **Contraintes** : Validation des données au niveau base
- **Sauvegardes** : Outils de sauvegarde et restauration
- **Réplication** : Support de la réplication maître-esclave

### Fonctionnalités
- **JSON** : Support natif des données JSON
- **Full-text search** : Recherche textuelle avancée
- **Extensions** : Écosystème d'extensions riche
- **Monitoring** : Outils de monitoring intégrés

## 🛠️ Maintenance

### Sauvegarde
```bash
# Sauvegarde complète
docker-compose exec postgres pg_dump -U emynopass emynopass > backup.sql

# Restauration
docker-compose exec -T postgres psql -U emynopass emynopass < backup.sql
```

### Monitoring
```bash
# Statistiques des tables
docker-compose exec postgres psql -U emynopass -d emynopass -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY tablename, attname;"

# Connexions actives
docker-compose exec postgres psql -U emynopass -d emynopass -c "
SELECT pid, usename, application_name, client_addr, state, query 
FROM pg_stat_activity 
WHERE state = 'active';"
```

### Optimisation
```bash
# Analyse des tables
docker-compose exec postgres psql -U emynopass -d emynopass -c "ANALYZE;"

# Nettoyage
docker-compose exec postgres psql -U emynopass -d emynopass -c "VACUUM ANALYZE;"
```

## 🚨 Dépannage

### Problèmes courants

#### Connexion refusée
```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les logs
docker-compose logs postgres
```

#### Erreur de migration
```bash
# Vérifier les permissions
ls -la data/emynopass.db

# Relancer la migration
node scripts/migrate-sqlite-to-postgres.js
```

#### Performance lente
```bash
# Vérifier les index
docker-compose exec postgres psql -U emynopass -d emynopass -c "
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';"

# Analyser les requêtes lentes
docker-compose exec postgres psql -U emynopass -d emynopass -c "
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## 📞 Support

En cas de problème :

1. Vérifiez les logs : `docker-compose logs -f`
2. Exécutez les tests : `node test-postgres-migration.js`
3. Consultez la documentation PostgreSQL
4. Contactez l'équipe de développement

## 🎉 Conclusion

La migration vers PostgreSQL apporte :
- ✅ Meilleures performances
- ✅ Scalabilité améliorée
- ✅ Fiabilité accrue
- ✅ Fonctionnalités avancées
- ✅ Support production

La migration est **réversible** grâce aux sauvegardes automatiques des données SQLite.
