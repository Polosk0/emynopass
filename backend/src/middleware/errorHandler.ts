import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Type personnalisé pour les erreurs
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    // Maintenir la stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  return new AppError(message, statusCode);
};

interface ExtendedError extends Error {
   statusCode?: number;
   isOperational?: boolean;
}

export const errorHandler = (
  error: ExtendedError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Erreur interne du serveur' : message,
    statusCode
  });
};
