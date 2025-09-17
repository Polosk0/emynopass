import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur';

  // Log de l'erreur
  logger.error(`Erreur ${statusCode}: ${message}`, err);

  // Erreurs de validation Prisma
  if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Données invalides';
  }

  // Erreurs de contrainte unique Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 409;
    message = 'Conflit de données';
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }

  // Erreurs Multer (upload)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.message.includes('File too large')) {
      message = 'Fichier trop volumineux';
    } else if (err.message.includes('Unexpected field')) {
      message = 'Champ de fichier inattendu';
    } else {
      message = 'Erreur lors de l\'upload';
    }
  }

  // En développement, inclure la stack trace
  const response: any = {
    success: false,
    message,
    statusCode,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
