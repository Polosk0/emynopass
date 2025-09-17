import { Request, Response } from 'express';

export const getProfile = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Profil utilisateur',
    data: {
      id: 'user-id',
      email: 'user@example.com',
      username: 'username',
      firstName: 'John',
      lastName: 'Doe'
    }
  });
};

export const updateProfile = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Profil mis à jour avec succès',
    data: req.body
  });
};

export const changePassword = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Mot de passe changé avec succès'
  });
};

export const deleteAccount = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Compte supprimé avec succès'
  });
};
