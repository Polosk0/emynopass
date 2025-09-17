import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { createError } from './errorHandler';

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    cb(null, 'uploads/');
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtre des types de fichiers
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mp3/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(createError('Type de fichier non autorisé', 400));
  }
};

export const uploadSingle = multer({
  storage: storage,
  limits: {
    fileSize: 1000 * 1024 * 1024 // 1GB
  },
  fileFilter: fileFilter
}).single('file');

export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux (max 1GB)',
        statusCode: 400
      });
    }
  }
  next(error);
};
