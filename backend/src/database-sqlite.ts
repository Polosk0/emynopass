import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

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
  private db: sqlite3.Database;

  constructor() {
    console.log('🔧 [DEBUG] Initialisation de la classe Database SQLite...');
    
    // Chemin vers la base de données SQLite
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/emynopass.db');
    
    console.log('🔧 [DEBUG] Chemin base de données SQLite:', dbPath);

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ [DEBUG] Erreur ouverture SQLite:', err);
        throw err;
      }
      console.log('✅ [DEBUG] Connexion SQLite établie');
    });

    // Activer les clés étrangères
    this.db.run('PRAGMA foreign_keys = ON');
  }

  async init(): Promise<void> {
    console.log('🔧 [DEBUG] Début de l\'initialisation de la base de données SQLite...');
    
    try {
      // Création des tables
      await this.createTables();
      console.log('✅ [DEBUG] Tables créées avec succès');
      
      // Seed des données
      await this.seedData();
      console.log('✅ [DEBUG] Seed des données terminé');
      
      console.log('✅ [DEBUG] Initialisation SQLite complète');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur initialisation SQLite:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    console.log('🔧 [DEBUG] Création des tables SQLite...');

    return new Promise((resolve, reject) => {
      const queries = [
        // Table users
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
          isActive BOOLEAN DEFAULT 1,
          isDemo BOOLEAN DEFAULT 0,
          isTemporaryDemo BOOLEAN DEFAULT 0,
          demoExpiresAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Table files
        `CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          originalName TEXT NOT NULL,
          mimetype TEXT NOT NULL,
          size INTEGER NOT NULL,
          path TEXT NOT NULL,
          isEncrypted BOOLEAN DEFAULT 0,
          uploadedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          expiresAt TEXT,
          userId TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        
        // Table shares
        `CREATE TABLE IF NOT EXISTS shares (
          id TEXT PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          password TEXT,
          maxDownloads INTEGER,
          downloads INTEGER DEFAULT 0,
          expiresAt TEXT,
          isActive BOOLEAN DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          fileId TEXT NOT NULL,
          userId TEXT NOT NULL,
          title TEXT,
          description TEXT,
          FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        
        // Table sessions
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expiresAt TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`
      ];

      let completed = 0;
      queries.forEach((query, index) => {
        this.db.run(query, (err) => {
          if (err) {
            console.error(`❌ [DEBUG] Erreur création table ${index + 1}:`, err);
            reject(err);
            return;
          }
          completed++;
          if (completed === queries.length) {
            console.log('✅ [DEBUG] Toutes les tables créées');
            resolve();
          }
        });
      });
    });
  }

  private async seedData(): Promise<void> {
    console.log('🔧 [DEBUG] Début du seed des données...');

    return new Promise((resolve, reject) => {
      // Vérifier si des utilisateurs existent déjà
      this.db.get('SELECT COUNT(*) as count FROM users', async (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count > 0) {
          console.log('✅ [DEBUG] Utilisateurs existants trouvés, pas de seed nécessaire');
          resolve();
          return;
        }

        try {
          // Créer le compte admin principal
          const adminPassword = await bcrypt.hash('Emynopass2024!', 10);
          const adminId = uuidv4();
          
          this.db.run(`
            INSERT INTO users (id, email, password, name, role, isActive, isDemo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [adminId, 'polosko@emynopass.dev', adminPassword, 'Polosko', 'ADMIN', 1, 0]);

          // Créer un compte de démonstration
          const demoPassword = await bcrypt.hash('demo2024', 10);
          const demoId = uuidv4();
          
          this.db.run(`
            INSERT INTO users (id, email, password, name, role, isActive, isDemo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [demoId, 'demo@emynopass.dev', demoPassword, 'Utilisateur Démo', 'USER', 1, 1]);

          console.log('✅ [DEBUG] Comptes utilisateurs créés');
          console.log('👑 Admin: polosko@emynopass.dev / Emynopass2024!');
          console.log('👤 Demo: demo@emynopass.dev / demo2024');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Méthodes pour les utilisateurs
  async findUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(this.mapUserFromRow(row));
        }
      );
    });
  }

  async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, email, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt FROM users ORDER BY createdAt DESC',
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(rows.map(row => this.mapUserFromRow(row)));
        }
      );
    });
  }

  async getUserCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count);
      });
    });
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      this.db.run(`
        INSERT INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, user.email, user.password, user.name, user.role, user.isActive ? 1 : 0, user.isDemo ? 1 : 0, now, now], (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Récupérer l'utilisateur créé
        this.db.get('SELECT * FROM users WHERE id = ?', [id], (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.mapUserFromRow(row));
        });
      });
    });
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Vérifier si l'utilisateur est Polosko (protection)
      this.db.get('SELECT email FROM users WHERE id = ?', [userId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(false);
          return;
        }
        
        if (row.email === 'polosko@emynopass.dev') {
          reject(new Error('Impossible de modifier le compte leader'));
          return;
        }

        const fields = [];
        const values = [];
        
        if (updates.email) {
          fields.push('email = ?');
          values.push(updates.email);
        }
        if (updates.password) {
          fields.push('password = ?');
          values.push(updates.password);
        }
        if (updates.name) {
          fields.push('name = ?');
          values.push(updates.name);
        }
        if (updates.role) {
          fields.push('role = ?');
          values.push(updates.role);
        }
        if (updates.isActive !== undefined) {
          fields.push('isActive = ?');
          values.push(updates.isActive ? 1 : 0);
        }
        
        if (fields.length === 0) {
          resolve(false);
          return;
        }

        fields.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push(userId);

        this.db.run(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
          values,
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve(this.changes > 0);
          }
        );
      });
    });
  }

  async deleteUser(userId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Vérifier si l'utilisateur est Polosko (protection)
      this.db.get('SELECT email FROM users WHERE id = ?', [userId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(false);
          return;
        }
        
        if (row.email === 'polosko@emynopass.dev') {
          reject(new Error('Impossible de supprimer le compte leader'));
          return;
        }

        this.db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        });
      });
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.mapUserFromRow(row));
      });
    });
  }

  // Méthodes pour les fichiers
  async createFile(file: Omit<FileRecord, 'id' | 'uploadedAt'>): Promise<FileRecord> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const uploadedAt = new Date().toISOString();
      
      this.db.run(`
        INSERT INTO files (id, filename, originalName, mimetype, size, path, isEncrypted, uploadedAt, expiresAt, userId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, file.filename, file.originalName, file.mimetype, file.size, file.path, file.isEncrypted ? 1 : 0, uploadedAt, file.expiresAt, file.userId], (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Récupérer le fichier créé
        this.db.get('SELECT * FROM files WHERE id = ?', [id], (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.mapFileFromRow(row));
        });
      });
    });
  }

  async getFilesByUser(userId: string): Promise<FileRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM files WHERE userId = ? ORDER BY uploadedAt DESC',
        [userId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(rows.map(row => this.mapFileFromRow(row)));
        }
      );
    });
  }

  async getAllFiles(): Promise<FileRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT f.*, u.email as userEmail, u.name as userName 
        FROM files f 
        LEFT JOIN users u ON f.userId = u.id 
        ORDER BY f.uploadedAt DESC
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows.map(row => this.mapFileFromRow(row)));
      });
    });
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM files WHERE id = ?', [id], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.mapFileFromRow(row));
      });
    });
  }

  async deleteFile(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM files WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  }

  async deleteExpiredFiles(): Promise<number> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.run(
        'DELETE FROM files WHERE expiresAt IS NOT NULL AND expiresAt < ?',
        [now],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  }

  // Méthodes pour les sessions
  async createSession(userId: string, token: string, expiresAt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.db.run(
        'INSERT INTO sessions (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)',
        [id, userId, token, expiresAt],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  async findSessionByToken(token: string): Promise<{ userId: string, expiresAt: string } | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT userId, expiresAt FROM sessions WHERE token = ?',
        [token],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(row);
        }
      );
    });
  }

  async deleteSession(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sessions WHERE token = ?', [token], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async deleteExpiredSessions(): Promise<number> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.run(
        'DELETE FROM sessions WHERE expiresAt < ?',
        [now],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  }

  // Méthodes pour les partages
  async createShare(share: Omit<Share, 'id' | 'createdAt' | 'downloads'>): Promise<Share> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      
      this.db.run(`
        INSERT INTO shares (id, token, password, maxDownloads, downloads, expiresAt, isActive, createdAt, fileId, userId, title, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, 
        share.token, 
        share.password, 
        share.maxDownloads, 
        0, 
        share.expiresAt, 
        share.isActive ? 1 : 0, 
        createdAt, 
        share.fileId, 
        share.userId,
        share.title,
        share.description
      ], (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Récupérer le partage créé
        this.db.get('SELECT * FROM shares WHERE id = ?', [id], (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.mapShareFromRow(row));
        });
      });
    });
  }

  async findShareByToken(token: string): Promise<Share | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM shares WHERE token = ? AND isActive = 1',
        [token],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(this.mapShareFromRow(row));
        }
      );
    });
  }

  async getSharesByUser(userId: string): Promise<Share[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT s.*, f.originalName, f.size, f.mimetype 
        FROM shares s 
        LEFT JOIN files f ON s.fileId = f.id 
        WHERE s.userId = ? 
        ORDER BY s.createdAt DESC
      `, [userId], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows.map(row => this.mapShareFromRow(row)));
      });
    });
  }

  async incrementShareDownload(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE shares SET downloads = downloads + 1 WHERE token = ?',
        [token],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  async updateShare(shareId: string, updates: Partial<Share>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (updates.password !== undefined) {
        fields.push('password = ?');
        values.push(updates.password);
      }
      if (updates.maxDownloads !== undefined) {
        fields.push('maxDownloads = ?');
        values.push(updates.maxDownloads);
      }
      if (updates.expiresAt !== undefined) {
        fields.push('expiresAt = ?');
        values.push(updates.expiresAt);
      }
      if (updates.isActive !== undefined) {
        fields.push('isActive = ?');
        values.push(updates.isActive ? 1 : 0);
      }
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }

      if (fields.length === 0) {
        resolve(false);
        return;
      }

      values.push(shareId);

      this.db.run(
        `UPDATE shares SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  async getShareById(shareId: string): Promise<Share | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM shares WHERE id = ?', [shareId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.mapShareFromRow(row));
      });
    });
  }

  async deleteShare(shareId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM shares WHERE id = ?', [shareId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  }

  async deleteSharesByFileId(fileId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM shares WHERE fileId = ?', [fileId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }

  async getOrphanedShares(): Promise<Share[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT s.* FROM shares s 
        LEFT JOIN files f ON s.fileId = f.id 
        WHERE f.id IS NULL
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows.map(row => this.mapShareFromRow(row)));
      });
    });
  }

  async deleteOrphanedShares(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM shares WHERE fileId NOT IN (SELECT id FROM files)',
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  }

  // Méthodes pour les comptes démo temporaires
  async createTemporaryDemoUser(): Promise<User> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const email = `demo-${id.substring(0, 8)}@emynopass.dev`;
      const password = bcrypt.hashSync('demo2024', 10);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      this.db.run(`
        INSERT INTO users (id, email, password, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, email, password, 'Utilisateur Démo Temporaire', 'USER', 1, 1, 1, expiresAt, now, now], (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Récupérer l'utilisateur créé
        this.db.get('SELECT * FROM users WHERE id = ?', [id], (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.mapUserFromRow(row));
        });
      });
    });
  }

  async getExpiredDemoUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM users WHERE isTemporaryDemo = 1 AND demoExpiresAt < ?',
        [new Date().toISOString()],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(rows.map(row => this.mapUserFromRow(row)));
        }
      );
    });
  }

  async deleteExpiredDemoUsers(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM users WHERE isTemporaryDemo = 1 AND demoExpiresAt < ?',
        [new Date().toISOString()],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  }

  async getUserStorageUsed(userId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COALESCE(SUM(size), 0) as totalSize FROM files WHERE userId = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row.totalSize || 0);
        }
      );
    });
  }

  async optimize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('VACUUM', (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('✅ Base de données SQLite optimisée');
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('📦 Database connection closed');
        resolve();
      });
    });
  }

  // Méthodes utilitaires pour mapper les résultats
  private mapUserFromRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      isActive: Boolean(row.isActive),
      isDemo: Boolean(row.isDemo),
      isTemporaryDemo: Boolean(row.isTemporaryDemo),
      demoExpiresAt: row.demoExpiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapFileFromRow(row: any): FileRecord {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimetype: row.mimetype,
      size: parseInt(row.size),
      path: row.path,
      isEncrypted: Boolean(row.isEncrypted),
      uploadedAt: row.uploadedAt,
      expiresAt: row.expiresAt,
      userId: row.userId
    };
  }

  private mapShareFromRow(row: any): Share {
    return {
      id: row.id,
      token: row.token,
      password: row.password,
      maxDownloads: row.maxDownloads,
      downloads: row.downloads,
      expiresAt: row.expiresAt,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      fileId: row.fileId,
      userId: row.userId,
      title: row.title,
      description: row.description
    };
  }
}

export const database = new Database();
export default database;
