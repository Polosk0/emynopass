import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { database } from '../database';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Route pour créer un lien de partage (authentification requise)
router.post('/create', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId, password, maxDownloads, expiresInHours, title, description } = req.body;
    const userId = req.user!.id;

    if (!fileId) {
      res.status(400).json({ error: 'ID du fichier requis' });
      return;
    }

    // Vérifier que le fichier appartient à l'utilisateur ou que l'utilisateur est admin
    const file = await database.getFileById(fileId);
    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
      return;
    }

    if (file.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    // Générer un token unique pour le partage
    const token = uuidv4().replace(/-/g, '').substring(0, 16);

    // Calculer la date d'expiration
    let expiresAt: string | undefined;
    if (expiresInHours && expiresInHours > 0) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + expiresInHours);
      expiresAt = expiry.toISOString();
    }

    // Hasher le mot de passe si fourni
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Créer le partage
    const share = await database.createShare({
      token,
      password: hashedPassword,
      maxDownloads: maxDownloads || undefined,
      expiresAt,
      isActive: true,
      fileId,
      userId,
      title: title || file.originalName,
      description: description || undefined
    });

    const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;

    res.status(201).json({
      message: 'Lien de partage créé avec succès',
      share: {
        id: share.id,
        token: share.token,
        url: shareUrl,
        title: share.title,
        description: share.description,
        maxDownloads: share.maxDownloads,
        downloads: share.downloads,
        expiresAt: share.expiresAt,
        hasPassword: !!share.password,
        createdAt: share.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur création partage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour lister les partages de l'utilisateur
router.get('/my-shares', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const shares = await database.getSharesByUser(userId);

    const sharesWithUrls = shares.map(share => ({
      id: share.id,
      token: share.token,
      url: `${req.protocol}://${req.get('host')}/share/${share.token}`,
      title: share.title,
      description: share.description,
      fileName: (share as any).originalName,
      fileSize: (share as any).size,
      maxDownloads: share.maxDownloads,
      downloads: share.downloads,
      expiresAt: share.expiresAt,
      hasPassword: !!share.password,
      isActive: share.isActive,
      createdAt: share.createdAt,
      isExpired: share.expiresAt ? new Date(share.expiresAt) < new Date() : false
    }));

    res.json({
      shares: sharesWithUrls
    });
  } catch (error) {
    console.error('Erreur récupération partages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir les détails d'un partage (sans authentification)
router.get('/:token', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    
    const share = await database.findShareByToken(token);
    if (!share) {
      res.status(404).json({ error: 'Lien de partage non trouvé ou expiré' });
      return;
    }

    // Vérifier l'expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      res.status(410).json({ error: 'Ce lien de partage a expiré' });
      return;
    }

    // Vérifier la limite de téléchargements
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      res.status(410).json({ error: 'Limite de téléchargements atteinte' });
      return;
    }

    // Récupérer les infos du fichier
    const file = await database.getFileById(share.fileId);
    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
      return;
    }

    res.json({
      token: share.token,
      title: share.title || file.originalName,
      description: share.description,
      fileName: file.originalName,
      fileSize: file.size,
      mimetype: file.mimetype,
      hasPassword: !!share.password,
      downloads: share.downloads,
      maxDownloads: share.maxDownloads,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt
    });
  } catch (error) {
    console.error('Erreur récupération partage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour télécharger un fichier partagé
router.post('/:token/download', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    const share = await database.findShareByToken(token);
    if (!share) {
      res.status(404).json({ error: 'Lien de partage non trouvé' });
      return;
    }

    // Vérifier l'expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      res.status(410).json({ error: 'Ce lien de partage a expiré' });
      return;
    }

    // Vérifier la limite de téléchargements
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      res.status(410).json({ error: 'Limite de téléchargements atteinte' });
      return;
    }

    // Vérifier le mot de passe si nécessaire
    if (share.password) {
      if (!password) {
        res.status(401).json({ error: 'Mot de passe requis' });
        return;
      }
      
      const isValidPassword = await bcrypt.compare(password, share.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Mot de passe incorrect' });
        return;
      }
    }

    // Récupérer le fichier
    const file = await database.getFileById(share.fileId);
    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
      return;
    }

    // Vérifier que le fichier existe sur le disque
    const fs = require('fs');
    if (!fs.existsSync(file.path)) {
      res.status(404).json({ error: 'Fichier non trouvé sur le serveur' });
      return;
    }

    // Incrémenter le compteur de téléchargements
    await database.incrementShareDownload(token);

    // Télécharger le fichier
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Erreur téléchargement partage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour supprimer un partage
router.delete('/:shareId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shareId } = req.params;
    const userId = req.user!.id;

    // Vérifier que le partage appartient à l'utilisateur ou que l'utilisateur est admin
    const shares = await database.getSharesByUser(userId);
    const share = shares.find(s => s.id === shareId);
    
    if (!share && req.user!.role !== 'ADMIN') {
      res.status(404).json({ error: 'Partage non trouvé' });
      return;
    }

    const deleted = await database.deleteShare(shareId);
    if (!deleted) {
      res.status(404).json({ error: 'Partage non trouvé' });
      return;
    }

    res.json({ message: 'Partage supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression partage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour prévisualiser un fichier partagé publiquement (sans authentification)
router.get('/preview/:token', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    // Récupérer les informations du partage
    const share = await database.findShareByToken(token);
    if (!share) {
      res.status(404).json({ error: 'Partage non trouvé' });
      return;
    }

    // Vérifier si le partage est actif et non expiré
    if (!share.isActive || (share.expiresAt && new Date() > new Date(share.expiresAt))) {
      res.status(410).json({ error: 'Partage expiré ou inactif' });
      return;
    }

    // Vérifier le mot de passe si nécessaire
    if (share.password) {
      const providedPassword = req.headers['x-share-password'] as string;
      if (!providedPassword || providedPassword !== share.password) {
        res.status(401).json({ error: 'Mot de passe requis ou incorrect' });
        return;
      }
    }

    // Récupérer les informations du fichier
    const file = await database.getFileById(share.fileId);
    if (!file) {
      res.status(404).json({ error: 'Fichier non trouvé' });
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

    // Définir les headers appropriés pour CORS
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Share-Password');

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

    // Lire le fichier et l'envoyer comme buffer pour une meilleure compatibilité CORS
    const fileBuffer = fs.readFileSync(file.path);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Erreur prévisualisation partage:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la prévisualisation' });
  }
});

export default router;