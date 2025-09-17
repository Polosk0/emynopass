# Emynopass - Configuration Docker

Ce guide explique comment utiliser Docker pour déployer Emynopass en local et en production.

## Prérequis

- Docker (version 20.10+)
- Docker Compose (version 2.0+)

### Installation sur Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Redémarrez votre session pour que les changements prennent effet
```

### Installation sur Windows
Téléchargez et installez [Docker Desktop](https://www.docker.com/products/docker-desktop)

## Démarrage rapide

### Windows
```cmd
START-EMYNOPASS.bat
```

### Linux/macOS
```bash
chmod +x start-emynopass.sh
./start-emynopass.sh
```

## Commandes Docker

### Construction et démarrage
```bash
# Construire les images
npm run docker:build

# Démarrer les services
npm run docker:up

# Démarrer en mode développement
npm run docker:dev

# Démarrer en mode production (avec nginx)
npm run docker:prod
```

### Gestion des services
```bash
# Arrêter les services
npm run docker:down

# Redémarrer les services
npm run docker:restart

# Voir les logs
npm run docker:logs

# Nettoyer complètement (supprime images et volumes)
npm run docker:clean
```

### Commandes Docker Compose directes
```bash
# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Voir le statut des conteneurs
docker-compose ps

# Arrêter les services
docker-compose down

# Reconstruire et redémarrer
docker-compose up -d --build
```

## Configuration

### Variables d'environnement
Copiez `env.example` vers `.env` et configurez les variables :

```bash
cp env.example .env
```

Variables importantes :
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `DATABASE_PATH` : Chemin vers la base de données
- `REDIS_URL` : URL de connexion Redis
- `FRONTEND_URL` : URL du frontend

### Ports utilisés
- **3000** : Frontend (React)
- **3001** : Backend (Node.js/Express)
- **6379** : Redis
- **80/443** : Nginx (production uniquement)

## Structure des conteneurs

### Backend
- **Image** : Node.js 18 Alpine
- **Port** : 3001
- **Volumes** : 
  - `./uploads` → `/app/uploads`
  - `./logs` → `/app/logs`
  - `./data` → `/app/data`

### Frontend
- **Image** : Nginx Alpine (avec build React)
- **Port** : 3000
- **Build** : Multi-stage build avec Node.js

### Redis
- **Image** : Redis 7 Alpine
- **Port** : 6379
- **Volume** : Données persistantes

### Nginx (Production)
- **Image** : Nginx Alpine
- **Ports** : 80, 443
- **Configuration** : Proxy vers frontend et backend

## Déploiement en production

### 1. Configuration
```bash
# Copier la configuration d'environnement
cp env.example .env

# Modifier les variables pour la production
nano .env
```

### 2. Démarrage
```bash
# Démarrer en mode production
npm run docker:prod

# Ou directement
docker-compose --profile production up -d
```

### 3. Vérification
```bash
# Vérifier le statut
docker-compose ps

# Vérifier les logs
docker-compose logs -f

# Tester l'application
curl http://localhost:3000
curl http://localhost:3001/health
```

## Dépannage

### Problèmes courants

#### Port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Arrêter les services et redémarrer
docker-compose down
docker-compose up -d
```

#### Erreur de permissions
```bash
# Sur Linux, ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
# Redémarrer la session
```

#### Problème de build
```bash
# Nettoyer et reconstruire
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

#### Logs d'erreur
```bash
# Voir les logs détaillés
docker-compose logs backend
docker-compose logs frontend
docker-compose logs redis
```

### Commandes de diagnostic
```bash
# Voir l'utilisation des ressources
docker stats

# Voir les images
docker images

# Voir les volumes
docker volume ls

# Voir les réseaux
docker network ls
```

## Sauvegarde et restauration

### Sauvegarde des données
```bash
# Sauvegarder la base de données
docker cp emynopass-backend:/app/data/emynopass.db ./backup/

# Sauvegarder les uploads
cp -r ./uploads ./backup/

# Sauvegarder les logs
cp -r ./logs ./backup/
```

### Restauration
```bash
# Restaurer la base de données
docker cp ./backup/emynopass.db emynopass-backend:/app/data/

# Restaurer les uploads
cp -r ./backup/uploads ./

# Redémarrer les services
docker-compose restart
```

## Sécurité

### Recommandations de production
1. Changez tous les mots de passe par défaut
2. Utilisez des certificats SSL/TLS
3. Configurez un pare-feu
4. Limitez l'accès aux ports sensibles
5. Surveillez les logs régulièrement

### Variables d'environnement sensibles
- `JWT_SECRET` : Utilisez une clé forte et unique
- `ENCRYPTION_KEY` : Clé de 32 caractères minimum
- `SMTP_PASS` : Mot de passe d'application email

## Support

Pour toute question ou problème :
1. Vérifiez les logs : `docker-compose logs -f`
2. Consultez ce guide de dépannage
3. Vérifiez la configuration Docker
4. Testez les services individuellement

