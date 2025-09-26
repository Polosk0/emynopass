import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  isDemo: boolean;
  isTemporaryDemo?: boolean;
  demoExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  isEncrypted: boolean;
  uploadedAt: string;
  expiresAt?: string;
  userId: string;
}

export interface Share {
  id: string;
  token: string;
  password?: string;
  maxDownloads?: number;
  downloads: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  fileId: string;
  userId: string;
  title?: string;
  description?: string;
}

class Database {
  private pool: Pool;

  constructor() {
    console.log('🔧 [DEBUG] Initialisation de la classe Database PostgreSQL...');
    
    // Configuration de la connexion PostgreSQL
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'emynopass',
      user: process.env.DB_USER || 'emynopass',
      password: process.env.DB_PASSWORD || 'emynopass',
      max: 20, // Maximum de connexions dans le pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    console.log('🔧 [DEBUG] Configuration PostgreSQL:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      max: config.max
    });

    this.pool = new Pool(config);

    // Gestion des erreurs de connexion
    this.pool.on('error', (err: Error) => {
      console.error('❌ [DEBUG] Erreur pool PostgreSQL:', err);
    });

    this.pool.on('connect', () => {
      console.log('✅ [DEBUG] Nouvelle connexion PostgreSQL établie');
    });
  }

  async init(): Promise<void> {
    console.log('🔧 [DEBUG] Début de l\'initialisation de la base de données PostgreSQL...');
    
    try {
      // Test de connexion
      const client = await this.pool.connect();
      console.log('✅ [DEBUG] Connexion PostgreSQL testée avec succès');
      
      // Création des tables
      await this.createTables(client);
      console.log('✅ [DEBUG] Tables créées avec succès');
      
      // Seed des données
      await this.seedData(client);
      console.log('✅ [DEBUG] Seed des données terminé');
      
      client.release();
      console.log('✅ [DEBUG] Initialisation PostgreSQL complète');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur initialisation PostgreSQL:', error);
      throw error;
    }
  }

  private async createTables(client: PoolClient): Promise<void> {
    console.log('🔧 [DEBUG] Création des tables PostgreSQL...');

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
    console.log('✅ [DEBUG] Table users créée');

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
    console.log('✅ [DEBUG] Table files créée');

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
    console.log('✅ [DEBUG] Table shares créée');

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
    console.log('✅ [DEBUG] Table sessions créée');

    // Index pour améliorer les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId);
      CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
      CREATE INDEX IF NOT EXISTS idx_shares_userId ON shares(userId);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    `);
    console.log('✅ [DEBUG] Index créés');
  }

  private async seedData(client: PoolClient): Promise<void> {
    console.log('🔧 [DEBUG] Début du seed des données...');

    try {
      // Vérifier si des utilisateurs existent déjà
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) > 0) {
        console.log('✅ [DEBUG] Utilisateurs existants trouvés, pas de seed nécessaire');
        return;
      }

      // Créer le compte admin principal
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

      console.log('✅ [DEBUG] Comptes utilisateurs créés');
      console.log('👑 Admin: polosko@emynopass.dev / Emynopass2024!');
      console.log('👤 Demo: demo@emynopass.dev / demo2024');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur seed des données:', error);
      throw error;
    }
  }

  // Méthodes pour les utilisateurs
  async findUserByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapUserFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getAllUsers(): Promise<User[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt FROM users ORDER BY createdAt DESC'
      );
      
      return result.rows.map((row: any) => this.mapUserFromRow(row));
    } finally {
      client.release();
    }
  }

  async getUserCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM users');
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const result = await client.query(`
        INSERT INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [id, user.email, user.password, user.name, user.role, user.isActive, user.isDemo, now, now]);
      
      return this.mapUserFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      // Vérifier si l'utilisateur est Polosko (protection)
      const userResult = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return false;
      }
      
      if (userResult.rows[0].email === 'polosko@emynopass.dev') {
        throw new Error('Impossible de modifier le compte leader');
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      if (updates.email) {
        fields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }
      if (updates.password) {
        fields.push(`password = $${paramIndex++}`);
        values.push(updates.password);
      }
      if (updates.name) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.role) {
        fields.push(`role = $${paramIndex++}`);
        values.push(updates.role);
      }
      if (updates.isActive !== undefined) {
        fields.push(`isActive = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      
      if (fields.length === 0) {
        return false;
      }

      fields.push(`updatedAt = $${paramIndex++}`);
      values.push(new Date().toISOString());
      values.push(userId);

      const result = await client.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
      
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      // Vérifier si l'utilisateur est Polosko (protection)
      const userResult = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return false;
      }
      
      if (userResult.rows[0].email === 'polosko@emynopass.dev') {
        throw new Error('Impossible de supprimer le compte leader');
      }

      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapUserFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  // Méthodes pour les fichiers
  async createFile(file: Omit<FileRecord, 'id' | 'uploadedAt'>): Promise<FileRecord> {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      const uploadedAt = new Date().toISOString();
      
      const result = await client.query(`
        INSERT INTO files (id, filename, originalName, mimetype, size, path, isEncrypted, uploadedAt, expiresAt, userId)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [id, file.filename, file.originalName, file.mimetype, file.size, file.path, file.isEncrypted, uploadedAt, file.expiresAt, file.userId]);
      
      return this.mapFileFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getFilesByUser(userId: string): Promise<FileRecord[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM files WHERE userId = $1 ORDER BY uploadedAt DESC',
        [userId]
      );
      
      return result.rows.map((row: any) => this.mapFileFromRow(row));
    } finally {
      client.release();
    }
  }

  async getAllFiles(): Promise<FileRecord[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT f.*, u.email as userEmail, u.name as userName 
        FROM files f 
        LEFT JOIN users u ON f.userId = u.id 
        ORDER BY f.uploadedAt DESC
      `);
      
      return result.rows.map((row: any) => this.mapFileFromRow(row));
    } finally {
      client.release();
    }
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM files WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapFileFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteFile(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM files WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async deleteExpiredFiles(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const now = new Date().toISOString();
      const result = await client.query(
        'DELETE FROM files WHERE expiresAt IS NOT NULL AND expiresAt < $1',
        [now]
      );
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Méthodes pour les sessions
  async createSession(userId: string, token: string, expiresAt: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      await client.query(
        'INSERT INTO sessions (id, userId, token, expiresAt) VALUES ($1, $2, $3, $4)',
        [id, userId, token, expiresAt]
      );
    } finally {
      client.release();
    }
  }

  async findSessionByToken(token: string): Promise<{ userId: string, expiresAt: string } | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT userId, expiresAt FROM sessions WHERE token = $1',
        [token]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteSession(token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE token = $1', [token]);
    } finally {
      client.release();
    }
  }

  async deleteExpiredSessions(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const now = new Date().toISOString();
      const result = await client.query(
        'DELETE FROM sessions WHERE expiresAt < $1',
        [now]
      );
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Méthodes pour les partages
  async createShare(share: Omit<Share, 'id' | 'createdAt' | 'downloads'>): Promise<Share> {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      
      const result = await client.query(`
        INSERT INTO shares (id, token, password, maxDownloads, downloads, expiresAt, isActive, createdAt, fileId, userId, title, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        id, 
        share.token, 
        share.password, 
        share.maxDownloads, 
        0, 
        share.expiresAt, 
        share.isActive, 
        createdAt, 
        share.fileId, 
        share.userId,
        share.title,
        share.description
      ]);
      
      return this.mapShareFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findShareByToken(token: string): Promise<Share | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM shares WHERE token = $1 AND isActive = true',
        [token]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapShareFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getSharesByUser(userId: string): Promise<Share[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT s.*, f.originalName, f.size, f.mimetype 
        FROM shares s 
        LEFT JOIN files f ON s.fileId = f.id 
        WHERE s.userId = $1 
        ORDER BY s.createdAt DESC
      `, [userId]);
      
      return result.rows.map((row: any) => this.mapShareFromRow(row));
    } finally {
      client.release();
    }
  }

  async incrementShareDownload(token: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE shares SET downloads = downloads + 1 WHERE token = $1',
        [token]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async updateShare(shareId: string, updates: Partial<Share>): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      if (updates.password !== undefined) {
        fields.push(`password = $${paramIndex++}`);
        values.push(updates.password);
      }
      if (updates.maxDownloads !== undefined) {
        fields.push(`maxDownloads = $${paramIndex++}`);
        values.push(updates.maxDownloads);
      }
      if (updates.expiresAt !== undefined) {
        fields.push(`expiresAt = $${paramIndex++}`);
        values.push(updates.expiresAt);
      }
      if (updates.isActive !== undefined) {
        fields.push(`isActive = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      if (updates.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      if (fields.length === 0) {
        return false;
      }

      values.push(shareId);

      const result = await client.query(
        `UPDATE shares SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
      
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getShareById(shareId: string): Promise<Share | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM shares WHERE id = $1', [shareId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapShareFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteShare(shareId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM shares WHERE id = $1', [shareId]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async deleteSharesByFileId(fileId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM shares WHERE fileId = $1', [fileId]);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async getOrphanedShares(): Promise<Share[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT s.* FROM shares s 
        LEFT JOIN files f ON s.fileId = f.id 
        WHERE f.id IS NULL
      `);
      
      return result.rows.map((row: any) => this.mapShareFromRow(row));
    } finally {
      client.release();
    }
  }

  async deleteOrphanedShares(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM shares WHERE fileId NOT IN (SELECT id FROM files)'
      );
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Méthodes pour les comptes démo temporaires
  async createTemporaryDemoUser(): Promise<User> {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      const email = `demo-${id.substring(0, 8)}@emynopass.dev`;
      const password = await bcrypt.hash('demo2024', 10);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      const result = await client.query(`
        INSERT INTO users (id, email, password, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [id, email, password, 'Utilisateur Démo Temporaire', 'USER', true, true, true, expiresAt, now, now]);
      
      return this.mapUserFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getExpiredDemoUsers(): Promise<User[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE isTemporaryDemo = true AND demoExpiresAt < $1',
        [new Date().toISOString()]
      );
      
      return result.rows.map((row: any) => this.mapUserFromRow(row));
    } finally {
      client.release();
    }
  }

  async deleteExpiredDemoUsers(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM users WHERE isTemporaryDemo = true AND demoExpiresAt < $1',
        [new Date().toISOString()]
      );
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async getUserStorageUsed(userId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT COALESCE(SUM(size), 0) as totalSize FROM files WHERE userId = $1',
        [userId]
      );
      return parseInt(result.rows[0].totalsize) || 0;
    } finally {
      client.release();
    }
  }

  async optimize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('VACUUM ANALYZE');
      console.log('✅ Base de données PostgreSQL optimisée');
    } catch (error) {
      console.error('Erreur optimisation DB:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('📦 Database connection pool closed');
  }

  // Méthodes utilitaires pour mapper les résultats
  private mapUserFromRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      isActive: row.isactive,
      isDemo: row.isdemo,
      isTemporaryDemo: row.istemporarydemo,
      demoExpiresAt: row.demoexpiresat,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  private mapFileFromRow(row: any): FileRecord {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.originalname,
      mimetype: row.mimetype,
      size: parseInt(row.size),
      path: row.path,
      isEncrypted: row.isencrypted,
      uploadedAt: row.uploadedat,
      expiresAt: row.expiresat,
      userId: row.userid
    };
  }

  private mapShareFromRow(row: any): Share {
    return {
      id: row.id,
      token: row.token,
      password: row.password,
      maxDownloads: row.maxdownloads,
      downloads: row.downloads,
      expiresAt: row.expiresat,
      isActive: row.isactive,
      createdAt: row.createdat,
      fileId: row.fileid,
      userId: row.userid,
      title: row.title,
      description: row.description
    };
  }
}

export const database = new Database();
export default database;