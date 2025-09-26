-- Script d'initialisation PostgreSQL pour Emynopass
-- Ce script est exécuté automatiquement lors de la création du conteneur PostgreSQL

-- Créer l'extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer l'extension pour les fonctions de génération d'UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Créer la base de données si elle n'existe pas (déjà fait par POSTGRES_DB)
-- Mais on peut ajouter des configurations spécifiques ici

-- Configuration des paramètres de performance
-- Note: pg_stat_statements nécessite l'extension correspondante
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
-- ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Configuration de la mémoire
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Configuration des logs
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Recharger la configuration
SELECT pg_reload_conf();

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de données PostgreSQL initialisée pour Emynopass';
    RAISE NOTICE 'Extensions installées: uuid-ossp, pgcrypto';
    RAISE NOTICE 'Configuration optimisée pour la production';
END $$;
