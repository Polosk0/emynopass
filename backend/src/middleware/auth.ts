import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || 'fileshare-secret-key-2024';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Token d\'accès requis' });
      return;
    }

    // Vérifier le token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Vérifier si la session existe toujours dans la DB
    const session = await database.findSessionByToken(token);
    if (!session) {
      res.status(401).json({ message: 'Session expirée' });
      return;
    }

    // Vérifier si la session n'est pas expirée
    if (new Date(session.expiresAt) < new Date()) {
      await database.deleteSession(token);
      res.status(401).json({ message: 'Session expirée' });
      return;
    }

    // Récupérer l'utilisateur
    const user = await database.findUserByEmail(decoded.email);
    if (!user || !user.isActive) {
      await database.deleteSession(token);
      res.status(401).json({ message: 'Utilisateur introuvable ou inactif' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token invalide' });
    return;
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Accès administrateur requis' });
    return;
  }
  next();
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const session = await database.findSessionByToken(token);
      
      if (session && new Date(session.expiresAt) >= new Date()) {
        const user = await database.findUserByEmail(decoded.email);
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        }
      }
    }
    
    next();
  } catch (error) {
    // Continuer sans authentification en cas d'erreur
    next();
  }
};