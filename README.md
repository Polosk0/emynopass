# FileShare - Plateforme de partage de fichiers sécurisée

## Description
Une plateforme de partage de fichiers simple et sécurisée pour un usage entre amis, inspirée de SwissTransfer.

## Fonctionnalités
- Upload de fichiers avec liens de partage temporaires
- Interface moderne et intuitive
- Authentification sécurisée
- Chiffrement des fichiers
- Gestion des expirations
- Notifications par email
- Interface responsive

## Technologies utilisées
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Base de données**: PostgreSQL + Prisma ORM
- **Stockage**: Système de fichiers local (extensible vers AWS S3)
- **Authentification**: JWT + bcrypt
- **Chiffrement**: crypto-js
- **Email**: Nodemailer
- **Conteneurisation**: Docker

## 🚀 Démarrage Ultra-Simple

### 🎯 Scripts Principaux (Double-clic)
| Script | Description | Utilisation |
|--------|-------------|-------------|
| **`START.bat`** | 🚀 Démarrage rapide | Double-clic pour lancer |
| **`START-DEBUG.bat`** | 🐛 Démarrage avec debug | Double-clic pour debug complet |
| **`STOP.bat`** | 🛑 Arrêt des services | Double-clic pour arrêter |
| **`CHECK.bat`** | 🔍 Vérification système | Double-clic pour diagnostiquer |
| **`MONITOR.bat`** | 📊 Monitoring temps réel | Double-clic pour surveiller |
| **`TEST-COMPLET.bat`** | 🧪 Tests complets | Double-clic pour tout tester |

### ⚡ Démarrage en 3 étapes
1. **Double-cliquez sur `START.bat`** ← C'est tout !
2. **Attendez 2-3 minutes** (installation automatique)
3. **L'application s'ouvre** sur http://localhost:3000
4. **Connectez-vous** avec `admin@fileshare.local` / `admin123`

### 🐧 Linux/Mac
```bash
./scripts/linux/start-simple.sh    # Démarrage rapide
./scripts/linux/start-debug.sh     # Avec debug
./scripts/linux/stop.sh            # Arrêt
```

### 📦 Avec npm (multiplateforme)
```bash
npm run setup    # Configuration complète
npm run dev      # Démarrage développement
npm run health   # Vérification santé
```

## Structure du projet
Voir l'arborescence complète dans le dossier du projet.

