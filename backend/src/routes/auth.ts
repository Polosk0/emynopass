import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fileshare-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Route de connexion
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email et mot de passe requis' });
      return;
    }

    // Trouver l'utilisateur
    const user = await database.findUserByEmail(email);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Identifiants invalides' });
      return;
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Identifiants invalides' });
      return;
    }

    // Créer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Créer la session dans la DB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    await database.createSession(user.id, token, expiresAt);

    // Nettoyer les sessions expirées
    await database.deleteExpiredSessions();

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route de déconnexion
router.post('/logout', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await database.deleteSession(token);
    }

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour vérifier le token
router.get('/verify', authenticateToken, (req: AuthRequest, res): void => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Route pour obtenir le profil utilisateur
router.get('/profile', authenticateToken, (req: AuthRequest, res): void => {
  res.json({
    user: req.user
  });
});

// Route pour créer un compte démo temporaire
router.post('/demo', async (req: Request, res: Response): Promise<void> => {
  try {
    // Nettoyer les comptes démo expirés
    const deletedCount = await database.deleteExpiredDemoUsers();
    if (deletedCount > 0) {
      console.log(`🧹 Nettoyage: ${deletedCount} compte(s) démo expiré(s) supprimé(s)`);
    }

    // Créer un nouveau compte démo temporaire
    const demoUser = await database.createTemporaryDemoUser();
    
    // Créer une session
    const token = jwt.sign(
      { email: demoUser.email, userId: demoUser.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 jours
    await database.createSession(demoUser.id, token, expiresAt);

    console.log(`🎯 Compte démo temporaire créé: ${demoUser.email} (expire dans 30 minutes)`);

    res.status(201).json({
      message: 'Compte démo temporaire créé avec succès',
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        isDemo: true,
        isTemporaryDemo: true,
        demoExpiresAt: demoUser.demoExpiresAt
      },
      token,
      demoExpiresIn: 30 * 60 * 1000, // 30 minutes en millisecondes
      demoExpiresAt: demoUser.demoExpiresAt
    });
  } catch (error) {
    console.error('Erreur création compte démo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;