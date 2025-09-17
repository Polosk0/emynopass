import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

// Validation simple sans express-validator
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Validation basique des champs requis
  const { body } = req;
  
  // Exemple de validation pour l'upload de fichier
  if (req.path.includes('/upload')) {
    if (!req.file) {
      const error = createError('Aucun fichier fourni', 400);
      next(error);
      return;
    }
  }
  
  next();
};

// Validation des champs de mot de passe
export const validatePassword = (password: string): boolean => {
  return Boolean(password && password.length >= 6);
};

// Validation des champs de profil
export const validateProfile = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (data.firstName && (data.firstName.length < 2 || data.firstName.length > 50)) {
    errors.push('Le prénom doit contenir entre 2 et 50 caractères');
  }
  
  if (data.lastName && (data.lastName.length < 2 || data.lastName.length > 50)) {
    errors.push('Le nom doit contenir entre 2 et 50 caractères');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
