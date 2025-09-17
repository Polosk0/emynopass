import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createError } from '@/middleware/errorHandler';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg
    }));

    const error = createError(
      `Erreurs de validation: ${errorMessages.map(e => e.message).join(', ')}`,
      400
    );
    
    // Ajouter les détails des erreurs
    (error as any).validationErrors = errorMessages;
    
    return next(error);
  }
  
  next();
};
