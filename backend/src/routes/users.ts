import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserStats
} from '@/controllers/userController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation pour la mise à jour du profil
const updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le prénom doit contenir entre 1 et 50 caractères'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir entre 1 et 50 caractères'),
  body('avatar')
    .optional()
    .isString()
    .withMessage('Avatar invalide'),
];

// Validation pour le changement de mot de passe
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule et 1 chiffre'),
];

// Routes
router.get('/profile', getProfile);

router.put(
  '/profile',
  updateProfileValidation,
  validateRequest,
  updateProfile
);

router.put(
  '/change-password',
  changePasswordValidation,
  validateRequest,
  changePassword
);

router.get('/stats', getUserStats);

router.delete('/account', deleteAccount);

export default router;
