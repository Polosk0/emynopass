# Guide d'installation

## Prérequis

- **Node.js** 18+ et npm
- **Docker** et Docker Compose
- **Git**
- **PostgreSQL** 15+ (si installation manuelle)

## Installation rapide avec Docker

1. **Cloner le projet**
```bash
git clone <repo-url>
cd hostfichier
```

2. **Configuration**
```bash
cp env.example .env
# Éditer .env avec vos paramètres
```

3. **Démarrage**
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

4. **Accès à l'application**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Base de données: localhost:5432

## Installation manuelle

### 1. Base de données

```bash
# Installer PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Créer la base de données
sudo -u postgres createdb fileshare
sudo -u postgres createuser fileshare_user -P
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fileshare TO fileshare_user;"
```

### 2. Backend

```bash
cd backend
npm install
cp ../env.example .env
# Configurer DATABASE_URL dans .env

# Migrations
npx prisma migrate dev
npx prisma generate
npx prisma db seed

# Démarrage
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Variables d'environnement principales

```env
# Base de données
DATABASE_URL="postgresql://fileshare_user:password@localhost:5432/fileshare"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Serveur
PORT=3001
FRONTEND_URL="http://localhost:3000"

# Stockage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="100MB"

# Email (optionnel)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## Déploiement en production

### Avec Docker

```bash
# Configuration
cp env.example .env
# Configurer .env pour la production

# Déploiement
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manuel

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Servir dist/ avec nginx ou serveur web
```

### Configuration Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Sécurité

### Recommandations production

1. **HTTPS obligatoire**
2. **Changer tous les mots de passe par défaut**
3. **Configurer un firewall**
4. **Sauvegardes automatiques**
5. **Monitoring des logs**

### Configuration SSL

```bash
# Avec Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

## Maintenance

### Sauvegardes

```bash
# Automatique
chmod +x scripts/backup.sh
./scripts/backup.sh

# Cron job (quotidien à 2h)
0 2 * * * /path/to/project/scripts/backup.sh
```

### Logs

```bash
# Voir les logs
docker-compose logs -f

# Logs spécifiques
docker-compose logs backend
docker-compose logs frontend
```

### Mise à jour

```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

## Dépannage

### Problèmes courants

1. **Port déjà utilisé**
```bash
sudo netstat -tulpn | grep :3000
sudo kill -9 <PID>
```

2. **Erreur de base de données**
```bash
docker-compose restart database
docker-compose logs database
```

3. **Erreur de build**
```bash
docker system prune -a
docker-compose build --no-cache
```

4. **Permissions fichiers**
```bash
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/
```

### Support

- Vérifier les logs : `docker-compose logs`
- Issues GitHub : <repo-url>/issues
- Documentation : `/docs`
