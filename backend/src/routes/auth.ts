import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fileshare-secret-key-2024';

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

export default router;