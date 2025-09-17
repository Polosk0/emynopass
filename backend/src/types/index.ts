// Types personnalisés pour l'application
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  userId: string;
  password?: string;
  maxDownloads?: number;
  expiresAt?: Date;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareLink {
  id: string;
  token: string;
  fileId: string;
  userId: string;
  password?: string;
  maxDownloads?: number;
  expiresAt?: Date;
  downloadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
