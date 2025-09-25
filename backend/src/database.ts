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
  private dbPath: string;

  constructor() {
    console.log('🔧 [DEBUG] Initialisation de la classe Database...');
    
    // Utiliser un fichier SQLite persistant
    // En Docker, utiliser /app/data, sinon utiliser le chemin relatif
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_PATH) {
      this.dbPath = process.env.DATABASE_PATH;
      console.log('🔧 [DEBUG] Mode production - utilisation de DATABASE_PATH:', this.dbPath);
    } else {
      this.dbPath = path.join(process.cwd(), 'data', 'emynopass.db');
      console.log('🔧 [DEBUG] Mode développement - chemin relatif:', this.dbPath);
    }
    
    console.log('🔧 [DEBUG] Chemin final de la base de données:', this.dbPath);
    
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(this.dbPath);
    console.log('🔧 [DEBUG] Dossier de données:', dataDir);
    
    if (!fs.existsSync(dataDir)) {
      console.log('🔧 [DEBUG] Création du dossier de données...');
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('✅ [DEBUG] Dossier de données créé avec succès');
      } catch (error) {
        console.error('❌ [DEBUG] Erreur création dossier de données:', error);
        throw error;
      }
    } else {
      console.log('✅ [DEBUG] Dossier de données existe déjà');
    }
    
    // Vérifier les permissions du dossier
    try {
      const stats = fs.statSync(dataDir);
      console.log('🔧 [DEBUG] Permissions du dossier de données:', {
        mode: stats.mode.toString(8),
        uid: stats.uid,
        gid: stats.gid
      });
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lecture permissions dossier:', error);
    }
    
    console.log('🔧 [DEBUG] Connexion à la base de données SQLite...');
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('❌ [DEBUG] Erreur connexion SQLite:', err);
        console.error('❌ [DEBUG] Détails de l\'erreur:', {
          code: (err as any).code,
          message: err.message,
          stack: err.stack
        });
        throw err;
      }
      console.log(`📦 [DEBUG] Database path: ${this.dbPath}`);
      console.log('✅ [DEBUG] Connexion SQLite établie avec succès');
    });
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔧 [DEBUG] Début de l\'initialisation de la base de données...');
      
      // Timeout de sécurité pour toute l'initialisation
      const globalTimeout = setTimeout(() => {
        console.error('❌ [DEBUG] Timeout global lors de l\'initialisation (60 secondes)');
        reject(new Error('Timeout global lors de l\'initialisation'));
      }, 60000);
      
      // Vérifier d'abord la connectivité
      this.db.get('SELECT 1', (err) => {
        if (err) {
          console.error('❌ [DEBUG] Erreur test connectivité SQLite:', err);
          clearTimeout(globalTimeout);
          reject(err);
          return;
        }
        console.log('✅ [DEBUG] Connexion SQLite testée avec succès');
        console.log('🔧 [DEBUG] Continuons avec l\'initialisation des tables...');
        
        // Utiliser une approche séquentielle directe
        this.initializeTablesSequential(globalTimeout, resolve, reject);
      });
    });
  }

  private initializeTablesSequential(timeout: NodeJS.Timeout, resolve: () => void, reject: (error: any) => void): void {
    console.log('🔧 [DEBUG] Début de l\'initialisation séquentielle des tables...');
    
    // Table Users
    console.log('🔧 [DEBUG] Création de la table users...');
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'USER',
        isActive INTEGER DEFAULT 1,
        isDemo INTEGER DEFAULT 0,
        isTemporaryDemo INTEGER DEFAULT 0,
        demoExpiresAt TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ [DEBUG] Erreur création table users:', err);
        clearTimeout(timeout);
        reject(err);
        return;
      }
      console.log('✅ [DEBUG] Table users créée avec succès');
      
      // Table Files
      console.log('🔧 [DEBUG] Création de la table files...');
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
      `, (err) => {
        if (err) {
          console.error('❌ [DEBUG] Erreur création table files:', err);
          clearTimeout(timeout);
          reject(err);
          return;
        }
        console.log('✅ [DEBUG] Table files créée avec succès');
        
        // Table Shares
        console.log('🔧 [DEBUG] Création de la table shares...');
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
        `, (err) => {
          if (err) {
            console.error('❌ [DEBUG] Erreur création table shares:', err);
            clearTimeout(timeout);
            reject(err);
            return;
          }
          console.log('✅ [DEBUG] Table shares créée avec succès');
          
          // Migrations
          console.log('🔧 [DEBUG] Exécution des migrations...');
          this.db.run('ALTER TABLE shares ADD COLUMN title TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('❌ [DEBUG] Erreur migration title:', err);
            } else {
              console.log('✅ [DEBUG] Migration title OK');
            }
            
            this.db.run('ALTER TABLE shares ADD COLUMN description TEXT', (err) => {
              if (err && !err.message.includes('duplicate column name')) {
                console.error('❌ [DEBUG] Erreur migration description:', err);
              } else {
                console.log('✅ [DEBUG] Migration description OK');
              }
              
              // Table Sessions
              console.log('🔧 [DEBUG] Création de la table sessions...');
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
                  console.error('❌ [DEBUG] Erreur création table sessions:', err);
                  clearTimeout(timeout);
                  reject(err);
                  return;
                }
                console.log('✅ [DEBUG] Table sessions créée avec succès');
                console.log('✅ [DEBUG] Toutes les tables créées avec succès');
                
                // Passer au seed des données
                console.log('🔧 [DEBUG] Début du seed des données...');
                this.seedData()
                  .then(() => {
                    console.log('✅ [DEBUG] Seed des données terminé');
                    clearTimeout(timeout);
                    resolve();
                  })
                  .catch((error) => {
                    console.error('❌ [DEBUG] Erreur seed des données:', error);
                    clearTimeout(timeout);
                    reject(error);
                  });
              });
            });
          });
        });
      });
    });
  }
  


  private async seedData(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Ajouter un timeout pour le seed des données
      const seedTimeout = setTimeout(() => {
        console.error('❌ [DEBUG] Timeout lors du seed des données (15 secondes)');
        reject(new Error('Timeout lors du seed des données'));
      }, 15000);
      
      try {
        console.log('🔧 [DEBUG] Début du seed des données utilisateurs...');
        
        // Créer le compte admin principal
        console.log('🔧 [DEBUG] Hachage du mot de passe admin...');
        const adminPassword = await bcrypt.hash('Emynopass2024!', 10);

        const admin: User = {
          id: uuidv4(),
          email: 'polosko@emynopass.dev',
          password: adminPassword,
          name: 'Polosko',
          role: 'ADMIN',
          isActive: true,
          isDemo: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Créer un compte de démonstration
        console.log('🔧 [DEBUG] Hachage du mot de passe démo...');
        const demoPassword = await bcrypt.hash('demo2024', 10);

        const demoUser: User = {
          id: uuidv4(),
          email: 'demo@emynopass.dev',
          password: demoPassword,
          name: 'Utilisateur Démo',
          role: 'USER',
          isActive: true,
          isDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Insérer le compte admin
        console.log('🔧 [DEBUG] Insertion du compte admin...');
        this.db.run(`
          INSERT OR IGNORE INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [admin.id, admin.email, admin.password, admin.name, admin.role, admin.isActive ? 1 : 0, admin.isDemo ? 1 : 0, admin.createdAt, admin.updatedAt], (err) => {
          if (err) {
            console.error('❌ [DEBUG] Erreur insertion admin:', err);
          } else {
            console.log('✅ [DEBUG] Compte admin inséré avec succès');
          }
        });

        // Insérer le compte démo
        console.log('🔧 [DEBUG] Insertion du compte démo...');
        this.db.run(`
          INSERT OR IGNORE INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [demoUser.id, demoUser.email, demoUser.password, demoUser.name, demoUser.role, demoUser.isActive ? 1 : 0, demoUser.isDemo ? 1 : 0, demoUser.createdAt, demoUser.updatedAt], (err) => {
          if (err) {
            console.error('❌ [DEBUG] Erreur insertion démo:', err);
            clearTimeout(seedTimeout);
            reject(err);
          } else {
            console.log('✅ [DEBUG] Compte démo inséré avec succès');
            console.log('✅ [DEBUG] User accounts created successfully');
            console.log('👑 Admin: polosko@emynopass.dev / Emynopass2024!');
            console.log('👤 Demo: demo@emynopass.dev / demo2024');
            console.log('🔧 [DEBUG] Seed des données terminé avec succès');
            clearTimeout(seedTimeout);
            resolve();
          }
        });
      } catch (error) {
        console.error('❌ [DEBUG] Erreur dans seedData:', error);
        clearTimeout(seedTimeout);
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
                isActive: row.isActive === 1,
                isDemo: row.isDemo === 1,
                isTemporaryDemo: row.isTemporaryDemo === 1
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
        'SELECT id, email, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt FROM users ORDER BY createdAt DESC',
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const users = rows.map(row => ({
              ...row,
              isActive: row.isActive === 1,
              isDemo: row.isDemo === 1,
              isTemporaryDemo: row.isTemporaryDemo === 1
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
        INSERT INTO users (id, email, password, name, role, isActive, isDemo, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, user.email, user.password, user.name, user.role, user.isActive ? 1 : 0, user.isDemo ? 1 : 0, now, now], function(err) {
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
                isActive: row.isActive === 1,
                isDemo: row.isDemo === 1,
                isTemporaryDemo: row.isTemporaryDemo === 1
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
                isActive: row.isActive === 1,
                isDemo: row.isDemo === 1,
                isTemporaryDemo: row.isTemporaryDemo === 1
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

  async getShareById(shareId: string): Promise<Share | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM shares WHERE id = ?',
        [shareId],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              ...row,
              isActive: row.isActive === 1
            });
          } else {
            resolve(null);
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

  async deleteSharesByFileId(fileId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM shares WHERE fileId = ?',
        [fileId],
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

  async getOrphanedShares(): Promise<Share[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.* FROM shares s 
         LEFT JOIN files f ON s.fileId = f.id 
         WHERE f.id IS NULL`,
        [],
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

  async deleteOrphanedShares(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM shares WHERE fileId NOT IN (SELECT id FROM files)`,
        [],
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

  // Méthodes pour les comptes démo temporaires
  async createTemporaryDemoUser(): Promise<User> {
    return new Promise(async (resolve, reject) => {
      try {
        const id = uuidv4();
        const email = `demo-${id.substring(0, 8)}@emynopass.dev`;
        const password = await bcrypt.hash('demo2024', 10);
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

        this.db.run(
          `INSERT INTO users (id, email, password, name, role, isActive, isDemo, isTemporaryDemo, demoExpiresAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, email, password, 'Utilisateur Démo Temporaire', 'USER', 1, 1, 1, expiresAt, now, now],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                id,
                email,
                password,
                name: 'Utilisateur Démo Temporaire',
                role: 'USER',
                isActive: true,
                isDemo: true,
                isTemporaryDemo: true,
                demoExpiresAt: expiresAt,
                createdAt: now,
                updatedAt: now
              });
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async getExpiredDemoUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM users WHERE isTemporaryDemo = 1 AND demoExpiresAt < ?`,
        [new Date().toISOString()],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const users = rows.map(row => ({
              ...row,
              isActive: row.isActive === 1,
              isDemo: row.isDemo === 1,
              isTemporaryDemo: row.isTemporaryDemo === 1
            }));
            resolve(users);
          }
        }
      );
    });
  }

  async deleteExpiredDemoUsers(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM users WHERE isTemporaryDemo = 1 AND demoExpiresAt < ?`,
        [new Date().toISOString()],
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

  async getUserStorageUsed(userId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COALESCE(SUM(size), 0) as totalSize FROM files WHERE userId = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.totalSize || 0);
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
