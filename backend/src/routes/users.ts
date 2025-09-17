import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, validateProfile } from '../middleware/validation';

const router = Router();

// Profil utilisateur
router.get('/profile',
  authenticateToken,
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Profil utilisateur',
      data: {
        id: 'user-id',
        email: 'user@example.com',
        username: 'username',
        firstName: 'John',
        lastName: 'Doe'
      }
    });
  }
);

// Modifier le profil
router.put('/profile',
  authenticateToken,
  validateRequest,
  (req: Request, res: Response) => {
    const { firstName, lastName, avatar } = req.body;
    
    const validation = validateProfile({ firstName, lastName });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: validation.errors,
        statusCode: 400
      });
    }

    return res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { firstName, lastName, avatar }
    });
  }
);

// Changer le mot de passe
router.put('/change-password',
  authenticateToken,
  validateRequest,
  (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis',
        statusCode: 400
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
        statusCode: 400
      });
    }

    return res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  }
);

// Supprimer le compte
router.delete('/account',
  authenticateToken,
  (req: Request, res: Response) => {
    return res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
  }
);

export default router;
