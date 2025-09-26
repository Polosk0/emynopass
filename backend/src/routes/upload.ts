import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../database';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { handleMulterError, formatFileSize } from '../middleware/multerErrorHandler';

const router = Router();

// Configuration multer optimisée pour gros fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configuration multer dynamique selon le rôle
const createUploadMiddleware = (isAdmin: boolean) => {
  return multer({
    storage,
    limits: {
      fileSize: isAdmin ? 100 * 1024 * 1024 : 10 * 1024 * 1024 // 100MB pour admins, 10MB pour autres
    },
    fileFilter: (req, file, cb) => {
      // Accepter tous les types de fichiers
      cb(null, true);
    }
  });
};

// Middleware d'upload dynamique selon le rôle
const dynamicUpload = (req: AuthRequest, res: Response, next: any) => {
  const isAdmin = req.user?.role === 'ADMIN';
  const uploadMiddleware = createUploadMiddleware(isAdmin);
  uploadMiddleware.array('files', 10)(req, res, next);
};

// Route d'upload multiple (authentification requise)
router.post('/files', authenticateToken, dynamicUpload, handleMulterError, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        error: 'Aucun fichier fourni'
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const userId = req.user!.id;
    const user = req.user!;
    
    // Vérifier les limites selon le type de compte
    const isDemoAccount = user.isDemo;
    const isAdminAccount = user.role === 'ADMIN';
    
    // Les admins n'ont aucune limite
    if (!isAdminAccount) {
      const userStorageUsed = await database.getUserStorageUsed(userId);
      const newFilesSize = files.reduce((total, file) => total + file.size, 0);
      
      // Limites différentes pour compte démo vs normal
      const maxUserStorage = isDemoAccount ? 100 * 1024 * 1024 : 1 * 1024 * 1024 * 1024; // 100 MB vs 1 GB
      const maxFileSize = isDemoAccount ? 10 * 1024 * 1024 : 10 * 1024 * 1024; // 10 MB pour tous
      const maxFileCount = isDemoAccount ? 3 : 10; // 3 fichiers vs 10 fichiers
      
      // Vérifier la limite de stockage
      if (userStorageUsed + newFilesSize > maxUserStorage) {
        const remainingSpace = maxUserStorage - userStorageUsed;
        const limitText = isDemoAccount ? '100 MB' : '1 GB';
        res.status(413).json({
          error: `Limite de stockage atteinte. Vous avez utilisé ${formatFileSize(userStorageUsed)} sur ${limitText}. Espace restant: ${formatFileSize(remainingSpace)}`
        });
        return;
      }
      
      // Vérifier la limite de nombre de fichiers
      if (files.length > maxFileCount) {
        const limitText = isDemoAccount ? '3 fichiers' : '10 fichiers';
        res.status(413).json({
          error: `Limite de fichiers atteinte. Maximum ${limitText} par upload.`
        });
        return;
      }
      
      // Vérifier la taille des fichiers individuels
      const oversizedFiles = files.filter(file => file.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        const limitText = isDemoAccount ? '10 MB' : '10 GB';
        const fileNames = oversizedFiles.map(f => f.originalname).join(', ');
        res.status(413).json({
          error: `Fichier(s) trop volumineux : ${fileNames}. Limite par fichier : ${limitText}`
        });
        return;
      }
    }

    const uploadedFiles = [];

    // Date d'expiration : 7 jours à partir de maintenant
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const file of files) {
      try {
        // Enregistrer le fichier dans la base de données
        const fileRecord = await database.createFile({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          isEncrypted: false,
          expiresAt,
          userId
        });

        uploadedFiles.push({
          id: fileRecord.id,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName,
          size: fileRecord.size,
          mimetype: fileRecord.mimetype,
          uploadedAt: fileRecord.uploadedAt,
          expiresAt: fileRecord.expiresAt,
          url: `/api/upload/download/${fileRecord.id}`
        });
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du fichier:', error);
        // Supprimer le fichier physique en cas d'erreur
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.status(200).json({
      message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de l\'upload'
    });
  }
});

// Route pour lister les fichiers de l'utilisateur connecté
router.get('/files', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const files = await database.getFilesByUser(userId);

    const filesWithUrls = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: file.uploadedAt,
      expiresAt: file.expiresAt,
      url: `/api/upload/download/${file.id}`,
      isExpired: file.expiresAt ? new Date(file.expiresAt) < new Date() : false
    }));

    res.json({
      files: filesWithUrls
    });
  } catch (error) {
    console.error('Erreur récupération fichiers:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// Route pour obtenir les informations de stockage de l'utilisateur
router.get('/storage-info', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = req.user!;
    const isDemoAccount = user.isDemo;
    const isAdminAccount = user.role === 'ADMIN';
    
    const usedStorage = await database.getUserStorageUsed(userId);
    
    if (isAdminAccount) {
      // Les admins n'ont aucune limite
      console.log('Admin account detected, returning unlimited storage info');
      const adminResponse = {
        used: usedStorage,
        usedFormatted: formatFileSize(usedStorage),
        max: -1, // -1 indique aucune limite
        maxFormatted: 'Illimité',
        remaining: -1,
        remainingFormatted: 'Illimité',
        percentage: 0,
        maxFileSize: -1,
        maxFileSizeFormatted: 'Illimité',
        isDemo: false,
        isAdmin: true,
        maxFileCount: -1
      };
      console.log('Admin response:', adminResponse);
      res.json(adminResponse);
    } else {
      // Limites pour utilisateurs normaux et démo
      const maxStorage = isDemoAccount ? 100 * 1024 * 1024 : 1 * 1024 * 1024 * 1024; // 100 MB vs 1 GB
      const maxFileSize = isDemoAccount ? 10 * 1024 * 1024 : 10 * 1024 * 1024; // 10 MB pour tous
      const remainingStorage = maxStorage - usedStorage;
      
      res.json({
        used: usedStorage,
        usedFormatted: formatFileSize(usedStorage),
        max: maxStorage,
        maxFormatted: formatFileSize(maxStorage),
        remaining: remainingStorage,
        remainingFormatted: formatFileSize(remainingStorage),
        percentage: (usedStorage / maxStorage) * 100,
        maxFileSize: maxFileSize,
        maxFileSizeFormatted: formatFileSize(maxFileSize),
        isDemo: isDemoAccount,
        isAdmin: false,
        maxFileCount: isDemoAccount ? 3 : 10
      });
    }
  } catch (error) {
    console.error('Erreur récupération info stockage:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// Route pour télécharger un fichier
router.get('/download/:fileId', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const file = await database.getFileById(fileId);

    if (!file) {
      res.status(404).json({
        error: 'Fichier non trouvé'
      });
      return;
    }

    // Vérifier si le fichier a expiré
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      res.status(410).json({
        error: 'Ce fichier a expiré'
      });
      return;
    }

    // Vérifier les permissions (utilisateur connecté ou fichier public)
    if (req.user && req.user.id !== file.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Accès non autorisé'
      });
      return;
    }

    // Vérifier que le fichier existe sur le disque
    if (!fs.existsSync(file.path)) {
      res.status(404).json({
        error: 'Fichier non trouvé sur le serveur'
      });
      return;
    }

    // Télécharger le fichier
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// Route pour supprimer un fichier
router.delete('/files/:fileId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const file = await database.getFileById(fileId);

    if (!file) {
      res.status(404).json({
        error: 'Fichier non trouvé'
      });
      return;
    }

    // Vérifier les permissions (propriétaire ou admin)
    if (req.user!.id !== file.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Accès non autorisé'
      });
      return;
    }

    // Supprimer les partages liés à ce fichier
    const deletedShares = await database.deleteSharesByFileId(fileId);
    console.log(`🗑️ Supprimé ${deletedShares} partage(s) lié(s) au fichier ${fileId}`);

    // Supprimer le fichier de la base de données
    await database.deleteFile(fileId);

    // Supprimer le fichier physique
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({
      message: 'Fichier supprimé avec succès',
      deletedShares: deletedShares
    });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// Route pour prévisualiser un fichier (authentification requise)
router.get('/preview/:fileId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    // Récupérer les informations du fichier
    const file = await database.getFileById(fileId);
    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
      return;
    }

    // Vérifier que le fichier appartient à l'utilisateur ou que l'utilisateur est admin
    if (file.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    // Vérifier que le fichier existe physiquement
    if (!fs.existsSync(file.path)) {
      res.status(404).json({ error: 'Fichier physique non trouvé' });
      return;
    }

    // Déterminer si le fichier est prévisualisable
    const previewableTypes = [
      'image/', 'text/', 'application/pdf', 'video/', 'audio/',
      'application/json', 'application/xml', 'application/javascript'
    ];
    
    const isPreviewable = previewableTypes.some(type => file.mimetype.startsWith(type));
    
    if (!isPreviewable) {
      res.status(400).json({ 
        error: 'Type de fichier non prévisualisable',
        mimetype: file.mimetype 
      });
      return;
    }

    // Définir les headers appropriés
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Pour les fichiers texte, limiter la taille de prévisualisation
    if (file.mimetype.startsWith('text/') || 
        file.mimetype === 'application/json' || 
        file.mimetype === 'application/xml' ||
        file.mimetype === 'application/javascript') {
      
      const maxPreviewSize = 100 * 1024; // 100KB max pour la prévisualisation texte
      const stats = fs.statSync(file.path);
      
      if (stats.size > maxPreviewSize) {
        // Lire seulement les premiers 100KB
        const buffer = Buffer.alloc(maxPreviewSize);
        const fd = fs.openSync(file.path, 'r');
        fs.readSync(fd, buffer, 0, maxPreviewSize, 0);
        fs.closeSync(fd);
        
        res.setHeader('X-Preview-Truncated', 'true');
        res.send(buffer.toString('utf8') + '\n\n... [Fichier tronqué pour la prévisualisation]');
        return;
      }
    }

    // Envoyer le fichier complet pour les autres types
    res.sendFile(path.resolve(file.path));
  } catch (error) {
    console.error('Erreur prévisualisation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la prévisualisation' });
  }
});

// Route pour obtenir les métadonnées de prévisualisation
router.get('/preview-info/:fileId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    const file = await database.getFileById(fileId);
    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
      return;
    }

    if (file.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    // Déterminer le type de prévisualisation
    let previewType = 'none';
    let canPreview = false;

    if (file.mimetype.startsWith('image/')) {
      previewType = 'image';
      canPreview = true;
    } else if (file.mimetype.startsWith('video/')) {
      previewType = 'video';
      canPreview = true;
    } else if (file.mimetype.startsWith('audio/')) {
      previewType = 'audio';
      canPreview = true;
    } else if (file.mimetype === 'application/pdf') {
      previewType = 'pdf';
      canPreview = true;
    } else if (file.mimetype.startsWith('text/') || 
               file.mimetype === 'application/json' ||
               file.mimetype === 'application/xml' ||
               file.mimetype === 'application/javascript') {
      previewType = 'text';
      canPreview = true;
    }

    res.json({
      fileId: file.id,
      filename: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      previewType,
      canPreview,
      previewUrl: canPreview ? `/api/upload/preview/${fileId}` : null
    });
  } catch (error) {
    console.error('Erreur info prévisualisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;