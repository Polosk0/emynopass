import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
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
  private dbPath: string;

  constructor() {
        // Utiliser un fichier SQLite persistant
        this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'emynopass.db');
    
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(this.dbPath);
    console.log(`📦 Database path: ${this.dbPath}`);
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Table Users
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'USER',
            isActive INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table Files
        this.db.run(`
          CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            originalName TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            path TEXT NOT NULL,
            isEncrypted INTEGER DEFAULT 0,
            uploadedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            expiresAt TEXT,
            userId TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users (id)
          )
        `);

        // Table Shares
        this.db.run(`
          CREATE TABLE IF NOT EXISTS shares (
            id TEXT PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            password TEXT,
            maxDownloads INTEGER,
            downloads INTEGER DEFAULT 0,
            expiresAt TEXT,
            isActive INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            fileId TEXT NOT NULL,
            userId TEXT NOT NULL,
            title TEXT,
            description TEXT,
            FOREIGN KEY (fileId) REFERENCES files (id),
            FOREIGN KEY (userId) REFERENCES users (id)
          )
        `);

        // Migration : Ajouter les colonnes title et description si elles n'existent pas
        this.db.run(`
          ALTER TABLE shares ADD COLUMN title TEXT
        `, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Erreur ajout colonne title:', err);
          }
        });

        this.db.run(`
          ALTER TABLE shares ADD COLUMN description TEXT
        `, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Erreur ajout colonne description:', err);
          }
        });

        // Table Sessions pour l'authentification
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expiresAt TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Database tables created successfully');
            this.seedData().then(resolve).catch(reject);
          }
        });
      });
    });
  }

  private async seedData(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Créer le compte admin principal
        const adminPassword = await bcrypt.hash('Emynopass2024!', 10);

        const admin: User = {
          id: uuidv4(),
          email: 'polosko@emynopass.dev',
          password: adminPassword,
          name: 'Polosko',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Créer un compte de démonstration
        const demoPassword = await bcrypt.hash('demo2024', 10);

        const demoUser: User = {
          id: uuidv4(),
          email: 'demo@emynopass.dev',
          password: demoPassword,
          name: 'Utilisateur Démo',
          role: 'USER',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Insérer le compte admin
        this.db.run(`
          INSERT OR IGNORE INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [admin.id, admin.email, admin.password, admin.name, admin.role, admin.isActive ? 1 : 0, admin.createdAt, admin.updatedAt]);

        // Insérer le compte démo
        this.db.run(`
          INSERT OR IGNORE INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [demoUser.id, demoUser.email, demoUser.password, demoUser.name, demoUser.role, demoUser.isActive ? 1 : 0, demoUser.createdAt, demoUser.updatedAt], (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ User accounts created successfully');
            console.log('👑 Admin: polosko@emynopass.dev / Emynopass2024!');
            console.log('👤 Demo: demo@emynopass.dev / demo2024');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
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
          } else {
            if (row) {
              resolve({
                ...row,
                isActive: row.isActive === 1
              });
            } else {
              resolve(null);
            }
          }
        }
      );
    });
  }

  async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, email, name, role, isActive, createdAt, updatedAt FROM users ORDER BY createdAt DESC',
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const users = rows.map(row => ({
              ...row,
              isActive: row.isActive === 1
            }));
            resolve(users);
          }
        }
      );
    });
  }

  async getUserCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM users',
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        }
      );
    });
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      this.db.run(`
        INSERT INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, user.email, user.password, user.name, user.role, user.isActive ? 1 : 0, now, now], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id,
            createdAt: now,
            updatedAt: now,
            ...user
          });
        }
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
        
        if (row?.email === 'polosko@emynopass.dev') {
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
        
        fields.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push(userId);

        this.db.run(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
          values,
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.changes > 0);
            }
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
        
        if (row?.email === 'polosko@emynopass.dev') {
          reject(new Error('Impossible de supprimer le compte leader'));
          return;
        }

        this.db.run(
          'DELETE FROM users WHERE id = ?',
          [userId],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.changes > 0);
            }
          }
        );
      });
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              resolve({
                ...row,
                isActive: row.isActive === 1
              });
            } else {
              resolve(null);
            }
          }
        }
      );
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
      `, [id, file.filename, file.originalName, file.mimetype, file.size, file.path, file.isEncrypted ? 1 : 0, uploadedAt, file.expiresAt, file.userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id,
            uploadedAt,
            ...file
          });
        }
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
          } else {
            const files = rows.map(row => ({
              ...row,
              isEncrypted: row.isEncrypted === 1
            }));
            resolve(files);
          }
        }
      );
    });
  }

  async getAllFiles(): Promise<FileRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT f.*, u.email as userEmail, u.name as userName 
         FROM files f 
         LEFT JOIN users u ON f.userId = u.id 
         ORDER BY f.uploadedAt DESC`,
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const files = rows.map(row => ({
              ...row,
              isEncrypted: row.isEncrypted === 1
            }));
            resolve(files);
          }
        }
      );
    });
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM files WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              resolve({
                ...row,
                isEncrypted: row.isEncrypted === 1
              });
            } else {
              resolve(null);
            }
          }
        }
      );
    });
  }

  async deleteFile(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM files WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
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
          } else {
            resolve(this.changes);
          }
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
          } else {
            resolve();
          }
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
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  async deleteSession(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM sessions WHERE token = ?',
        [token],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
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
          } else {
            resolve(this.changes);
          }
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
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id,
            createdAt,
            downloads: 0,
            ...share
          });
        }
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
          } else {
            if (row) {
              resolve({
                ...row,
                isActive: row.isActive === 1
              });
            } else {
              resolve(null);
            }
          }
        }
      );
    });
  }

  async getSharesByUser(userId: string): Promise<Share[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, f.originalName, f.size, f.mimetype 
         FROM shares s 
         LEFT JOIN files f ON s.fileId = f.id 
         WHERE s.userId = ? 
         ORDER BY s.createdAt DESC`,
        [userId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const shares = rows.map(row => ({
              ...row,
              isActive: row.isActive === 1
            }));
            resolve(shares);
          }
        }
      );
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
          } else {
            resolve(this.changes > 0);
          }
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
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  async deleteShare(shareId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM shares WHERE id = ?',
        [shareId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  async optimize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('VACUUM', (err) => {
        if (err) {
          console.error('Erreur optimisation DB:', err);
          reject(err);
        } else {
          console.log('✅ Base de données optimisée');
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close(() => {
        console.log('📦 Database connection closed');
        resolve();
      });
    });
  }
}

export const database = new Database();
export default database;
