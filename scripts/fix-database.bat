@echo off
echo 🔧 Correction des problèmes de base de données SQLite...

REM Créer le dossier data s'il n'existe pas
if not exist "data" mkdir data

REM Copier la base de données existante si elle existe dans backend/data
if exist "backend\data\emynopass.db" (
    echo 📋 Copie de la base de données existante...
    copy "backend\data\emynopass.db" "data\emynopass.db"
    echo ✅ Base de données copiée vers data\emynopass.db
) else (
    echo ⚠️  Aucune base de données existante trouvée dans backend\data\
)

echo ✅ Correction terminée !
echo 📁 Base de données disponible dans: %CD%\data\emynopass.db
pause

