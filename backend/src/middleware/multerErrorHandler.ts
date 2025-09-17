import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    let message = 'Erreur lors de l\'upload du fichier';
    let statusCode = 400;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        const limitMB = Math.round((error as any).limit / (1024 * 1024));
        message = `Le fichier est trop volumineux. Taille maximale autorisée : ${limitMB} MB. Veuillez réduire la taille de votre fichier ou le compresser.`;
        statusCode = 413; // Payload Too Large
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Trop de fichiers. Maximum autorisé : ${(error as any).limit} fichiers.`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Champ de fichier inattendu. Vérifiez le nom du champ utilisé pour l\'upload.';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Le formulaire contient trop de parties. Réduisez le nombre de champs.';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Le nom d\'un champ est trop long.';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'La valeur d\'un champ est trop longue.';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Le formulaire contient trop de champs.';
        break;
      default:
        message = `Erreur d'upload : ${error.message}`;
    }
    
    res.status(statusCode).json({
      error: message,
      code: error.code,
      details: {
        maxFileSize: '100 MB',
        maxFiles: 10,
        supportedFormats: 'Tous les formats de fichiers sont acceptés'
      }
    });
    return;
  }
  
  // Si ce n'est pas une erreur Multer, passer au middleware suivant
  next(error);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
