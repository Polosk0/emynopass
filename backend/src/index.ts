import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import database from './database';
import uploadRoutes from './routes/upload';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import shareRoutes from './routes/share';

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    const safeUsers = users.map(user => ({
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
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
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
    // Initialiser la base de données
    await database.init();
    console.log('✅ Database initialized');

    // Nettoyage automatique des fichiers expirés (toutes les heures)
    setInterval(async () => {
      try {
        console.log('🧹 Nettoyage automatique des fichiers expirés...');
        const deletedFiles = await database.deleteExpiredFiles();
        const deletedSessions = await database.deleteExpiredSessions();
        
        if (deletedFiles > 0 || deletedSessions > 0) {
          console.log(`✅ Nettoyage terminé: ${deletedFiles} fichiers et ${deletedSessions} sessions supprimés`);
        }
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique:', error);
      }
    }, 60 * 60 * 1000); // Toutes les heures

    app.listen(PORT, () => {
      console.log('🚀 Emynopass Backend started successfully!');
      console.log(`📍 Server running on http://localhost:${PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`📤 Upload API: http://localhost:${PORT}/api/upload`);
      console.log(`🔗 Share API: http://localhost:${PORT}/api/share`);
      console.log(`👑 Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`🗄️  Database test: http://localhost:${PORT}/api/test-db`);
      console.log(`👥 Users list: http://localhost:${PORT}/api/users`);
      console.log('');
      console.log('🔐 Comptes disponibles :');
      console.log('   👑 Admin: polosko@emynopass.dev / Emynopass2024!');
      console.log('   👤 Démo: demo@emynopass.dev / demo2024');
      console.log('⏰ Started at:', new Date().toLocaleString());
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Gestion arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.close();
  process.exit(0);
});

startServer();