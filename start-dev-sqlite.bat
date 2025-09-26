@echo off
echo Démarrage de l'application en mode développement avec SQLite...

REM Configurer l'environnement de développement
set NODE_ENV=development
set DATABASE_PATH=./backend/data/emynopass.db

REM Créer le dossier data s'il n'existe pas
if not exist "backend\data" mkdir backend\data

REM Créer le dossier uploads s'il n'existe pas
if not exist "uploads" mkdir uploads

echo Configuration:
echo - Base de données: SQLite (backend/data/emynopass.db)
echo - Mode: Développement
echo - Port Backend: 3001
echo - Port Frontend: 3000
echo.

echo Démarrage des services...
npm run dev
