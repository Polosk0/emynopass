import { Router } from 'express';
import { body, query } from 'express-validator';
import { 
  uploadFile, 
  getFiles, 
  getFileById, 
  deleteFile, 
  getFileStats 
} from '@/controllers/fileController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { uploadSingle, handleMulterError } from '@/middleware/upload';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation pour l'upload
const uploadValidation = [
  body('password')
    .optional()
    .isLength({ min: 4, max: 50 })
    .withMessage('Le mot de passe doit contenir entre 4 et 50 caractères'),
  body('maxDownloads')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Le nombre maximum de téléchargements doit être entre 1 et 1000'),
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 8760 }) // Max 1 an
    .withMessage('L\'expiration doit être entre 1 et 8760 heures'),
  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Le message ne peut pas dépasser 500 caractères'),
];

// Validation pour la liste des fichiers
const listValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La recherche ne peut pas dépasser 100 caractères'),
  query('sortBy')
    .optional()
    .isIn(['name', 'size', 'createdAt', 'downloads'])
    .withMessage('Tri invalide'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordre de tri invalide'),
];

// Routes
router.post(
  '/upload',
  uploadSingle,
  handleMulterError,
  uploadValidation,
  validateRequest,
  uploadFile
);

router.get(
  '/',
  listValidation,
  validateRequest,
  getFiles
);

router.get('/stats', getFileStats);

router.get('/:id', getFileById);

router.delete('/:id', deleteFile);

export default router;
