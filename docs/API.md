# Documentation API

## Base URL
```
http://localhost:3001/api
```

## Authentification

### Inscription
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Connexion
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Déconnexion
```http
POST /auth/logout
Authorization: Bearer <token>
```

## Gestion des fichiers

### Upload d'un fichier
```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <fichier>
password: <mot de passe optionnel>
maxDownloads: <nombre max de téléchargements>
expiresIn: <expiration en heures>
message: <message optionnel>
```

### Liste des fichiers
```http
GET /files
Authorization: Bearer <token>
```

### Informations d'un fichier
```http
GET /files/:id
Authorization: Bearer <token>
```

### Suppression d'un fichier
```http
DELETE /files/:id
Authorization: Bearer <token>
```

## Partage

### Créer un lien de partage
```http
POST /share/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileId": "file-id",
  "password": "optional-password",
  "maxDownloads": 10,
  "expiresIn": 24,
  "message": "Message optionnel"
}
```

### Informations d'un lien
```http
GET /share/:token
```

### Télécharger un fichier
```http
POST /share/download/:token
Content-Type: application/json

{
  "password": "password-if-required"
}
```

### Liste des liens de partage
```http
GET /share/my-links
Authorization: Bearer <token>
```

### Désactiver un lien
```http
DELETE /share/:token
Authorization: Bearer <token>
```

## Utilisateur

### Profil utilisateur
```http
GET /users/profile
Authorization: Bearer <token>
```

### Modifier le profil
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "base64-image"
}
```

### Changer le mot de passe
```http
PUT /users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

## Codes de réponse

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Non trouvé
- `409` - Conflit (ex: email déjà utilisé)
- `413` - Fichier trop volumineux
- `429` - Trop de requêtes
- `500` - Erreur serveur

## Format de réponse

```json
{
  "success": true,
  "message": "Message de succès",
  "data": {
    // Données de réponse
  }
}
```

En cas d'erreur :
```json
{
  "success": false,
  "message": "Message d'erreur",
  "statusCode": 400
}
```
