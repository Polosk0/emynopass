import { Request } from 'express';
import { User } from '@prisma/client';

// Types d'authentification
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

// Types de fichiers
export interface FileUploadRequest {
  file: Express.Multer.File;
  password?: string;
  maxDownloads?: number;
  expiresIn?: number; // en heures
  message?: string;
}

export interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  isEncrypted: boolean;
  createdAt: Date;
  uploader: {
    id: string;
    username: string;
  };
}

// Types de partage
export interface ShareLinkInfo {
  id: string;
  token: string;
  hasPassword: boolean;
  maxDownloads: number;
  currentDownloads: number;
  expiresAt: Date;
  isActive: boolean;
  message?: string;
  file: {
    id: string;
    originalName: string;
    size: number;
    mimetype: string;
  };
  creator: {
    username: string;
  };
}

export interface CreateShareLinkRequest {
  fileId: string;
  password?: string;
  maxDownloads?: number;
  expiresIn?: number; // en heures
  message?: string;
}

export interface DownloadRequest {
  token: string;
  password?: string;
}

// Types de réponse API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Types d'audit
export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Types de validation
export interface ValidationError {
  field: string;
  message: string;
}

// Types de configuration
export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  uploadDir: string;
  maxFileSize: string;
  allowedExtensions: string[];
  databaseUrl: string;
  frontendUrl: string;
  smtpConfig: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    fromName: string;
  };
}

// Types d'email
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}
