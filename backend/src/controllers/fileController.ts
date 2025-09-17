import { Request, Response } from 'express';

export const uploadFile = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Fichier uploadé avec succès',
    data: req.file
  });
};

export const getFiles = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Liste des fichiers',
    data: []
  });
};

export const getFileById = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Informations du fichier',
    data: { id: req.params.id }
  });
};

export const deleteFile = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Fichier supprimé avec succès'
  });
};

export const downloadFile = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Téléchargement du fichier',
    data: { id: req.params.id }
  });
};
