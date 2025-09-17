import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';
import { createError } from '@/middleware/errorHandler';

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Filtrer les types de fichiers
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(',') || [
    '.pdf', '.doc', '.docx', '.txt', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.mp3', '.wav', '.ogg', '.flac', '.aac',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.xls', '.xlsx', '.ppt', '.pptx',
    '.csv', '.json', '.xml'
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(createError(`Type de fichier non autorisé: ${fileExtension}`, 400));
  }
};

// Configuration de la taille maximale
const getMaxFileSize = (): number => {
  const maxSize = process.env.MAX_FILE_SIZE || '100MB';
  const sizeMatch = maxSize.match(/^(\d+)(MB|GB|KB)$/i);
  
  if (!sizeMatch) {
    return 100 * 1024 * 1024; // 100MB par défaut
  }
  
  const [, size, unit] = sizeMatch;
  const sizeNum = parseInt(size, 10);
  
  switch (unit.toLowerCase()) {
    case 'kb':
      return sizeNum * 1024;
    case 'mb':
      return sizeNum * 1024 * 1024;
    case 'gb':
      return sizeNum * 1024 * 1024 * 1024;
    default:
      return 100 * 1024 * 1024;
  }
};

// Configuration multer
export const uploadConfig = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: getMaxFileSize(),
    files: 5, // Maximum 5 fichiers simultanés
  },
});

// Middleware pour un seul fichier
export const uploadSingle = uploadConfig.single('file');

// Middleware pour plusieurs fichiers
export const uploadMultiple = uploadConfig.array('files', 5);

// Gestion des erreurs multer
export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    let message = 'Erreur lors de l\'upload';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Fichier trop volumineux';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Trop de fichiers';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Champ de fichier inattendu';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Trop de parties dans le formulaire';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Nom de champ trop long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Valeur de champ trop longue';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Trop de champs';
        break;
    }
    
    return next(createError(message, 400));
  }
  
  next(error);
};
