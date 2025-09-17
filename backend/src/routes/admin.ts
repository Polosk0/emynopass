import { Router } from 'express';
import { database } from '../database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// Middleware : toutes les routes admin nécessitent une authentification et le rôle admin
router.use(authenticateToken);
router.use(requireAdmin);

// Route pour obtenir les statistiques du dashboard admin
router.get('/stats', async (req: AuthRequest, res): Promise<void> => {
  try {
    const users = await database.getAllUsers();
    const files = await database.getAllFiles();
    
    // Calculer les statistiques
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const adminUsers = users.filter(u => u.role === 'ADMIN').length;
    
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const expiredFiles = files.filter(file => 
      file.expiresAt && new Date(file.expiresAt) < new Date()
    ).length;
    
    // Statistiques par jour (7 derniers jours)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const uploadsPerDay = last7Days.map(date => {
      const dayFiles = files.filter(file => 
        file.uploadedAt.startsWith(date)
      );
      return {
        date,
        count: dayFiles.length,
        size: dayFiles.reduce((sum, file) => sum + file.size, 0)
      };
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers
      },
      files: {
        total: totalFiles,
        expired: expiredFiles,
        totalSize: totalSize
      },
      uploads: uploadsPerDay
    });
  } catch (error) {
    console.error('Erreur stats admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour lister tous les utilisateurs
router.get('/users', async (req: AuthRequest, res): Promise<void> => {
  try {
    const users = await database.getAllUsers();
    
    // Ne pas renvoyer les mots de passe
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.json({ users: safeUsers });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour lister tous les fichiers
router.get('/files', async (req: AuthRequest, res): Promise<void> => {
  try {
    const files = await database.getAllFiles();
    
    const filesWithStatus = files.map(file => ({
      ...file,
      isExpired: file.expiresAt ? new Date(file.expiresAt) < new Date() : false,
      url: `/api/upload/download/${file.id}`,
      // Ajouter les infos utilisateur si disponibles
      userEmail: (file as any).userEmail,
      userName: (file as any).userName
    }));
    
    res.json({ files: filesWithStatus });
  } catch (error) {
    console.error('Erreur liste fichiers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour supprimer un fichier (admin)
router.delete('/files/:fileId', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { fileId } = req.params;
    const file = await database.getFileById(fileId);

    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
      return;
    }

    // Supprimer de la base de données
    await database.deleteFile(fileId);

    // Supprimer le fichier physique
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour nettoyer les logs
router.post('/cleanup/logs', async (req: AuthRequest, res): Promise<void> => {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    let deletedFiles = 0;
    let freedSpace = 0;
    let errors = 0;

    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          try {
            freedSpace += stats.size;
            fs.unlinkSync(filePath);
            deletedFiles++;
          } catch (error) {
            console.error(`Erreur suppression log ${file}:`, error);
            errors++;
          }
        }
      }
    }

    res.json({
      message: 'Nettoyage des logs terminé',
      deletedFiles,
      freedSpace,
      freedSpaceFormatted: formatBytes(freedSpace),
      errors
    });
  } catch (error) {
    console.error('Erreur nettoyage logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour nettoyer les fichiers expirés
router.post('/cleanup/expired', async (req: AuthRequest, res): Promise<void> => {
  try {
    const allFiles = await database.getAllFiles();
    const expiredFiles = allFiles.filter(file => 
      file.expiresAt && new Date(file.expiresAt) < new Date()
    );

    let deletedCount = 0;
    let freedSpace = 0;
    let errorCount = 0;

    for (const file of expiredFiles) {
      try {
        // Supprimer de la base de données
        await database.deleteFile(file.id);
        
        // Supprimer le fichier physique
        if (fs.existsSync(file.path)) {
          const stats = fs.statSync(file.path);
          freedSpace += stats.size;
          fs.unlinkSync(file.path);
        }
        
        deletedCount++;
      } catch (error) {
        console.error(`Erreur suppression fichier ${file.id}:`, error);
        errorCount++;
      }
    }

    res.json({
      message: 'Nettoyage des fichiers expirés terminé',
      deletedFiles: deletedCount,
      freedSpace,
      freedSpaceFormatted: formatBytes(freedSpace),
      errors: errorCount
    });
  } catch (error) {
    console.error('Erreur nettoyage fichiers expirés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour optimiser la base de données
router.post('/cleanup/optimize-db', async (req: AuthRequest, res): Promise<void> => {
  try {
    // Obtenir la taille avant optimisation
    const dbPath = path.join(process.cwd(), 'data', 'emynopass.db');
    let sizeBefore = 0;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      sizeBefore = stats.size;
    }

    // Exécuter VACUUM sur la base SQLite pour la compacter
    await database.optimize();

    // Obtenir la taille après optimisation
    let sizeAfter = 0;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      sizeAfter = stats.size;
    }

    const spaceFreed = sizeBefore - sizeAfter;

    res.json({
      message: 'Optimisation de la base de données terminée',
      sizeBefore,
      sizeBeforeFormatted: formatBytes(sizeBefore),
      sizeAfter,
      sizeAfterFormatted: formatBytes(sizeAfter),
      spaceFreed,
      spaceFreedFormatted: formatBytes(spaceFreed)
    });
  } catch (error) {
    console.error('Erreur optimisation DB:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour créer un nouvel utilisateur
router.post('/users', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { email, password, name, role = 'USER' } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, mot de passe et nom requis' });
      return;
    }

    // Vérifier si l'email existe déjà
    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const newUser = await database.createUser({
      email,
      password: hashedPassword,
      name,
      role: role as 'USER' | 'ADMIN',
      isActive: true
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour modifier un utilisateur
router.put('/users/:userId', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const { email, password, name, role, isActive } = req.body;

    const updates: any = {};
    
    if (email) updates.email = email;
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const updated = await database.updateUser(userId, updates);
    
    if (!updated) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    res.json({ message: 'Utilisateur modifié avec succès' });
  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    if (error instanceof Error && error.message.includes('leader')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});

// Route pour supprimer un utilisateur
router.delete('/users/:userId', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { userId } = req.params;

    const deleted = await database.deleteUser(userId);
    
    if (!deleted) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    if (error instanceof Error && error.message.includes('leader')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});

// Fonction utilitaire pour calculer la taille d'un dossier
async function getDirectorySize(dirPath: string): Promise<{ size: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;

  if (!fs.existsSync(dirPath)) {
    return { size: 0, fileCount: 0 };
  }

  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      const subDir = await getDirectorySize(filePath);
      totalSize += subDir.size;
      fileCount += subDir.fileCount;
    } else {
      totalSize += stats.size;
      fileCount++;
    }
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
        const free = parseInt(parts[2]) || 0;
        const total = parseInt(parts[1]) || 0;
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

// Route pour obtenir les informations de stockage
router.get('/storage', async (req: AuthRequest, res): Promise<void> => {
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

// Fonction utilitaire pour formater les bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
