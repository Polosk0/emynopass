import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
// Utiliser SQLite en développement, PostgreSQL en production
const isDevelopment = process.env.NODE_ENV !== 'production';
const database = isDevelopment 
  ? require('./database-sqlite').default 
  : require('./database').default;
import uploadRoutes from './routes/upload';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import shareRoutes from './routes/share';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Autoriser toutes les origines
  credentials: false // Désactiver credentials pour permettre *
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: '🚀 FileShare API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Route de test base de données
app.get('/api/test-db', async (req, res) => {
  try {
    const userCount = await database.getUserCount();
    res.json({
      message: 'Database connection OK',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route de test utilisateurs
app.get('/api/users', async (req, res) => {
  try {
    const users = await database.getAllUsers();
    // Enlever les mots de passe pour la sécurité
    const safeUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }));
    res.json({
      users: safeUsers,
      count: safeUsers.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route pour les statistiques publiques (page de connexion)
app.get('/api/public/stats', async (req, res) => {
  try {
    const userCount = await database.getUserCount();
    const files = await database.getAllFiles();
    
    // Calculer la taille totale des fichiers
    const totalSize = files.reduce((sum: number, file: any) => sum + file.size, 0);
    
    res.json({
      userCount,
      totalFiles: files.length,
      totalSize,
      formattedSize: formatBytes(totalSize)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch public stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route publique pour les informations de stockage (page de connexion)
app.get('/api/public/storage', async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const logsDir = path.join(process.cwd(), 'logs');
    const dbPath = path.join(process.cwd(), 'data', 'emynopass.db');
    
    // Calculer les tailles des différents composants
    const uploadStats = await getDirectorySize(uploadDir);
    const logsStats = await getDirectorySize(logsDir);
    
    // Taille de la base de données
    let dbSize = 0;
    if (fs.existsSync(dbPath)) {
      const dbStats = fs.statSync(dbPath);
      dbSize = dbStats.size;
    }
    
    // Informations du disque
    const diskInfo = await getDiskInfo();
    
    // Calculer l'espace disponible pour Emynopass
    const emynopassTotal = uploadStats.size + dbSize + logsStats.size;
    const availableForEmynopass = diskInfo.free;
    const emynopassPercentage = diskInfo.total > 0 ? (emynopassTotal / diskInfo.total) * 100 : 0;
    
    res.json({
      disk: {
        total: diskInfo.total,
        free: diskInfo.free,
        used: diskInfo.used,
        totalFormatted: formatBytes(diskInfo.total),
        freeFormatted: formatBytes(diskInfo.free),
        usedFormatted: formatBytes(diskInfo.used)
      },
      emynopass: {
        total: emynopassTotal,
        totalFormatted: formatBytes(emynopassTotal),
        breakdown: {
          files: uploadStats.size,
          filesFormatted: formatBytes(uploadStats.size),
          database: dbSize,
          databaseFormatted: formatBytes(dbSize),
          logs: logsStats.size,
          logsFormatted: formatBytes(logsStats.size)
        },
        fileCount: uploadStats.fileCount,
        percentage: emynopassPercentage
      },
      available: {
        total: availableForEmynopass,
        totalFormatted: formatBytes(availableForEmynopass),
        percentage: diskInfo.total > 0 ? (availableForEmynopass / diskInfo.total) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Erreur info stockage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction pour calculer la taille d'un répertoire
async function getDirectorySize(dirPath: string): Promise<{ size: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;

  try {
    if (!fs.existsSync(dirPath)) {
      return { size: 0, fileCount: 0 };
    }

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const subDirSize = await getDirectorySize(itemPath);
        totalSize += subDirSize.size;
        fileCount += subDirSize.fileCount;
      } else {
        totalSize += stats.size;
        fileCount++;
      }
    }
  } catch (error) {
    console.error(`Erreur calcul taille répertoire ${dirPath}:`, error);
  }

  return { size: totalSize, fileCount };
}

// Fonction pour obtenir les informations du disque (Windows/Linux)
async function getDiskInfo(): Promise<{ total: number; free: number; used: number }> {
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: utiliser wmic
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption /format:csv');
      const lines = stdout.split('\n').filter(line => line.includes('C:'));
      
      if (lines.length > 0) {
        const parts = lines[0].split(',');
        // Format: Node,Caption,FreeSpace,Size
        const free = parseInt(parts[2]) || 0;
        const total = parseInt(parts[3]) || 0;
        const used = total - free;
        
        return { total, free, used };
      }
    } else {
      // Linux/Mac: utiliser df
      const { stdout } = await execAsync('df -B1 /');
      const lines = stdout.split('\n');
      const parts = lines[1].split(/\s+/);
      
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      const free = parseInt(parts[3]) || 0;
      
      return { total, free, used };
    }
  } catch (error) {
    console.error('Erreur récupération info disque:', error);
  }
  
  // Fallback: estimation basée sur l'espace utilisé
  const uploadDir = path.join(process.cwd(), 'uploads');
  const uploadSize = await getDirectorySize(uploadDir);
  
  // Estimation: 500 GB total, 200 GB utilisé par le système
  return {
    total: 500 * 1024 * 1024 * 1024, // 500 GB
    free: 300 * 1024 * 1024 * 1024,   // 300 GB libre
    used: 200 * 1024 * 1024 * 1024    // 200 GB utilisé
  };
}

// Fonction utilitaire pour formater les tailles
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Routes d'upload
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/share', shareRoutes);

// Route pour rediriger les partages publics vers le frontend en développement
app.get('/share/:token', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/share/${req.params.token}`);
});

// Gestion d'erreur globale
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Démarrage serveur
const startServer = async () => {
  try {
    console.log('🔧 [DEBUG] Début du démarrage du serveur...');
    console.log('🔧 [DEBUG] Variables d\'environnement:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - PORT:', process.env.PORT);
    console.log('  - DATABASE_PATH:', process.env.DATABASE_PATH);
    console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? 'Défini' : 'Non défini');
    console.log('  - FRONTEND_URL:', process.env.FRONTEND_URL);
    
    // Initialiser la base de données
    console.log('🔧 [DEBUG] Initialisation de la base de données...');
    await database.init();
    console.log('✅ [DEBUG] Database initialized successfully');

    // Nettoyage automatique des fichiers expirés, partages orphelins et comptes démo (toutes les heures)
    console.log('🔧 [DEBUG] Configuration du nettoyage automatique...');
    setInterval(async () => {
      try {
        console.log('🧹 Nettoyage automatique des fichiers expirés, partages orphelins et comptes démo...');
        const deletedFiles = await database.deleteExpiredFiles();
        const deletedSessions = await database.deleteExpiredSessions();
        const deletedOrphanedShares = await database.deleteOrphanedShares();
        const deletedDemoUsers = await database.deleteExpiredDemoUsers();
        
        if (deletedFiles > 0 || deletedSessions > 0 || deletedOrphanedShares > 0 || deletedDemoUsers > 0) {
          console.log(`✅ Nettoyage terminé: ${deletedFiles} fichiers, ${deletedSessions} sessions, ${deletedOrphanedShares} partages orphelins et ${deletedDemoUsers} comptes démo supprimés`);
        }
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique:', error);
      }
    }, 60 * 60 * 1000); // Toutes les heures

    // Nettoyage initial des partages orphelins et comptes démo au démarrage
    console.log('🔧 [DEBUG] Début du nettoyage initial...');
    try {
      console.log('🧹 Nettoyage initial des partages orphelins et comptes démo...');
      const deletedOrphanedShares = await database.deleteOrphanedShares();
      const deletedDemoUsers = await database.deleteExpiredDemoUsers();
      
      if (deletedOrphanedShares > 0 || deletedDemoUsers > 0) {
        console.log(`✅ Nettoyage initial terminé: ${deletedOrphanedShares} partage(s) orphelin(s) et ${deletedDemoUsers} compte(s) démo supprimé(s)`);
      } else {
        console.log('✅ [DEBUG] Nettoyage initial terminé - aucun élément à supprimer');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors du nettoyage initial:', error);
    }

    console.log('🔧 [DEBUG] Démarrage du serveur Express...');
    app.listen(PORT, () => {
      console.log('🚀 [DEBUG] Emynopass Backend started successfully!');
      console.log(`📍 [DEBUG] Server running on http://localhost:${PORT}`);
      console.log(`🌐 [DEBUG] Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📊 [DEBUG] Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 [DEBUG] Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`📤 [DEBUG] Upload API: http://localhost:${PORT}/api/upload`);
      console.log(`🔗 [DEBUG] Share API: http://localhost:${PORT}/api/share`);
      console.log(`👑 [DEBUG] Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`🗄️  [DEBUG] Database test: http://localhost:${PORT}/api/test-db`);
      console.log(`👥 [DEBUG] Users list: http://localhost:${PORT}/api/users`);
      console.log('');
      console.log('🔐 Comptes disponibles :');
      console.log('   👑 Admin: polosko@emynopass.dev / Emynopass2024!');
      console.log('   👤 Démo: demo@emynopass.dev / demo2024');
      console.log('⏰ Started at:', new Date().toLocaleString());
      console.log('✅ [DEBUG] Serveur démarré avec succès - prêt à recevoir des requêtes');
    });
  } catch (error) {
    console.error('❌ [DEBUG] Failed to start server:', error);
    console.error('❌ [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
};

// Gestion arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 [DEBUG] SIGINT received - Shutting down server...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [DEBUG] SIGTERM received - Shutting down server...');
  await database.close();
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ [DEBUG] Uncaught Exception:', error);
  console.error('❌ [DEBUG] Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [DEBUG] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();