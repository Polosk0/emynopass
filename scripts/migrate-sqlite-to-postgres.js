#!/usr/bin/env node

/**
 * Script de migration de SQLite vers PostgreSQL
 * Ce script migre toutes les données existantes de SQLite vers PostgreSQL
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'emynopass.db');
const POSTGRES_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'emynopass',
  user: process.env.DB_USER || 'emynopass',
  password: process.env.DB_PASSWORD || 'emynopass',
};

console.log('🔄 Début de la migration SQLite vers PostgreSQL...');
console.log('📁 Base SQLite:', SQLITE_DB_PATH);
console.log('🐘 PostgreSQL:', `${POSTGRES_CONFIG.host}:${POSTGRES_CONFIG.port}/${POSTGRES_CONFIG.database}`);

// Vérifier que le fichier SQLite existe
if (!fs.existsSync(SQLITE_DB_PATH)) {
  console.error('❌ Fichier SQLite non trouvé:', SQLITE_DB_PATH);
  process.exit(1);
}

// Connexion à SQLite
const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erreur connexion SQLite:', err);
    process.exit(1);
  }
  console.log('✅ Connexion SQLite établie');
});

// Connexion à PostgreSQL
const postgresPool = new Pool(POSTGRES_CONFIG);

async function migrateData() {
  const client = await postgresPool.connect();
  
  try {
    console.log('🔧 Début de la migration des données...');
    
    // Vérifier d'abord si la base SQLite a des tables
    const tables = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (tables.length === 0) {
      console.log('⚠️  Base SQLite vide - initialisation avec les données par défaut');
      await createTables(client);
      await seedDefaultData(client);
      return;
    }
    
    // 1. Migration des utilisateurs
    console.log('👥 Migration des utilisateurs...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const user of users) {
      try {
        await client.query(`
          INSERT INTO users (id, email, password, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          user.id,
          user.email,
          user.password,
          user.name,
          user.role,
          user.isActive === 1,
          user.isDemo === 1,
          user.isTemporaryDemo === 1,
          user.demoExpiresAt,
          user.createdAt,
          user.updatedAt
        ]);
      } catch (error) {
        console.warn('⚠️ Erreur migration utilisateur:', user.email, error.message);
      }
    }
    console.log(`✅ ${users.length} utilisateurs migrés`);
    
    // 2. Migration des fichiers
    console.log('📁 Migration des fichiers...');
    const files = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM files', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const file of files) {
      try {
        await client.query(`
          INSERT INTO files (id, filename, originalName, mimetype, size, path, isEncrypted, uploadedAt, expiresAt, userId)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          file.id,
          file.filename,
          file.originalName,
          file.mimetype,
          file.size,
          file.path,
          file.isEncrypted === 1,
          file.uploadedAt,
          file.expiresAt,
          file.userId
        ]);
      } catch (error) {
        console.warn('⚠️ Erreur migration fichier:', file.filename, error.message);
      }
    }
    console.log(`✅ ${files.length} fichiers migrés`);
    
    // 3. Migration des partages
    console.log('🔗 Migration des partages...');
    const shares = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM shares', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const share of shares) {
      try {
        await client.query(`
          INSERT INTO shares (id, token, password, maxDownloads, downloads, expiresAt, isActive, createdAt, fileId, userId, title, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [
          share.id,
          share.token,
          share.password,
          share.maxDownloads,
          share.downloads,
          share.expiresAt,
          share.isActive === 1,
          share.createdAt,
          share.fileId,
          share.userId,
          share.title,
          share.description
        ]);
      } catch (error) {
        console.warn('⚠️ Erreur migration partage:', share.token, error.message);
      }
    }
    console.log(`✅ ${shares.length} partages migrés`);
    
    // 4. Migration des sessions
    console.log('🔐 Migration des sessions...');
    const sessions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM sessions', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    for (const session of sessions) {
      try {
        await client.query(`
          INSERT INTO sessions (id, userId, token, expiresAt, createdAt)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [
          session.id,
          session.userId,
          session.token,
          session.expiresAt,
          session.createdAt
        ]);
      } catch (error) {
        console.warn('⚠️ Erreur migration session:', session.token, error.message);
      }
    }
    console.log(`✅ ${sessions.length} sessions migrées`);
    
    console.log('🎉 Migration terminée avec succès !');
    
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
    // Fermer les connexions
    sqliteDb.close((err) => {
      if (err) {
        console.error('❌ Erreur fermeture SQLite:', err);
      } else {
        console.log('✅ Connexion SQLite fermée');
      }
    });
    
    await postgresPool.end();
    console.log('✅ Connexion PostgreSQL fermée');
  }
}

// Exécuter la migration
main();
