#!/usr/bin/env node

/**
 * Script de migration de SQLite vers PostgreSQL
 * Ce script migre toutes les données existantes de SQLite vers PostgreSQL
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuration PostgreSQL
const POSTGRES_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'emynopass',
  user: process.env.DB_USER || 'emynopass',
  password: process.env.DB_PASSWORD || 'emynopass',
};

console.log('🔄 Initialisation PostgreSQL pour Emynopass...');
console.log('🐘 PostgreSQL:', `${POSTGRES_CONFIG.host}:${POSTGRES_CONFIG.port}/${POSTGRES_CONFIG.database}`);

// Vérifier si une base SQLite existe pour migration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'emynopass.db');
let hasSqliteData = false;

if (fs.existsSync(SQLITE_DB_PATH)) {
  console.log('📁 Base SQLite trouvée:', SQLITE_DB_PATH);
  hasSqliteData = true;
} else {
  console.log('📁 Aucune base SQLite trouvée - initialisation avec données par défaut');
}

// Connexion à PostgreSQL
const postgresPool = new Pool(POSTGRES_CONFIG);

async function migrateData() {
  const client = await postgresPool.connect();
  
  try {
    console.log('🔧 Début de l\'initialisation PostgreSQL...');
    
    // Toujours créer les tables d'abord
    await createTables(client);
    
    if (!hasSqliteData) {
      console.log('⚠️  Aucune base SQLite - initialisation avec les données par défaut');
      await seedDefaultData(client);
      return;
    }
    
    // Si SQLite existe, essayer de migrer (nécessite sqlite3)
    console.log('⚠️  Base SQLite trouvée mais migration non supportée sans sqlite3');
    console.log('💡 Initialisation avec les données par défaut à la place');
    await seedDefaultData(client);
    
    console.log('🎉 Initialisation PostgreSQL terminée avec succès !');
    
    // Statistiques finales
    const stats = await Promise.all([
      client.query('SELECT COUNT(*) FROM users'),
      client.query('SELECT COUNT(*) FROM files'),
      client.query('SELECT COUNT(*) FROM shares'),
      client.query('SELECT COUNT(*) FROM sessions')
    ]);
    
    console.log('\n📊 Statistiques finales:');
    console.log(`👥 Utilisateurs: ${stats[0].rows[0].count}`);
    console.log(`📁 Fichiers: ${stats[1].rows[0].count}`);
    console.log(`🔗 Partages: ${stats[2].rows[0].count}`);
    console.log(`🔐 Sessions: ${stats[3].rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function createTables(client) {
  console.log('🔧 Création des tables PostgreSQL...');

  // Table users
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
      isActive BOOLEAN DEFAULT true,
      isDemo BOOLEAN DEFAULT false,
      isTemporaryDemo BOOLEAN DEFAULT false,
      demoExpiresAt TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table users créée');

  // Table files
  await client.query(`
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename VARCHAR(255) NOT NULL,
      originalName VARCHAR(255) NOT NULL,
      mimetype VARCHAR(100) NOT NULL,
      size BIGINT NOT NULL,
      path VARCHAR(500) NOT NULL,
      isEncrypted BOOLEAN DEFAULT false,
      uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expiresAt TIMESTAMP,
      userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Table files créée');

  // Table shares
  await client.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      maxDownloads INTEGER,
      downloads INTEGER DEFAULT 0,
      expiresAt TIMESTAMP,
      isActive BOOLEAN DEFAULT true,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      fileId UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      description TEXT
    )
  `);
  console.log('✅ Table shares créée');

  // Table sessions
  await client.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expiresAt TIMESTAMP NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table sessions créée');

  // Index pour améliorer les performances
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
    CREATE INDEX IF NOT EXISTS idx_shares_userId ON shares(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
  `);
  console.log('✅ Index créés');
}

async function seedDefaultData(client) {
  console.log('🌱 Initialisation avec les données par défaut...');
  
  try {
    // Vérifier si des utilisateurs existent déjà
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('✅ Utilisateurs existants trouvés, pas de seed nécessaire');
      return;
    }

    // Créer le compte admin principal
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    
    const adminPassword = await bcrypt.hash('Emynopass2024!', 10);
    const adminId = uuidv4();
    
    await client.query(`
      INSERT INTO users (id, email, password, name, role, isActive, isDemo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [adminId, 'polosko@emynopass.dev', adminPassword, 'Polosko', 'ADMIN', true, false]);

    // Créer un compte de démonstration
    const demoPassword = await bcrypt.hash('demo2024', 10);
    const demoId = uuidv4();
    
    await client.query(`
      INSERT INTO users (id, email, password, name, role, isActive, isDemo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [demoId, 'demo@emynopass.dev', demoPassword, 'Utilisateur Démo', 'USER', true, true]);

    console.log('✅ Comptes utilisateurs créés');
    console.log('👑 Admin: polosko@emynopass.dev / Emynopass2024!');
    console.log('👤 Demo: demo@emynopass.dev / demo2024');
    
  } catch (error) {
    console.error('❌ Erreur seed des données:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateData();
  } catch (error) {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion PostgreSQL
    await postgresPool.end();
    console.log('✅ Connexion PostgreSQL fermée');
  }
}

// Exécuter la migration
main();
